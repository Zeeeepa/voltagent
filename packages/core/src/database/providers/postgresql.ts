/**
 * PostgreSQL Database Provider
 * 
 * Comprehensive PostgreSQL implementation with connection pooling,
 * performance optimization, and advanced features
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
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
 * PostgreSQL-specific connection wrapper
 */
class PostgreSQLConnection implements DatabaseConnection {
  constructor(private client: PoolClient, private pool: Pool) {}

  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await this.client.query(query, params);
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields?.map(field => ({
          name: field.name,
          type: field.dataTypeID.toString(),
          nullable: true, // PostgreSQL doesn't provide this info directly
        })),
        duration,
      };
    } catch (error) {
      throw new Error(`PostgreSQL query failed: ${error.message}`);
    }
  }

  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    const tx = new PostgreSQLTransaction(this.client);
    
    try {
      await this.client.query('BEGIN');
      const result = await callback(tx);
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.client.release();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * PostgreSQL transaction wrapper
 */
class PostgreSQLTransaction implements DatabaseTransaction {
  constructor(private client: PoolClient) {}

  async execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await this.client.query(query, params);
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        duration,
      };
    } catch (error) {
      throw new Error(`PostgreSQL transaction query failed: ${error.message}`);
    }
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }
}

/**
 * PostgreSQL database provider implementation
 */
export class PostgreSQLProvider implements IDatabase {
  private pool: Pool;
  private connected = false;
  private eventHandlers: Map<string, DatabaseEventHandler[]> = new Map();
  private validationRules: ValidationRule[] = [];
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializePool();
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  private initializePool(): void {
    const poolConfig: PoolConfig = {
      connectionString: this.config.url,
      min: this.config.poolConfig?.minConnections || 2,
      max: this.config.poolConfig?.maxConnections || 10,
      acquireTimeoutMillis: this.config.poolConfig?.acquireTimeoutMs || 30000,
      idleTimeoutMillis: this.config.poolConfig?.idleTimeoutMs || 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      query_timeout: 30000,
    };

    this.pool = new Pool(poolConfig);

    // Set up pool event handlers
    this.pool.on('connect', (client) => {
      this.emit({
        type: 'connection',
        timestamp: new Date(),
        data: { action: 'connect', clientId: client.processID },
      });
    });

    this.pool.on('remove', (client) => {
      this.emit({
        type: 'connection',
        timestamp: new Date(),
        data: { action: 'remove', clientId: client.processID },
      });
    });

    this.pool.on('error', (error) => {
      this.emit({
        type: 'error',
        timestamp: new Date(),
        data: { error: error.message, source: 'connection_pool' },
      });
    });
  }

  // Connection management
  async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.connected = true;
      
      // Set up PostgreSQL-specific configurations
      await this.setupPostgreSQLConfig();
      
      this.emit({
        type: 'connection',
        timestamp: new Date(),
        data: { status: 'connected', provider: 'postgresql' },
      });
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.connected = false;
    
