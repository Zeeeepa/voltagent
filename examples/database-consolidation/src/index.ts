/**
 * Database Architecture Consolidation Example
 * 
 * This example demonstrates the comprehensive database architecture
 * that consolidates PostgreSQL, LibSQL, and Cloudflare D1 providers
 * with advanced features like connection pooling, monitoring, security,
 * and migration management.
 */

import { DatabaseManager } from '../../../packages/core/src/database';
import type { DatabaseConfig } from '../../../packages/core/src/database/types';

async function demonstratePostgreSQL() {
  console.log('\n🐘 PostgreSQL Provider Demo');
  console.log('============================');

  const config: DatabaseConfig = {
    provider: 'postgresql',
    url: process.env.POSTGRES_URL || 'postgresql://localhost:5432/voltagent',
    poolConfig: {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000,
      healthCheckIntervalMs: 60000,
      retryAttempts: 3,
      retryDelayMs: 1000,
    },
    migrationConfig: {
      migrationsPath: './migrations',
      tableName: 'schema_migrations',
      autoMigrate: true,
      backupBeforeMigration: true,
    },
    monitoringConfig: {
      enabled: true,
      queryLogging: true,
      performanceMetrics: true,
      slowQueryThresholdMs: 1000,
      metricsRetentionDays: 7,
    },
    securityConfig: {
      enableRowLevelSecurity: true,
      auditLogging: true,
      accessControl: {
        enableRBAC: true,
        defaultRole: 'user',
        roles: {
          admin: ['*'],
          user: ['select', 'insert', 'update'],
          readonly: ['select'],
        },
      },
    },
  };

  const db = new DatabaseManager(config);

  try {
    await db.connect();
    console.log('✅ Connected to PostgreSQL');

    // Create a sample table
    await db.createTable('users', {
      name: 'users',
      columns: [
        { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false },
        { name: 'name', type: 'VARCHAR(255)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', unique: true, nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP', nullable: false },
      ],
      indexes: [
        { name: 'idx_users_email', columns: ['email'], unique: true, type: 'btree' },
      ],
      constraints: [],
    });
    console.log('✅ Created users table');

    // Insert sample data
    await db.execute(
      'INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
      ['John Doe', 'john@example.com']
    );
    console.log('✅ Inserted sample data');

    // Query data
    const users = await db.execute('SELECT * FROM users WHERE email = $1', ['john@example.com']);
    console.log('✅ Queried users:', users.rows);

    // Get performance metrics
    const metrics = await db.getPerformanceMetrics();
    console.log('📊 Performance metrics:', {
      queryCount: metrics.queryCount,
      averageQueryTime: metrics.averageQueryTime,
      connectionPool: metrics.connectionPoolStats,
    });

    await db.disconnect();
    console.log('✅ Disconnected from PostgreSQL');
  } catch (error) {
    console.error('❌ PostgreSQL demo failed:', error.message);
  }
}

async function demonstrateLibSQL() {
  console.log('\n🗄️ LibSQL Provider Demo');
  console.log('========================');

  const config: DatabaseConfig = {
    provider: 'libsql',
    url: process.env.LIBSQL_URL || 'file:./demo.db',
    authToken: process.env.LIBSQL_AUTH_TOKEN,
    poolConfig: {
      minConnections: 1,
      maxConnections: 5,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000,
      healthCheckIntervalMs: 60000,
      retryAttempts: 3,
      retryDelayMs: 1000,
    },
    monitoringConfig: {
      enabled: true,
      queryLogging: true,
      performanceMetrics: true,
      slowQueryThresholdMs: 500,
      metricsRetentionDays: 7,
    },
  };

  const db = new DatabaseManager(config);

  try {
    await db.connect();
    console.log('✅ Connected to LibSQL');

    // Create a sample table
    await db.createTable('products', {
      name: 'products',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
        { name: 'name', type: 'TEXT', nullable: false },
        { name: 'price', type: 'REAL', nullable: false },
        { name: 'category', type: 'TEXT', nullable: true },
      ],
      indexes: [
        { name: 'idx_products_category', columns: ['category'], unique: false, type: 'btree' },
      ],
      constraints: [],
    });
    console.log('✅ Created products table');

    // Use transaction
    await db.transaction(async (tx) => {
      await tx.execute(
        'INSERT INTO products (name, price, category) VALUES (?, ?, ?)',
        ['Laptop', 999.99, 'Electronics']
      );
      await tx.execute(
        'INSERT INTO products (name, price, category) VALUES (?, ?, ?)',
        ['Book', 29.99, 'Education']
      );
    });
    console.log('✅ Inserted products in transaction');

    // Query with caching
    const products = await db.execute('SELECT * FROM products WHERE category = ?', ['Electronics']);
    console.log('✅ Queried products:', products.rows);

    // Second query should hit cache
    const cachedProducts = await db.execute('SELECT * FROM products WHERE category = ?', ['Electronics']);
    console.log('✅ Cached query result:', { cached: cachedProducts.cached });

    await db.disconnect();
    console.log('✅ Disconnected from LibSQL');
  } catch (error) {
    console.error('❌ LibSQL demo failed:', error.message);
  }
}

