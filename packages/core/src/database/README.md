# Consolidated Database Architecture

This module provides a comprehensive, unified database architecture that consolidates all database-related functionality across multiple providers and use cases.

## Features

### 🗄️ **Multi-Provider Support**
- **PostgreSQL**: Full-featured PostgreSQL support with advanced features
- **LibSQL/Turso**: Enhanced SQLite-compatible database with edge capabilities
- **Cloudflare D1**: Edge database with Workers integration
- **SQLite**: Local SQLite support via LibSQL

### 🔗 **Advanced Connection Management**
- Connection pooling with health checks
- Automatic connection recovery
- Load balancing and failover
- Connection metrics and monitoring

### 🚀 **Migration System**
- Version-controlled schema migrations
- Automatic rollback capabilities
- Migration validation and checksums
- Backup before migration

### 📊 **Performance Monitoring**
- Query performance tracking
- Slow query detection
- Connection pool statistics
- Performance optimization suggestions

### 🔒 **Security Framework**
- Role-based access control (RBAC)
- Data encryption/decryption
- Audit logging
- SQL injection prevention
- Row-level security

### 🛠️ **Query Optimization**
- Automatic query optimization
- Index management
- Query analysis and suggestions
- Performance profiling

### 💾 **Backup & Recovery**
- Automated backup scheduling
- Multiple backup destinations
- Point-in-time recovery
- Backup encryption

### 🌐 **Cloudflare Integration**
- D1 edge database support
- Workers integration
- R2 backup storage
- Edge caching

## Quick Start

### Basic Usage

```typescript
import { DatabaseManager } from '@voltagent/core/database';

// Initialize database with PostgreSQL
const db = new DatabaseManager({
  provider: 'postgresql',
  url: 'postgresql://user:password@localhost:5432/mydb',
  poolConfig: {
    minConnections: 2,
    maxConnections: 10,
    healthCheckIntervalMs: 60000,
  },
  migrationConfig: {
    migrationsPath: './migrations',
    autoMigrate: true,
  },
  monitoringConfig: {
    enabled: true,
    queryLogging: true,
    performanceMetrics: true,
  },
});

// Connect to database
await db.connect();

// Execute queries
const users = await db.execute('SELECT * FROM users WHERE active = ?', [true]);

// Use transactions
await db.transaction(async (tx) => {
  await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);
  await tx.execute('INSERT INTO profiles (user_id, bio) VALUES (?, ?)', [1, 'Software Engineer']);
});
```

### LibSQL/Turso Usage

```typescript
const db = new DatabaseManager({
  provider: 'libsql',
  url: 'libsql://your-database.turso.io',
  authToken: 'your-auth-token',
  poolConfig: {
    minConnections: 1,
    maxConnections: 5,
  },
});
```

### Cloudflare D1 Usage

```typescript
const db = new DatabaseManager({
  provider: 'cloudflare-d1',
  url: 'your-d1-database-id',
  cloudflareConfig: {
    accountId: 'your-account-id',
    apiToken: 'your-api-token',
    enableEdgeCache: true,
  },
});
```

## Advanced Features

### Schema Management

```typescript
// Create table with schema validation
await db.createTable('users', {
  name: 'users',
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'name', type: 'VARCHAR(255)', nullable: false },
    { name: 'email', type: 'VARCHAR(255)', unique: true },
    { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_users_email', columns: ['email'], unique: true },
  ],
  constraints: [],
});
```

### Migration Management

```typescript
// Run pending migrations
const appliedMigrations = await db.runMigrations();

// Generate new migration
const migration = await db.migrationManager.generateMigration('add_user_profiles', [
  {
    type: 'create_table',
    table: 'profiles',
    schema: {
      name: 'profiles',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true },
        { name: 'user_id', type: 'INTEGER', nullable: false },
        { name: 'bio', type: 'TEXT' },
      ],
      indexes: [],
      constraints: [],
    },
  },
]);
```

### Performance Monitoring

```typescript
// Get performance metrics
const metrics = await db.getPerformanceMetrics();
console.log('Average query time:', metrics.averageQueryTime);
console.log('Slow queries:', metrics.slowQueries);

// Get connection pool stats
const stats = await db.getStats();
console.log('Active connections:', stats.connectionPool.activeConnections);
```

