/**
 * Cloudflare D1 Database Provider
 * 
 * Implementation for Cloudflare D1 edge database with
 * Workers integration and edge caching
 */

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
 * Cloudflare D1 connection wrapper
 */
class CloudflareD1Connection implements DatabaseConnection {
  constructor(
    private db: any, // D1Database from Cloudflare Workers
    private cache?: Cache
  ) {}

  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      // Check cache for SELECT queries
      if (this.cache && query.trim().toUpperCase().startsWith('SELECT')) {
        const cacheKey = this.getCacheKey(query, params);
        const cached = await this.cache.match(cacheKey);
        
        if (cached) {
          const result = await cached.json();
          return {
            ...result,
            cached: true,
            duration: Date.now() - startTime,
          };
        }
      }

      // Execute query on D1
      const result = await this.db.prepare(query).bind(...(params || [])).all();
      const duration = Date.now() - startTime;
      
      const queryResult: QueryResult<T> = {
        rows: result.results as T[],
        rowCount: result.results?.length || 0,
        duration,
        cached: false,
      };

      // Cache SELECT query results
      if (this.cache && query.trim().toUpperCase().startsWith('SELECT')) {
        const cacheKey = this.getCacheKey(query, params);
        const response = new Response(JSON.stringify(queryResult), {
          headers: {
            'Cache-Control': 'max-age=300', // 5 minutes
            'Content-Type': 'application/json',
          },
        });
        await this.cache.put(cacheKey, response);
      }
      
      return queryResult;
    } catch (error) {
      throw new Error(`Cloudflare D1 query failed: ${error.message}`);
    }
  }

  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    // D1 doesn't support explicit transactions yet, so we'll simulate it
    const tx = new CloudflareD1Transaction(this.db);
    
    try {
      return await callback(tx);
    } catch (error) {
      // In a real transaction, we would rollback here
      throw error;
    }
  }

  async close(): Promise<void> {
    // D1 connections are managed by Cloudflare Workers runtime
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.db.prepare('SELECT 1').first();
      return true;
    } catch {
      return false;
    }
  }

  private getCacheKey(query: string, params?: any[]): string {
    const key = `d1-query:${query}:${JSON.stringify(params || [])}`;
    return new Request(`https://cache.example.com/${btoa(key)}`);
  }
}

/**
 * Cloudflare D1 transaction wrapper
 */
class CloudflareD1Transaction implements DatabaseTransaction {
  private statements: Array<{ query: string; params?: any[] }> = [];

  constructor(private db: any) {}

  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    // Store statements for batch execution
    this.statements.push({ query, params });
    
    const startTime = Date.now();
    
    try {
      const result = await this.db.prepare(query).bind(...(params || [])).all();
      const duration = Date.now() - startTime;
      
      return {
        rows: result.results as T[],
        rowCount: result.results?.length || 0,
        duration,
      };
    } catch (error) {
      throw new Error(`Cloudflare D1 transaction query failed: ${error.message}`);
    }
  }

  async commit(): Promise<void> {
    // D1 doesn't have explicit transactions yet
    // In the future, this would commit the batch
  }

  async rollback(): Promise<void> {
    // D1 doesn't have explicit transactions yet
    // In the future, this would rollback the batch
    this.statements = [];
  }
}

/**
 * Cloudflare D1 database provider
 */
export class CloudflareD1Provider implements IDatabase {
  private db: any; // D1Database
  private cache?: Cache;
  private connected = false;
  private eventHandlers: Map<string, DatabaseEventHandler[]> = new Map();
  private validationRules: ValidationRule[] = [];
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializeD1();
  }

  /**
   * Initialize Cloudflare D1 database
   */
  private initializeD1(): void {
    // In a Cloudflare Worker environment, D1 databases are available via env
    // This is a placeholder - actual implementation would depend on the runtime
    if (typeof globalThis !== 'undefined' && (globalThis as any).D1_DATABASE) {
      this.db = (globalThis as any).D1_DATABASE;
    } else {
      // For development/testing, we might use a mock or local SQLite
      console.warn('D1 database not available, using mock implementation');
      this.db = this.createMockD1();
    }

    // Initialize edge cache if available
    if (this.config.cloudflareConfig?.enableEdgeCache && typeof caches !== 'undefined') {
      this.cache = caches.default;
    }
  }

  /**
   * Create a mock D1 implementation for development
   */
  private createMockD1(): any {
    return {
      prepare: (query: string) => ({
        bind: (...params: any[]) => ({
          all: async () => ({ results: [], success: true }),
          first: async () => null,
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
      }),
    };
  }

  // Connection management
  async connect(): Promise<void> {
    try {
      // Test the connection
      await this.db.prepare('SELECT 1').first();
      this.connected = true;
      
      this.emit({
        type: 'connection',
        timestamp: new Date(),
        data: { status: 'connected', provider: 'cloudflare-d1' },
      });
    } catch (error) {
      throw new Error(`Failed to connect to Cloudflare D1: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    
    this.emit({
      type: 'connection',
      timestamp: new Date(),
      data: { status: 'disconnected', provider: 'cloudflare-d1' },
    });
  }

  async getConnection(): Promise<DatabaseConnection> {
    return new CloudflareD1Connection(this.db, this.cache);
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Query execution
  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const connection = await this.getConnection();
    
    try {
      return await connection.execute<T>(query, params);
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
    // D1 uses SQLite under the hood, so we can use SQLite system tables
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
      unique: false,
    }));

    const indexes = [];
    for (const indexRow of indexListResult.rows) {
      const indexInfoQuery = `PRAGMA index_info(${this.escapeIdentifier(indexRow.name)})`;
      const indexInfoResult = await this.execute(indexInfoQuery);
      
      indexes.push({
        name: indexRow.name,
        columns: indexInfoResult.rows.map((col: any) => col.name),
        unique: indexRow.unique === 1,
        type: 'btree',
      });
    }

    return {
      name: tableName,
      columns,
      indexes,
      constraints: [],
    };
  }

  // Migration management
  async runMigrations(): Promise<Migration[]> {
    return [];
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    // Implementation would depend on migration manager
  }

  async getMigrationStatus(): Promise<Migration[]> {
    return [];
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // D1 doesn't provide detailed performance metrics
    return {
      queryCount: 0,
      averageQueryTime: 0,
      slowQueries: [],
      connectionPoolStats: {
        totalConnections: 1,
        activeConnections: this.connected ? 1 : 0,
        idleConnections: 0,
        waitingRequests: 0,
      },
      cacheHitRate: await this.calculateCacheHitRate(),
    };
  }

  enableQueryLogging(enabled: boolean): void {
    // D1 query logging would be handled by Cloudflare Workers analytics
  }

  // Backup and recovery
  async createBackup(config?: any): Promise<string> {
    // D1 backups would be handled by Cloudflare's infrastructure
    return 'cloudflare-backup-id';
  }

  async restoreBackup(backupPath: string): Promise<void> {
    // D1 restore would be handled by Cloudflare's infrastructure
  }

  // Validation
  async validateSchema(): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

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
        console.error(`Error in Cloudflare D1 event handler:`, error);
      }
    });
  }

  // Helper methods
  private async calculateCacheHitRate(): Promise<number> {
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
        throw new Error('D1/SQLite does not support modifying columns directly');
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