async function demonstrateCloudflareD1() {
  console.log('\n☁️ Cloudflare D1 Provider Demo');
  console.log('==============================');

  const config: DatabaseConfig = {
    provider: 'cloudflare-d1',
    url: process.env.CLOUDFLARE_DATABASE_ID || 'mock-d1-database',
    cloudflareConfig: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      enableEdgeCache: true,
    },
    monitoringConfig: {
      enabled: true,
      queryLogging: true,
      performanceMetrics: true,
      slowQueryThresholdMs: 200,
      metricsRetentionDays: 7,
    },
  };

  const db = new DatabaseManager(config);

  try {
    await db.connect();
    console.log('✅ Connected to Cloudflare D1');

    // Create a sample table
    await db.createTable('sessions', {
      name: 'sessions',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true, nullable: false },
        { name: 'user_id', type: 'TEXT', nullable: false },
        { name: 'data', type: 'TEXT', nullable: true },
        { name: 'expires_at', type: 'INTEGER', nullable: false },
      ],
      indexes: [
        { name: 'idx_sessions_user', columns: ['user_id'], unique: false, type: 'btree' },
        { name: 'idx_sessions_expires', columns: ['expires_at'], unique: false, type: 'btree' },
      ],
      constraints: [],
    });
    console.log('✅ Created sessions table');

    // Insert session data
    const sessionId = `session_${Date.now()}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    await db.execute(
      'INSERT INTO sessions (id, user_id, data, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, 'user123', JSON.stringify({ theme: 'dark', lang: 'en' }), expiresAt]
    );
    console.log('✅ Inserted session data');

    // Query with edge caching
    const session = await db.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    console.log('✅ Queried session:', session.rows[0]);

    await db.disconnect();
    console.log('✅ Disconnected from Cloudflare D1');
  } catch (error) {
    console.error('❌ Cloudflare D1 demo failed:', error.message);
  }
}

async function demonstrateAdvancedFeatures() {
  console.log('\n🚀 Advanced Features Demo');
  console.log('=========================');

  const db = new DatabaseManager({
    provider: 'libsql',
    url: 'file:./advanced-demo.db',
    monitoringConfig: {
      enabled: true,
      queryLogging: true,
      performanceMetrics: true,
      slowQueryThresholdMs: 100,
      metricsRetentionDays: 7,
    },
    securityConfig: {
      auditLogging: true,
      encryptionKey: process.env.ENCRYPTION_KEY || 'demo-key-32-characters-long!!!',
      accessControl: {
        enableRBAC: false, // Simplified for demo
        defaultRole: 'user',
        roles: {},
      },
    },
  });

  try {
    await db.connect();

    // Demonstrate middleware
    console.log('🔧 Setting up middleware...');
    const { 
      createLoggingTransformer,
      createSanitizationTransformer,
      createDangerousQueryInterceptor 
    } = await import('../../../packages/core/src/database');

    db.middleware.addTransformer(createLoggingTransformer(false)); // Disable for demo
    db.middleware.addTransformer(createSanitizationTransformer());
    db.middleware.addInterceptor(createDangerousQueryInterceptor());

    // Demonstrate schema validation
    console.log('✅ Schema validation enabled');
    const validationResult = await db.validateSchema();
    console.log('📋 Schema validation result:', validationResult);

    // Demonstrate backup (mock)
    console.log('💾 Creating backup...');
    const backupId = await db.createBackup({
      enabled: true,
      schedule: '0 2 * * *', // Daily at 2 AM
      retentionDays: 30,
      compression: true,
      encryption: true,
      destination: {
        type: 'local',
        path: './backups',
      },
    });
    console.log('✅ Backup created:', backupId);

    // Demonstrate health check
    const isHealthy = await db.healthCheck();
    console.log('🏥 Database health check:', isHealthy ? '✅ Healthy' : '❌ Unhealthy');

    // Get comprehensive stats
    const stats = await db.getStats();
    console.log('📊 Database statistics:', {
      provider: stats.provider,
      connected: stats.connected,
      performance: {
        queryCount: stats.performance.queryCount,
        averageQueryTime: stats.performance.averageQueryTime,
      },
      connectionPool: stats.connectionPool,
    });

    await db.disconnect();
    console.log('✅ Advanced features demo completed');
  } catch (error) {
    console.error('❌ Advanced features demo failed:', error.message);
  }
}

async function main() {
  console.log('🎯 Database Architecture Consolidation Demo');
  console.log('===========================================');
  console.log('This demo showcases the unified database architecture');
  console.log('that consolidates PostgreSQL, LibSQL, and Cloudflare D1');
  console.log('with advanced features like connection pooling, monitoring,');
  console.log('security, and migration management.\n');

  // Run all demonstrations
  await demonstrateLibSQL();
  await demonstrateCloudflareD1();
  await demonstrateAdvancedFeatures();
  
  // Only run PostgreSQL if connection string is provided
  if (process.env.POSTGRES_URL) {
    await demonstratePostgreSQL();
  } else {
    console.log('\n🐘 PostgreSQL demo skipped (no POSTGRES_URL provided)');
  }

  console.log('\n🎉 All demonstrations completed!');
  console.log('\nKey achievements:');
  console.log('✅ Unified interface across all database providers');
  console.log('✅ Zero code duplication in database operations');
  console.log('✅ Standardized connection pooling and health checks');
  console.log('✅ Comprehensive monitoring and performance optimization');
  console.log('✅ Integrated security framework with encryption');
  console.log('✅ Automated backup and recovery system');
  console.log('✅ Schema validation and migration management');
  console.log('✅ Cloudflare integration for edge deployment');
}

// Run the demo
main().catch(console.error);

