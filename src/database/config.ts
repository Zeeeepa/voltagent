/**
 * Database Configuration for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface ElasticsearchConfig {
  node: string;
  auth: {
    username: string;
    password: string;
  };
}

export interface TaskMasterDatabaseConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  elasticsearch: ElasticsearchConfig;
}

/**
 * Default configuration with environment variable fallbacks
 */
export const defaultConfig: TaskMasterDatabaseConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'taskmaster',
    username: process.env.DB_USER || 'taskmaster',
    password: process.env.DB_PASSWORD || 'secure_password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'),
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USER || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
    },
  },
};

/**
 * Validate database configuration
 */
export function validateConfig(config: TaskMasterDatabaseConfig): void {
  const { database, redis, elasticsearch } = config;

  // Validate database config
  if (!database.host) throw new Error('Database host is required');
  if (!database.database) throw new Error('Database name is required');
  if (!database.username) throw new Error('Database username is required');
  if (!database.password) throw new Error('Database password is required');

  // Validate Redis config
  if (!redis.host) throw new Error('Redis host is required');

  // Validate Elasticsearch config
  if (!elasticsearch.node) throw new Error('Elasticsearch node URL is required');
  if (!elasticsearch.auth.username) throw new Error('Elasticsearch username is required');
  if (!elasticsearch.auth.password) throw new Error('Elasticsearch password is required');
}