### Security Configuration

```typescript
const db = new DatabaseManager({
  provider: 'postgresql',
  url: 'postgresql://localhost:5432/mydb',
  securityConfig: {
    enableRowLevelSecurity: true,
    encryptionKey: 'your-encryption-key',
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
});
```

### Middleware Usage

```typescript
import { 
  createLoggingTransformer,
  createSanitizationTransformer,
  createDangerousQueryInterceptor 
} from '@voltagent/core/database';

// Add middleware
db.middleware.addTransformer(createLoggingTransformer(true));
db.middleware.addTransformer(createSanitizationTransformer());
db.middleware.addInterceptor(createDangerousQueryInterceptor());
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DatabaseManager                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │   LibSQL    │  │Cloudflare D1│         │
│  │  Provider   │  │  Provider   │  │  Provider   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Connection  │  │ Migration   │  │Performance  │         │
│  │    Pool     │  │  Manager    │  │  Monitor    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Security   │  │   Backup    │  │    Query    │         │
│  │  Manager    │  │  Manager    │  │ Optimizer   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Schema    │  │ Middleware  │  │ Cloudflare  │         │
│  │ Validator   │  │  Manager    │  │Integration  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Options

### DatabaseConfig

```typescript
interface DatabaseConfig {
  provider: 'postgresql' | 'libsql' | 'cloudflare-d1' | 'sqlite';
  url: string;
  authToken?: string;
  poolConfig?: ConnectionPoolConfig;
  migrationConfig?: MigrationConfig;
  monitoringConfig?: MonitoringConfig;
  securityConfig?: SecurityConfig;
  cloudflareConfig?: CloudflareConfig;
}
```

### Connection Pool Configuration

```typescript
interface ConnectionPoolConfig {
  minConnections: number;        // Minimum connections to maintain
  maxConnections: number;        // Maximum connections allowed
  acquireTimeoutMs: number;      // Timeout for acquiring connection
  idleTimeoutMs: number;         // Timeout for idle connections
  healthCheckIntervalMs: number; // Health check frequency
  retryAttempts: number;         // Connection retry attempts
  retryDelayMs: number;          // Delay between retries
}
```

## Best Practices

### 1. Connection Management
- Use connection pooling for production environments
- Set appropriate pool sizes based on your workload
- Enable health checks for automatic recovery

### 2. Security
- Always enable audit logging in production
- Use encryption for sensitive data
- Implement proper access controls

### 3. Performance
- Enable query monitoring to identify bottlenecks
- Use indexes appropriately
- Monitor slow queries and optimize them

### 4. Migrations
- Always backup before running migrations
- Test migrations in staging environment first
- Use descriptive migration names

### 5. Error Handling
- Implement proper error handling for database operations
- Use transactions for multi-step operations
- Monitor connection health

## Integration with VoltAgent

This database architecture integrates seamlessly with the existing VoltAgent memory system:

```typescript
import { Agent, VoltAgent } from '@voltagent/core';
import { DatabaseManager } from '@voltagent/core/database';

// Create database instance
const database = new DatabaseManager({
  provider: 'postgresql',
  url: process.env.DATABASE_URL,
});

// Use with VoltAgent memory system
const agent = new Agent({
  name: 'DatabaseAgent',
  description: 'Agent with database capabilities',
  // ... other config
});

// The database can be used alongside existing LibSQL memory storage
// or as a replacement for more advanced use cases
```

## Migration from Existing LibSQL

The new architecture is backward compatible with the existing LibSQL implementation:

```typescript
// Old way
import { LibSQLStorage } from '@voltagent/core';

// New way - enhanced with additional features
import { DatabaseManager } from '@voltagent/core/database';

const db = new DatabaseManager({
  provider: 'libsql',
  url: 'file:./memory.db',
  // Additional features now available
  monitoringConfig: { enabled: true },
  securityConfig: { auditLogging: true },
});
```

## Contributing

When adding new database providers or features:

1. Implement the `IDatabase` interface
2. Add comprehensive tests
3. Update documentation
4. Follow the existing patterns for consistency

## License

This module is part of the VoltAgent framework and follows the same license terms.

