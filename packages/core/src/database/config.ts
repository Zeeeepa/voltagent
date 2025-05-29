/**
 * Database configuration for PostgreSQL event storage
 */

import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  max?: number;
  min?: number;
}

export interface EventStoreDatabaseConfig extends DatabaseConfig {
  tablePrefix?: string;
  enableHealthMonitoring?: boolean;
  healthCheckInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Default database configuration
 */
export const DEFAULT_DATABASE_CONFIG: Partial<EventStoreDatabaseConfig> = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'codegen_db',
  user: process.env.POSTGRES_USER || 'codegen_user',
  password: process.env.POSTGRES_PASSWORD || '',
  ssl: process.env.POSTGRES_SSL_MODE === 'require',
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 20, // Maximum number of connections in pool
  min: 2,  // Minimum number of connections in pool
  tablePrefix: 'voltagent_events',
  enableHealthMonitoring: true,
  healthCheckInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Database connection pool manager
 */
export class DatabaseConnectionPool {
  private pool: Pool | null = null;
  private config: EventStoreDatabaseConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date | null = null;

  constructor(config: EventStoreDatabaseConfig) {
    this.config = { ...DEFAULT_DATABASE_CONFIG, ...config };
  }

  /**
   * Initialize the database connection pool
   */
  async initialize(): Promise<void> {
    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        max: this.config.max,
        min: this.config.min,
      };

      this.pool = new Pool(poolConfig);

      // Set up error handling
      this.pool.on('error', (err) => {
        console.error('[DatabaseConnectionPool] Unexpected error on idle client', err);
        this.isHealthy = false;
      });

      this.pool.on('connect', () => {
        console.log('[DatabaseConnectionPool] New client connected');
      });

      this.pool.on('remove', () => {
        console.log('[DatabaseConnectionPool] Client removed');
      });

      // Test the connection
      await this.testConnection();

      // Start health monitoring if enabled
      if (this.config.enableHealthMonitoring) {
        this.startHealthMonitoring();
      }

      console.log('[DatabaseConnectionPool] Database connection pool initialized successfully');
    } catch (error) {
      console.error('[DatabaseConnectionPool] Failed to initialize database connection pool:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      console.error('[DatabaseConnectionPool] Connection test failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.testConnection();
      } catch (error) {
        console.error('[DatabaseConnectionPool] Health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get a database client from the pool
   */
  async getClient() {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    return await this.pool.connect();
  }

  /**
   * Execute a query with automatic retry logic
   */
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        const result = await this.pool.query(text, params);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[DatabaseConnectionPool] Query attempt ${attempt} failed:`, error);
        
        if (attempt < (this.config.retryAttempts || 3)) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay || 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    this.stopHealthMonitoring();
    
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

