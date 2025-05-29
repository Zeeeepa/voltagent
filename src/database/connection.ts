/**
 * Database Connection Manager for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { Pool, PoolClient } from 'pg';
import Redis from 'redis';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { defaultConfig, validateConfig, type TaskMasterDatabaseConfig } from './config';

export class DatabaseConnectionManager {
  private pgPool: Pool | null = null;
  private redisClient: Redis.RedisClientType | null = null;
  private elasticsearchClient: ElasticsearchClient | null = null;
  private config: TaskMasterDatabaseConfig;

  constructor(config?: Partial<TaskMasterDatabaseConfig>) {
    this.config = { ...defaultConfig, ...config };
    validateConfig(this.config);
  }

  /**
   * Initialize all database connections
   */
  async initialize(): Promise<void> {
    try {
      await this.initializePostgreSQL();
      await this.initializeRedis();
      await this.initializeElasticsearch();
      console.log('✅ All database connections initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error);
      throw error;
    }
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  private async initializePostgreSQL(): Promise<void> {
    const { database } = this.config;
    
    this.pgPool = new Pool({
      host: database.host,
      port: database.port,
      database: database.database,
      user: database.username,
      password: database.password,
      ssl: database.ssl,
      min: database.pool.min,
      max: database.pool.max,
      acquireTimeoutMillis: database.pool.acquireTimeoutMillis,
      idleTimeoutMillis: database.pool.idleTimeoutMillis,
    });

    // Test connection
    const client = await this.pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ PostgreSQL connection pool initialized');
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const { redis } = this.config;
    
    this.redisClient = Redis.createClient({
      socket: {
        host: redis.host,
        port: redis.port,
      },
      password: redis.password,
      database: redis.db,
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.redisClient.connect();
    console.log('✅ Redis connection initialized');
  }

  /**
   * Initialize Elasticsearch connection
   */
  private async initializeElasticsearch(): Promise<void> {
    const { elasticsearch } = this.config;
    
    this.elasticsearchClient = new ElasticsearchClient({
      node: elasticsearch.node,
      auth: {
        username: elasticsearch.auth.username,
        password: elasticsearch.auth.password,
      },
    });

    // Test connection
    await this.elasticsearchClient.ping();
    console.log('✅ Elasticsearch connection initialized');
  }

  /**
   * Get PostgreSQL pool
   */
  getPostgreSQLPool(): Pool {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized. Call initialize() first.');
    }
    return this.pgPool;
  }

  /**
   * Get PostgreSQL client from pool
   */
  async getPostgreSQLClient(): Promise<PoolClient> {
    const pool = this.getPostgreSQLPool();
    return await pool.connect();
  }

  /**
   * Get Redis client
   */
  getRedisClient(): Redis.RedisClientType {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized. Call initialize() first.');
    }
    return this.redisClient;
  }

  /**
   * Get Elasticsearch client
   */
  getElasticsearchClient(): ElasticsearchClient {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch client not initialized. Call initialize() first.');
    }
    return this.elasticsearchClient;
  }

  /**
   * Execute a database transaction
   */
  async executeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getPostgreSQLClient();
    
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
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    const client = await this.getPostgreSQLClient();
    
    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Check if initial schema migration has been run
      const result = await client.query(
        'SELECT name FROM migrations WHERE name = $1',
        ['001_initial_schema']
      );

      if (result.rows.length === 0) {
        // Read and execute the initial schema migration
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
        
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          ['001_initial_schema']
        );
        await client.query('COMMIT');
        
        console.log('✅ Initial schema migration executed successfully');
      } else {
        console.log('✅ Database schema is up to date');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.pgPool) {
      promises.push(this.pgPool.end());
    }

    if (this.redisClient) {
      promises.push(this.redisClient.quit());
    }

    if (this.elasticsearchClient) {
      promises.push(this.elasticsearchClient.close());
    }

    await Promise.all(promises);
    console.log('✅ All database connections closed');
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<{
    postgresql: boolean;
    redis: boolean;
    elasticsearch: boolean;
  }> {
    const health = {
      postgresql: false,
      redis: false,
      elasticsearch: false,
    };

    try {
      if (this.pgPool) {
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
        health.postgresql = true;
      }
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }

    try {
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    try {
      if (this.elasticsearchClient) {
        await this.elasticsearchClient.ping();
        health.elasticsearch = true;
      }
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
    }

    return health;
  }
}

// Singleton instance
let connectionManager: DatabaseConnectionManager | null = null;

/**
 * Get the singleton database connection manager
 */
export function getDatabaseManager(config?: Partial<TaskMasterDatabaseConfig>): DatabaseConnectionManager {
  if (!connectionManager) {
    connectionManager = new DatabaseConnectionManager(config);
  }
  return connectionManager;
}

