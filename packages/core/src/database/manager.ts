/**
 * Consolidated Database Manager
 * 
 * Central manager that coordinates all database operations across providers
 */

import type {
  DatabaseConfig,
  DatabaseProvider,
  DatabaseConnection,
  DatabaseTransaction,
  QueryResult,
  Migration,
  PerformanceMetrics,
  BackupConfig,
  ValidationRule,
  DatabaseEvent,
  DatabaseEventHandler,
} from './types';

import type {
  IDatabase,
  IConnectionPool,
  IMigrationManager,
  IPerformanceMonitor,
  ISecurityManager,
  IBackupManager,
  ISchemaValidator,
  IQueryOptimizer,
  TableSchema,
  TableChange,
  ValidationResult,
} from './interfaces';

import { PostgreSQLProvider } from './providers/postgresql';
import { LibSQLProvider } from './providers/libsql';
import { CloudflareD1Provider } from './providers/cloudflare-d1';
import { ConnectionPoolManager } from './connection/pool-manager';
import { MigrationManager } from './migration/manager';
import { PerformanceMonitor } from './monitoring/performance';
import { SecurityManager } from './security/manager';
import { BackupManager } from './backup/manager';
import { SchemaValidator } from './validation/schema';
import { QueryOptimizer } from './optimization/query';
import { DatabaseMiddleware } from './middleware/manager';

/**
 * Main database manager that provides a unified interface across all providers
 */
