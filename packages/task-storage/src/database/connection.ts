import { Pool, PoolClient, PoolConfig } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { DatabaseConfig } from '../types';

export class DatabaseConnection {
  private pool: Pool;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      min: config.pool?.min || 5,
      max: config.pool?.max || 20,
      idleTimeoutMillis: config.pool?.idleTimeoutMillis || 600000, // 10 minutes
      connectionTimeoutMillis: config.pool?.connectionTimeoutMillis || 30000, // 30 seconds
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('[TaskStorage] Database pool error:', err);
    });

    // Handle client connection errors
    this.pool.on('connect', (client) => {
      console.log('[TaskStorage] New database client connected');
    });

    this.pool.on('remove', (client) => {
      console.log('[TaskStorage] Database client removed');
    });
  }

  /**
   * Initialize the database schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[TaskStorage] Initializing database schema...');
      
      // Read and execute schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      const client = await this.pool.connect();
      try {
        await client.query(schema);
        console.log('[TaskStorage] Database schema initialized successfully');
        this.isInitialized = true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[TaskStorage] Failed to initialize database schema:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a database client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a query with automatic client management
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries if enabled
      if (duration > 1000) {
        console.warn(`[TaskStorage] Slow query detected (${duration}ms):`, text.substring(0, 100));
      }
      
      return result.rows;
    } catch (error) {
      console.error('[TaskStorage] Query error:', error);
      console.error('[TaskStorage] Query:', text);
      console.error('[TaskStorage] Params:', params);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query and return a single row
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if the database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('[TaskStorage] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close all connections and shut down the pool
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('[TaskStorage] Database connection pool closed');
    } catch (error) {
      console.error('[TaskStorage] Error closing database pool:', error);
      throw error;
    }
  }

  /**
   * Create a database connection from environment variables
   */
  static fromEnvironment(): DatabaseConnection {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
      database: process.env.DB_NAME || process.env.POSTGRES_DATABASE || 'voltagent_tasks',
      user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
      pool: {
        min: parseInt(process.env.DB_POOL_MIN_SIZE || '5'),
        max: parseInt(process.env.DB_POOL_MAX_SIZE || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      },
    };

    return new DatabaseConnection(config);
  }
}

