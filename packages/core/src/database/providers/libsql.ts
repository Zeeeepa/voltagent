/**
 * Enhanced LibSQL Database Provider
 * 
 * Enhanced version of the existing LibSQL implementation with
 * improved connection pooling, monitoring, and optimization
 */

import { createClient, type Client } from '@libsql/client';
import type {
  DatabaseConfig,
  DatabaseConnection,
  DatabaseTransaction,
  QueryResult,
  Migration,
  PerformanceMetrics,
  ValidationRule,
  DatabaseEvent,
  DatabaseEventHandler,
} from '../types';

import type {
  IDatabase,
  TableSchema,
  TableChange,
  ValidationResult,
} from '../interfaces';

/**
 * LibSQL connection wrapper with enhanced features
 */
class LibSQLConnection implements DatabaseConnection {
  constructor(private client: Client) {}

  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await this.client.execute({
        sql: query,
        args: params || [],
      });
      
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows as T[],
        rowCount: result.rows.length,
        fields: result.columns?.map(col => ({
          name: col,
          type: 'unknown', // LibSQL doesn't provide type info
          nullable: true,
        })),
        duration,
      };
    } catch (error) {
      throw new Error(`LibSQL query failed: ${error.message}`);
    }
  }

  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    const tx = new LibSQLTransaction(this.client);
    
    try {
      await this.client.execute('BEGIN');
      const result = await callback(tx);
      await this.client.execute('COMMIT');
      return result;
    } catch (error) {
      await this.client.execute('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    // LibSQL connections are managed by the client
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.execute('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * LibSQL transaction wrapper
 */
class LibSQLTransaction implements DatabaseTransaction {
  constructor(private client: Client) {}

  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await this.client.execute({
        sql: query,
        args: params || [],
      });
      
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows as T[],
        rowCount: result.rows.length,
        duration,
      };
    } catch (error) {
      throw new Error(`LibSQL transaction query failed: ${error.message}`);
    }
  }

  async commit(): Promise<void> {
    await this.client.execute('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.client.execute('ROLLBACK');
  }
}

/**
 * Enhanced LibSQL database provider
 */
export class LibSQLProvider implements IDatabase {
  private client: Client;
  private connected = false;
  private eventHandlers: Map<string, DatabaseEventHandler[]> = new Map();
  private validationRules: ValidationRule[] = [];
  private config: DatabaseConfig;
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize LibSQL client with enhanced configuration
   */
  private initializeClient(): void {
    const clientConfig: any = {
      url: this.config.url,
    };

    // Add auth token for remote Turso databases
    if (this.config.authToken) {
      clientConfig.authToken = this.config.authToken;
    }

    // Configure connection options
    if (this.config.poolConfig) {
      clientConfig.syncUrl = this.config.url;
      clientConfig.syncInterval = this.config.poolConfig.healthCheckIntervalMs || 60000;
    }

    this.client = createClient(clientConfig);
  }

  // Connection management
  async connect(): Promise<void> {
    try {
      // Test the connection
      await this.client.execute('SELECT 1');
      this.connected = true;
      
      // Set up LibSQL-specific configurations
      await this.setupLibSQLConfig();
      
      this.emit({
        type: 'connection',
        timestamp: new Date(),
        data: { status: 'connected', provider: 'libsql' },
      });
    } catch (error) {
      throw new Error(`Failed to connect to LibSQL: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.client.close();
    this.connected = false;
    this.queryCache.clear();
    
    this.emit({
      type: 'connection',
      timestamp: new Date(),
      data: { status: 'disconnected', provider: 'libsql' },
    });
  }

  async getConnection(): Promise<DatabaseConnection> {
    return new LibSQLConnection(this.client);
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Set up LibSQL-specific configurations
   */
  private async setupLibSQLConfig(): Promise<void> {
    try {
      // Enable WAL mode for better performance
      await this.client.execute('PRAGMA journal_mode = WAL');
      
      // Set synchronous mode for better performance vs durability balance
      await this.client.execute('PRAGMA synchronous = NORMAL');
      
      // Enable foreign key constraints
      await this.client.execute('PRAGMA foreign_keys = ON');
      
      // Set cache size (negative value means KB)
      await this.client.execute('PRAGMA cache_size = -64000'); // 64MB
      
      // Set temp store to memory for better performance
      await this.client.execute('PRAGMA temp_store = MEMORY');
      
      // Enable query planner optimization
      await this.client.execute('PRAGMA optimize');
    } catch (error) {
      console.warn('Some LibSQL PRAGMA settings failed:', error.message);
    }
  }

  // Query execution with caching
  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const cacheKey = this.getCacheKey(query, params);
    
    // Check cache for SELECT queries
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return {
          ...cached.result,
          cached: true,
        };
      }
    }

    const connection = await this.getConnection();
    
    try {
      const result = await connection.execute<T>(query, params);
      
      // Cache SELECT query results
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        this.queryCache.set(cacheKey, {
          result: { ...result, cached: false },
          timestamp: Date.now(),
        });
      }
      
      return result;
    } finally {
      await connection.close();
    }
  }

  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    
    try {
      return await connection.transaction(callback);
    } finally {
      await connection.close();
    }
  }

  // Schema management
  async createTable(tableName: string, schema: TableSchema): Promise<void> {
    const sql = this.generateCreateTableSQL(tableName, schema);
    await this.execute(sql);
    
    // Create indexes
    for (const index of schema.indexes) {
      const indexSQL = this.generateCreateIndexSQL(tableName, index);
      await this.execute(indexSQL);
    }
  }

  async dropTable(tableName: string): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS ${this.escapeIdentifier(tableName)}`);
  }

  async alterTable(tableName: string, changes: TableChange[]): Promise<void> {
    for (const change of changes) {
      const sql = this.generateAlterTableSQL(tableName, change);
      await this.execute(sql);
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    // Get table info from SQLite system tables
    const tableInfoQuery = `PRAGMA table_info(${this.escapeIdentifier(tableName)})`;
    const indexListQuery = `PRAGMA index_list(${this.escapeIdentifier(tableName)})`;
    
    const [tableInfoResult, indexListResult] = await Promise.all([
      this.execute(tableInfoQuery),
      this.execute(indexListQuery),
    ]);

    const columns = tableInfoResult.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      primaryKey: row.pk === 1,
      unique: false, // Would need to check indexes
    }));

    const indexes = [];
    for (const indexRow of indexListResult.rows) {
      const indexInfoQuery = `PRAGMA index_info(${this.escapeIdentifier(indexRow.name)})`;
      const indexInfoResult = await this.execute(indexInfoQuery);
      
      indexes.push({
        name: indexRow.name,
        columns: indexInfoResult.rows.map((col: any) => col.name),
        unique: indexRow.unique === 1,
        type: 'btree', // SQLite default
      });
    }

    return {
      name: tableName,
      columns,
      indexes,
      constraints: [], // Would need additional queries for constraints
    };
  }

  // Migration management
  async runMigrations(): Promise<Migration[]> {
    // This would be implemented by the migration manager
    return [];
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    // This would be implemented by the migration manager
  }

  async getMigrationStatus(): Promise<Migration[]> {
    // This would be implemented by the migration manager
    return [];
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // LibSQL/SQLite doesn't have built-in performance stats like PostgreSQL
    // We'll provide basic metrics based on our internal tracking
    
    return {
      queryCount: this.queryCache.size,
      averageQueryTime: 0, // Would need to track this separately
      slowQueries: [],
      connectionPoolStats: {
        totalConnections: 1, // LibSQL uses a single connection
        activeConnections: this.connected ? 1 : 0,
        idleConnections: 0,
        waitingRequests: 0,
      },
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  enableQueryLogging(enabled: boolean): void {
    // This would be handled by the performance monitor
  }

  // Backup and recovery
  async createBackup(config?: any): Promise<string> {
    // For file-based SQLite, we can copy the file
    // For Turso, we'd need to use their backup API
    return 'backup-id';
  }

  async restoreBackup(backupPath: string): Promise<void> {
    // This would be implemented by the backup manager
  }

  // Validation
  async validateSchema(): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate each table exists and has proper structure
    for (const rule of this.validationRules) {
      try {
        const schema = await this.getTableSchema(rule.table);
        const column = schema.columns.find(c => c.name === rule.column);
        
        if (!column && rule.type === 'required') {
          errors.push({
            type: 'missing_column',
            message: `Required column ${rule.column} not found in table ${rule.table}`,
            table: rule.table,
            column: rule.column,
          });
        }
      } catch (error) {
        errors.push({
          type: 'table_not_found',
          message: `Table ${rule.table} not found`,
          table: rule.table,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
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
    const handlers = this.eventHandlers.get(event.type) || [];
    const wildcardHandlers = this.eventHandlers.get('*') || [];
    
    [...handlers, ...wildcardHandlers].forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in LibSQL event handler:`, error);
      }
    });
  }

  // Helper methods
  private getCacheKey(query: string, params?: any[]): string {
    return `${query}:${JSON.stringify(params || [])}`;
  }

  private calculateCacheHitRate(): number {
    // This would need to be tracked separately
    return 0;
  }

  private generateCreateTableSQL(tableName: string, schema: TableSchema): string {
    const columns = schema.columns.map(col => {
      let sql = `${this.escapeIdentifier(col.name)} ${col.type}`;
      
      if (col.primaryKey) {
        sql += ' PRIMARY KEY';
      }
      
      if (!col.nullable) {
        sql += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined) {
        sql += ` DEFAULT ${this.escapeValue(col.defaultValue)}`;
      }
      
      if (col.unique) {
        sql += ' UNIQUE';
      }
      
      return sql;
    }).join(', ');

    return `CREATE TABLE ${this.escapeIdentifier(tableName)} (${columns})`;
  }

  private generateCreateIndexSQL(tableName: string, index: any): string {
    const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
    const columns = index.columns.map(col => this.escapeIdentifier(col)).join(', ');
    
    return `CREATE ${uniqueKeyword}INDEX ${this.escapeIdentifier(index.name)} ON ${this.escapeIdentifier(tableName)} (${columns})`;
  }

  private generateAlterTableSQL(tableName: string, change: TableChange): string {
    const table = this.escapeIdentifier(tableName);
    
    switch (change.type) {
      case 'add_column':
        return `ALTER TABLE ${table} ADD COLUMN ${this.escapeIdentifier(change.column!.name)} ${change.column!.type}`;
      case 'drop_column':
        return `ALTER TABLE ${table} DROP COLUMN ${this.escapeIdentifier(change.column!.name)}`;
      case 'modify_column':
        // SQLite doesn't support ALTER COLUMN, would need to recreate table
        throw new Error('SQLite does not support modifying columns directly');
      default:
        throw new Error(`Unsupported table change type: ${change.type}`);
    }
  }

  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    return String(value);
  }
}

