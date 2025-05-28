/**
 * Database Connection Pool Manager
 * 
 * Advanced connection pooling with health checks, monitoring,
 * and automatic recovery
 */

import type {
  DatabaseConnection,
  ConnectionPoolConfig,
  DatabaseConfig,
} from '../types';

import type {
  IConnectionPool,
  IDatabase,
  ConnectionPoolStats,
  HealthCheckResult,
} from '../interfaces';

interface PooledConnection {
  connection: DatabaseConnection;
  createdAt: Date;
  lastUsed: Date;
  inUse: boolean;
  healthy: boolean;
  useCount: number;
}

/**
 * Connection pool manager with advanced features
 */
export class ConnectionPoolManager implements IConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private waitingQueue: Array<{
    resolve: (connection: DatabaseConnection) => void;
    reject: (error: Error) => void;
    timestamp: Date;
  }> = [];
  
  private healthCheckInterval?: NodeJS.Timeout;
  private config: ConnectionPoolConfig;
  private provider: IDatabase;
  private stats = {
    totalAcquired: 0,
    totalReleased: 0,
    totalDestroyed: 0,
    totalCreated: 0,
    totalHealthChecks: 0,
    totalHealthCheckFailures: 0,
  };

  constructor(provider: IDatabase, config?: Partial<ConnectionPoolConfig>) {
    this.provider = provider;
    this.config = {
      minConnections: config?.minConnections || 2,
      maxConnections: config?.maxConnections || 10,
      acquireTimeoutMs: config?.acquireTimeoutMs || 30000,
      idleTimeoutMs: config?.idleTimeoutMs || 300000, // 5 minutes
      healthCheckIntervalMs: config?.healthCheckIntervalMs || 60000, // 1 minute
      retryAttempts: config?.retryAttempts || 3,
      retryDelayMs: config?.retryDelayMs || 1000,
    };

    this.startHealthChecks();
    this.preWarmPool();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<DatabaseConnection> {
    this.stats.totalAcquired++;

    // Try to get an available connection
    const availableConnection = this.getAvailableConnection();
    if (availableConnection) {
      this.markConnectionInUse(availableConnection);
      return availableConnection.connection;
    }

    // If we can create more connections, do so
    if (this.connections.size < this.config.maxConnections) {
      try {
        const newConnection = await this.createConnection();
        this.markConnectionInUse(newConnection);
        return newConnection.connection;
      } catch (error) {
        console.error('Failed to create new connection:', error);
      }
    }

    // Wait for a connection to become available
    return this.waitForConnection();
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: DatabaseConnection): Promise<void> {
    this.stats.totalReleased++;

    const pooledConnection = this.findPooledConnection(connection);
    if (!pooledConnection) {
      console.warn('Attempted to release unknown connection');
      return;
    }

    pooledConnection.inUse = false;
    pooledConnection.lastUsed = new Date();

    // Process waiting queue
    this.processWaitingQueue();

    // Check if connection should be destroyed due to age or use count
    if (this.shouldDestroyConnection(pooledConnection)) {
      await this.destroy(connection);
    }
  }

  /**
   * Destroy a connection
   */
  async destroy(connection: DatabaseConnection): Promise<void> {
    this.stats.totalDestroyed++;

    const pooledConnection = this.findPooledConnection(connection);
    if (pooledConnection) {
      const connectionId = this.getConnectionId(pooledConnection);
      this.connections.delete(connectionId);
    }

    try {
      await connection.close();
    } catch (error) {
      console.error('Error closing connection:', error);
    }

    // Ensure minimum connections
    this.ensureMinimumConnections();
  }

  /**
   * Get pool statistics
   */
  async getStats(): Promise<ConnectionPoolStats> {
    const totalConnections = this.connections.size;
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.inUse).length;
    const idleConnections = totalConnections - activeConnections;
    const waitingRequests = this.waitingQueue.length;

    const totalWaitTime = this.waitingQueue.reduce((sum, req) => {
      return sum + (Date.now() - req.timestamp.getTime());
    }, 0);
    const averageWaitTime = waitingRequests > 0 ? totalWaitTime / waitingRequests : 0;

    return {
      totalConnections,
      activeConnections,
      idleConnections,
      waitingRequests,
      averageWaitTime,
      ...this.stats,
    };
  }

  /**
   * Perform health check on all connections
   */
  async healthCheck(): Promise<HealthCheckResult> {
    this.stats.totalHealthChecks++;
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Check each connection
      const healthChecks = Array.from(this.connections.values()).map(async (pooledConnection) => {
        try {
          const isHealthy = await pooledConnection.connection.isHealthy();
          pooledConnection.healthy = isHealthy;
          
          if (!isHealthy) {
            errors.push(`Connection ${this.getConnectionId(pooledConnection)} is unhealthy`);
            // Destroy unhealthy connections
            await this.destroy(pooledConnection.connection);
          }
        } catch (error) {
          errors.push(`Health check failed for connection: ${error.message}`);
          pooledConnection.healthy = false;
          await this.destroy(pooledConnection.connection);
        }
      });

      await Promise.all(healthChecks);

      // Ensure minimum connections after cleanup
      await this.ensureMinimumConnections();

      const latency = Date.now() - startTime;
      const healthy = errors.length === 0;

      if (!healthy) {
        this.stats.totalHealthCheckFailures++;
      }

      return {
        healthy,
        latency,
        errors,
        timestamp: new Date(),
      };
    } catch (error) {
      this.stats.totalHealthCheckFailures++;
      return {
        healthy: false,
        latency: Date.now() - startTime,
        errors: [`Health check failed: ${error.message}`],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Drain the pool (close all connections)
   */
  async drain(): Promise<void> {
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Reject all waiting requests
    this.waitingQueue.forEach(req => {
      req.reject(new Error('Connection pool is draining'));
    });
    this.waitingQueue = [];

    // Close all connections
    const closePromises = Array.from(this.connections.values()).map(async (pooledConnection) => {
      try {
        await pooledConnection.connection.close();
      } catch (error) {
        console.error('Error closing connection during drain:', error);
      }
    });

    await Promise.all(closePromises);
    this.connections.clear();
  }

  // Private methods

  private getAvailableConnection(): PooledConnection | null {
    for (const pooledConnection of this.connections.values()) {
      if (!pooledConnection.inUse && pooledConnection.healthy) {
        return pooledConnection;
      }
    }
    return null;
  }

  private async createConnection(): Promise<PooledConnection> {
    this.stats.totalCreated++;

    const connection = await this.provider.getConnection();
    const pooledConnection: PooledConnection = {
      connection,
      createdAt: new Date(),
      lastUsed: new Date(),
      inUse: false,
      healthy: true,
      useCount: 0,
    };

    const connectionId = this.generateConnectionId();
    this.connections.set(connectionId, pooledConnection);

    return pooledConnection;
  }

  private markConnectionInUse(pooledConnection: PooledConnection): void {
    pooledConnection.inUse = true;
    pooledConnection.lastUsed = new Date();
    pooledConnection.useCount++;
  }

  private async waitForConnection(): Promise<DatabaseConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(req => req.resolve === resolve);
        if (index > -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMs}ms`));
      }, this.config.acquireTimeoutMs);

      this.waitingQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: new Date(),
      });
    });
  }

  private processWaitingQueue(): void {
    while (this.waitingQueue.length > 0) {
      const availableConnection = this.getAvailableConnection();
      if (!availableConnection) {
        break;
      }

      const request = this.waitingQueue.shift()!;
      this.markConnectionInUse(availableConnection);
      request.resolve(availableConnection.connection);
    }
  }

  private findPooledConnection(connection: DatabaseConnection): PooledConnection | null {
    for (const pooledConnection of this.connections.values()) {
      if (pooledConnection.connection === connection) {
        return pooledConnection;
      }
    }
    return null;
  }

  private shouldDestroyConnection(pooledConnection: PooledConnection): boolean {
    const now = Date.now();
    const age = now - pooledConnection.createdAt.getTime();
    const idleTime = now - pooledConnection.lastUsed.getTime();

    // Destroy if idle too long
    if (idleTime > this.config.idleTimeoutMs) {
      return true;
    }

    // Destroy if used too many times (connection refresh)
    if (pooledConnection.useCount > 1000) {
      return true;
    }

    // Destroy if too old (24 hours)
    if (age > 24 * 60 * 60 * 1000) {
      return true;
    }

    return false;
  }

  private async ensureMinimumConnections(): Promise<void> {
    const currentCount = this.connections.size;
    const needed = this.config.minConnections - currentCount;

    if (needed > 0) {
      const createPromises = Array.from({ length: needed }, () => this.createConnection());
      await Promise.all(createPromises);
    }
  }

  private async preWarmPool(): Promise<void> {
    try {
      await this.ensureMinimumConnections();
    } catch (error) {
      console.error('Failed to pre-warm connection pool:', error);
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.config.healthCheckIntervalMs);
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getConnectionId(pooledConnection: PooledConnection): string {
    for (const [id, conn] of this.connections.entries()) {
      if (conn === pooledConnection) {
        return id;
      }
    }
    return 'unknown';
  }
}

