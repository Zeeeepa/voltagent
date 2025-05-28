/**
 * Consolidated Database Architecture
 * 
 * This module consolidates all database-related functionality including:
 * - PostgreSQL schema design and connection pooling
 * - Migration system implementation
 * - Database performance monitoring
 * - Connection pool health checks
 * - Schema validation framework
 * - Database backup and recovery
 * - Query optimization engine
 * - Performance monitoring integration
 * - Database middleware layer
 * - Cloudflare D1 integration
 * - Database security framework
 */

export * from './interfaces';
export * from './providers';
export * from './types';

// Core components
export { DatabaseManager } from './manager';
export { ConnectionPoolManager } from './connection/pool-manager';
export { MigrationManager } from './migration/manager';
export { PerformanceMonitor } from './monitoring/performance';
export { SecurityManager } from './security/manager';
export { BackupManager } from './backup/manager';
export { SchemaValidator } from './validation/schema';
export { QueryOptimizer } from './optimization/query';
export { DatabaseMiddleware } from './middleware/manager';

// Cloudflare integration
export * from './cloudflare';

// Middleware helpers
export {
  createLoggingTransformer,
  createSanitizationTransformer,
  createTimeoutTransformer,
  createDangerousQueryInterceptor,
  createRateLimitInterceptor,
} from './middleware/manager';