export class DatabaseManager implements IDatabase {
  private provider: IDatabase;
  private connectionPool: IConnectionPool;
  private migrationManager: IMigrationManager;
  private performanceMonitor: IPerformanceMonitor;
  private securityManager: ISecurityManager;
  private backupManager: IBackupManager;
  private schemaValidator: ISchemaValidator;
  private queryOptimizer: IQueryOptimizer;
  private middleware: DatabaseMiddleware;
  private eventHandlers: Map<string, DatabaseEventHandler[]> = new Map();
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializeProvider();
    this.initializeManagers();
  }

  /**
   * Initialize the appropriate database provider based on configuration
   */
  private initializeProvider(): void {
    switch (this.config.provider) {
      case 'postgresql':
        this.provider = new PostgreSQLProvider(this.config);
        break;
      case 'libsql':
        this.provider = new LibSQLProvider(this.config);
        break;
      case 'cloudflare-d1':
        this.provider = new CloudflareD1Provider(this.config);
        break;
      case 'sqlite':
        // Use LibSQL provider for SQLite compatibility
        this.provider = new LibSQLProvider({
          ...this.config,
          url: this.config.url.startsWith('file:') ? this.config.url : `file:${this.config.url}`,
        });
        break;
      default:
        throw new Error(`Unsupported database provider: ${this.config.provider}`);
    }
  }

  /**
   * Initialize all management components
   */
  private initializeManagers(): void {
    this.connectionPool = new ConnectionPoolManager(this.provider, this.config.poolConfig);
    this.migrationManager = new MigrationManager(this.provider, this.config.migrationConfig);
    this.performanceMonitor = new PerformanceMonitor(this.config.monitoringConfig);
    this.securityManager = new SecurityManager(this.config.securityConfig);
    this.backupManager = new BackupManager(this.provider, this.config);
    this.schemaValidator = new SchemaValidator(this.provider);
    this.queryOptimizer = new QueryOptimizer(this.provider);
    this.middleware = new DatabaseMiddleware();

    // Set up event forwarding from provider
    this.provider.on('*', (event) => this.emit(event));
  }

  // Connection management
  async connect(): Promise<void> {
    await this.provider.connect();
    await this.connectionPool.healthCheck();
    
    if (this.config.migrationConfig?.autoMigrate) {
      await this.runMigrations();
    }

    this.emit({
      type: 'connection',
      timestamp: new Date(),
      data: { status: 'connected', provider: this.config.provider },
    });
  }

  async disconnect(): Promise<void> {
    await this.connectionPool.drain();
    await this.provider.disconnect();
    
    this.emit({
      type: 'connection',
      timestamp: new Date(),
      data: { status: 'disconnected', provider: this.config.provider },
    });
  }

  async getConnection(): Promise<DatabaseConnection> {
    return await this.connectionPool.acquire();
  }

  isConnected(): boolean {
    return this.provider.isConnected();
  }

  // Query execution with middleware and monitoring
  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const tracker = this.performanceMonitor.startQuery(query, params);
    
    try {
      // Apply middleware transformations
      const { query: transformedQuery, params: transformedParams } = 
        await this.middleware.transformQuery(query, params);

      // Security validation
      await this.securityManager.validateAccess('execute', 'query', 'system');

      // Execute query with optimization
      const optimizedQuery = await this.queryOptimizer.optimizeQuery(transformedQuery);
      const result = await this.provider.execute<T>(optimizedQuery.optimizedQuery, transformedParams);

      // Record performance metrics
      tracker.addMetadata('rowCount', result.rowCount);
      tracker.addMetadata('cached', result.cached);
      tracker.end();

      this.emit({
        type: 'query',
        timestamp: new Date(),
        data: { query: transformedQuery, duration: result.duration, rowCount: result.rowCount },
      });

      return result;
    } catch (error) {
      tracker.end();
      
      this.emit({
        type: 'error',
        timestamp: new Date(),
        data: { query, error: error.message, params },
      });
      
      throw error;
    }
  }

  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return await this.provider.transaction(callback);
  }

  // Schema management
  async createTable(tableName: string, schema: TableSchema): Promise<void> {
    await this.schemaValidator.validateTable(tableName, schema);
    await this.provider.createTable(tableName, schema);
    
    this.emit({
      type: 'migration',
      timestamp: new Date(),
      data: { action: 'create_table', table: tableName },
    });
  }

  async dropTable(tableName: string): Promise<void> {
    await this.provider.dropTable(tableName);
    
    this.emit({
      type: 'migration',
      timestamp: new Date(),
      data: { action: 'drop_table', table: tableName },
    });
  }

  async alterTable(tableName: string, changes: TableChange[]): Promise<void> {
    await this.provider.alterTable(tableName, changes);
    
    this.emit({
      type: 'migration',
      timestamp: new Date(),
      data: { action: 'alter_table', table: tableName, changes },
    });
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    return await this.provider.getTableSchema(tableName);
  }

  // Migration management
  async runMigrations(): Promise<Migration[]> {
    const migrations = await this.migrationManager.loadMigrations();
    const appliedMigrations: Migration[] = [];

    for (const migration of migrations) {
      if (this.config.migrationConfig?.backupBeforeMigration) {
        await this.createBackup({ 
          enabled: true,
          schedule: '',
          retentionDays: 7,
          compression: true,
          encryption: false,
          destination: { type: 'local', path: `./backups/pre-migration-${migration.id}` }
        });
      }

      await this.migrationManager.applyMigration(migration);
      appliedMigrations.push(migration);

      this.emit({
        type: 'migration',
        timestamp: new Date(),
        data: { action: 'apply', migration: migration.id },
      });
    }

    return appliedMigrations;
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    const migrations = await this.migrationManager.getMigrationHistory();
    const migration = migrations.find(m => m.id === migrationId);
    
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    await this.migrationManager.rollbackMigration(migration);
    
    this.emit({
      type: 'migration',
      timestamp: new Date(),
      data: { action: 'rollback', migration: migrationId },
    });
  }

  async getMigrationStatus(): Promise<Migration[]> {
    return await this.migrationManager.getMigrationHistory();
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics = await this.performanceMonitor.getMetrics();
    const poolStats = await this.connectionPool.getStats();
    
    return {
      ...metrics,
      connectionPoolStats: poolStats,
    };
  }

  enableQueryLogging(enabled: boolean): void {
    this.performanceMonitor.recordMetrics({ queryCount: enabled ? 1 : 0 });
  }

  // Backup and recovery
  async createBackup(config?: Partial<BackupConfig>): Promise<string> {
    const result = await this.backupManager.createBackup(config);
    
    this.emit({
      type: 'backup',
      timestamp: new Date(),
      data: { action: 'create', backupId: result.id, size: result.size },
    });
    
    return result.id;
  }

  async restoreBackup(backupPath: string): Promise<void> {
    await this.backupManager.restoreBackup(backupPath);
    
    this.emit({
      type: 'backup',
      timestamp: new Date(),
      data: { action: 'restore', backupPath },
    });
  }

  // Validation
  async validateSchema(): Promise<ValidationResult> {
    return await this.provider.validateSchema();
  }

  addValidationRule(rule: ValidationRule): void {
    this.provider.addValidationRule(rule);
  }

  // Event handling
  on(event: string, handler: DatabaseEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: DatabaseEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: DatabaseEvent): void {
    // Emit to specific event handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in database event handler for ${event.type}:`, error);
        }
      });
    }

    // Emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in database wildcard event handler:`, error);
        }
      });
    }
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.connectionPool.healthCheck();
      return result.healthy;
    } catch (error) {
      return false;
    }
  }

  async getStats(): Promise<any> {
    return {
      provider: this.config.provider,
      connected: this.isConnected(),
      performance: await this.getPerformanceMetrics(),
      connectionPool: await this.connectionPool.getStats(),
    };
  }

  // Configuration management
  updateConfig(newConfig: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Reinitialize components that depend on config
    this.initializeManagers();
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}