    this.emit({
      type: 'connection',
      timestamp: new Date(),
      data: { status: 'disconnected', provider: 'postgresql' },
    });
  }

  async getConnection(): Promise<DatabaseConnection> {
    const client = await this.pool.connect();
    return new PostgreSQLConnection(client, this.pool);
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Set up PostgreSQL-specific configurations
   */
  private async setupPostgreSQLConfig(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Enable query logging if configured
      if (this.config.monitoringConfig?.queryLogging) {
        await client.query(\"SET log_statement = 'all'\");
      }

      // Set up performance monitoring
      if (this.config.monitoringConfig?.performanceMetrics) {
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
      }

      // Enable row-level security if configured
      if (this.config.securityConfig?.enableRowLevelSecurity) {
        await client.query('SET row_security = on');
      }
    } finally {
      client.release();
    }
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
    await this.execute(`DROP TABLE IF EXISTS ${this.escapeIdentifier(tableName)} CASCADE`);
  }

  async alterTable(tableName: string, changes: TableChange[]): Promise<void> {
    for (const change of changes) {
      const sql = this.generateAlterTableSQL(tableName, change);
      await this.execute(sql);
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `;
    
    const indexesQuery = `
      SELECT 
        i.relname as index_name,
        array_agg(a.attname ORDER BY c.ordinality) as columns,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN unnest(ix.indkey) WITH ORDINALITY c(attnum, ordinality) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.attnum
      WHERE t.relname = $1
      GROUP BY i.relname, ix.indisunique
    `;

    const [columnsResult, indexesResult] = await Promise.all([
      this.execute(columnsQuery, [tableName]),
      this.execute(indexesQuery, [tableName]),
    ]);

    return {
      name: tableName,
      columns: columnsResult.rows.map(row => ({
        name: row.column_name,
        type: this.mapPostgreSQLType(row.data_type, row.character_maximum_length, row.numeric_precision, row.numeric_scale),
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
        primaryKey: false, // Would need additional query to determine
        unique: false, // Would need additional query to determine
      })),
      indexes: indexesResult.rows.map(row => ({
        name: row.index_name,
        columns: row.columns,
        unique: row.is_unique,
        type: 'btree', // Default for PostgreSQL
      })),
      constraints: [], // Would need additional query to get constraints
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
    const statsQuery = `
      SELECT 
        calls,
        total_time,
        mean_time,
        query
      FROM pg_stat_statements 
      ORDER BY total_time DESC 
      LIMIT 10
    `;

    try {
      const result = await this.execute(statsQuery);
      
      return {
        queryCount: result.rows.reduce((sum, row) => sum + row.calls, 0),
        averageQueryTime: result.rows.reduce((sum, row) => sum + row.mean_time, 0) / result.rows.length,
        slowQueries: result.rows.map(row => ({
          query: row.query,
          duration: row.total_time,
          timestamp: new Date(),
        })),
        connectionPoolStats: {
          totalConnections: this.pool.totalCount,
          activeConnections: this.pool.totalCount - this.pool.idleCount,
          idleConnections: this.pool.idleCount,
          waitingRequests: this.pool.waitingCount,
        },
      };
    } catch (error) {
      // pg_stat_statements might not be available
      return {
        queryCount: 0,
        averageQueryTime: 0,
        slowQueries: [],
        connectionPoolStats: {
          totalConnections: this.pool.totalCount,
          activeConnections: this.pool.totalCount - this.pool.idleCount,
          idleConnections: this.pool.idleCount,
          waitingRequests: this.pool.waitingCount,
        },
      };
    }
  }

  enableQueryLogging(enabled: boolean): void {
    // This would be handled by the performance monitor
  }

  // Backup and recovery
  async createBackup(config?: any): Promise<string> {
    // This would be implemented by the backup manager
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
        console.error(`Error in PostgreSQL event handler:`, error);
      }
    });
  }

  // Helper methods
  private generateCreateTableSQL(tableName: string, schema: TableSchema): string {
    const columns = schema.columns.map(col => {
      let sql = `${this.escapeIdentifier(col.name)} ${col.type}`;
      
      if (!col.nullable) {
        sql += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined) {
        sql += ` DEFAULT ${this.escapeValue(col.defaultValue)}`;
      }
      
      if (col.primaryKey) {
        sql += ' PRIMARY KEY';
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
        return `ALTER TABLE ${table} ALTER COLUMN ${this.escapeIdentifier(change.column!.name)} TYPE ${change.column!.type}`;
      default:
        throw new Error(`Unsupported table change type: ${change.type}`);
    }
  }

  private mapPostgreSQLType(pgType: string, maxLength?: number, precision?: number, scale?: number): string {
    switch (pgType.toLowerCase()) {
      case 'character varying':
      case 'varchar':
        return maxLength ? `VARCHAR(${maxLength})` : 'VARCHAR';
      case 'character':
      case 'char':
        return maxLength ? `CHAR(${maxLength})` : 'CHAR';
      case 'text':
        return 'TEXT';
      case 'integer':
      case 'int4':
        return 'INTEGER';
      case 'bigint':
      case 'int8':
        return 'BIGINT';
      case 'smallint':
      case 'int2':
        return 'SMALLINT';
      case 'numeric':
      case 'decimal':
        return precision && scale ? `DECIMAL(${precision},${scale})` : 'DECIMAL';
      case 'real':
      case 'float4':
        return 'REAL';
      case 'double precision':
      case 'float8':
        return 'DOUBLE PRECISION';
      case 'boolean':
      case 'bool':
        return 'BOOLEAN';
      case 'timestamp without time zone':
        return 'TIMESTAMP';
      case 'timestamp with time zone':
        return 'TIMESTAMPTZ';
      case 'date':
        return 'DATE';
      case 'time without time zone':
        return 'TIME';
      case 'uuid':
        return 'UUID';
      case 'json':
        return 'JSON';
      case 'jsonb':
        return 'JSONB';
      default:
        return pgType.toUpperCase();
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
      return value ? 'TRUE' : 'FALSE';
    }
    return String(value);
  }
}

