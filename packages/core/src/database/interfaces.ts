/**
 * Consolidated Database Interfaces
 * 
 * Unified interfaces for all database operations across providers
 */

import type {
  DatabaseConfig,
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

/**
 * Main database interface that all providers must implement
 */
export interface IDatabase {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnection(): Promise<DatabaseConnection>;
  isConnected(): boolean;
  
  // Query execution
  execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  
  // Schema management
  createTable(tableName: string, schema: TableSchema): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  alterTable(tableName: string, changes: TableChange[]): Promise<void>;
  getTableSchema(tableName: string): Promise<TableSchema>;
  
  // Migration management
  runMigrations(): Promise<Migration[]>;
  rollbackMigration(migrationId: string): Promise<void>;
  getMigrationStatus(): Promise<Migration[]>;
  
  // Performance monitoring
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  enableQueryLogging(enabled: boolean): void;
  
  // Backup and recovery
  createBackup(config?: Partial<BackupConfig>): Promise<string>;
  restoreBackup(backupPath: string): Promise<void>;
  
  // Validation
  validateSchema(): Promise<ValidationResult>;
  addValidationRule(rule: ValidationRule): void;
  
  // Event handling
  on(event: string, handler: DatabaseEventHandler): void;
  off(event: string, handler: DatabaseEventHandler): void;
  emit(event: DatabaseEvent): void;
}

/**
 * Connection pool interface for managing database connections
 */
export interface IConnectionPool {
  acquire(): Promise<DatabaseConnection>;
  release(connection: DatabaseConnection): Promise<void>;
  destroy(connection: DatabaseConnection): Promise<void>;
  getStats(): Promise<ConnectionPoolStats>;
  healthCheck(): Promise<HealthCheckResult>;
  drain(): Promise<void>;
}

/**
 * Migration manager interface
 */
export interface IMigrationManager {
  loadMigrations(): Promise<Migration[]>;
  applyMigration(migration: Migration): Promise<void>;
  rollbackMigration(migration: Migration): Promise<void>;
  getMigrationHistory(): Promise<Migration[]>;
  generateMigration(name: string, changes: SchemaChange[]): Promise<Migration>;
}

/**
 * Performance monitor interface
 */
export interface IPerformanceMonitor {
  startQuery(query: string, params?: any[]): QueryTracker;
  recordMetrics(metrics: Partial<PerformanceMetrics>): void;
  getMetrics(timeRange?: TimeRange): Promise<PerformanceMetrics>;
  getSlowQueries(limit?: number): Promise<SlowQuery[]>;
  optimizeQuery(query: string): Promise<QueryOptimization>;
}

/**
 * Security manager interface
 */
export interface ISecurityManager {
  validateAccess(operation: string, resource: string, user: string): Promise<boolean>;
  encryptData(data: any): Promise<string>;
  decryptData(encryptedData: string): Promise<any>;
  auditLog(operation: string, user: string, resource: string): Promise<void>;
  setupRowLevelSecurity(table: string, policy: SecurityPolicy): Promise<void>;
}

/**
 * Backup manager interface
 */
export interface IBackupManager {
  createBackup(config?: Partial<BackupConfig>): Promise<BackupResult>;
  restoreBackup(backupId: string): Promise<void>;
  listBackups(): Promise<BackupInfo[]>;
  deleteBackup(backupId: string): Promise<void>;
  scheduleBackup(config: BackupConfig): Promise<void>;
}

/**
 * Schema validator interface
 */
export interface ISchemaValidator {
  validateTable(tableName: string, schema: TableSchema): Promise<ValidationResult>;
  validateData(tableName: string, data: any): Promise<ValidationResult>;
  addConstraint(tableName: string, constraint: Constraint): Promise<void>;
  removeConstraint(tableName: string, constraintName: string): Promise<void>;
}

/**
 * Query optimizer interface
 */
export interface IQueryOptimizer {
  analyzeQuery(query: string): Promise<QueryAnalysis>;
  optimizeQuery(query: string): Promise<QueryOptimization>;
  createIndex(tableName: string, columns: string[], options?: IndexOptions): Promise<void>;
  dropIndex(indexName: string): Promise<void>;
  getIndexUsage(): Promise<IndexUsage[]>;
}

// Supporting types for interfaces

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  primaryKey?: boolean;
  unique?: boolean;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintDefinition {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  checkExpression?: string;
}

export interface TableChange {
  type: 'add_column' | 'drop_column' | 'modify_column' | 'add_index' | 'drop_index';
  column?: ColumnDefinition;
  index?: IndexDefinition;
  oldColumn?: ColumnDefinition;
}

export interface SchemaChange {
  type: 'create_table' | 'drop_table' | 'alter_table';
  table: string;
  schema?: TableSchema;
  changes?: TableChange[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: string;
  message: string;
  table?: string;
  column?: string;
  value?: any;
}

export interface ValidationWarning {
  type: string;
  message: string;
  table?: string;
  column?: string;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  averageWaitTime: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  errors: string[];
  timestamp: Date;
}

export interface QueryTracker {
  end(): void;
  addMetadata(key: string, value: any): void;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
  stackTrace?: string;
}

export interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: number;
  suggestions: string[];
}

export interface QueryAnalysis {
  executionPlan: ExecutionPlan;
  estimatedCost: number;
  estimatedRows: number;
  indexUsage: string[];
  suggestions: string[];
}

export interface ExecutionPlan {
  nodeType: string;
  cost: number;
  rows: number;
  children?: ExecutionPlan[];
}

export interface SecurityPolicy {
  name: string;
  expression: string;
  roles: string[];
}

export interface BackupResult {
  id: string;
  path: string;
  size: number;
  duration: number;
  timestamp: Date;
}

export interface BackupInfo {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
  type: 'full' | 'incremental';
}

export interface Constraint {
  name: string;
  type: string;
  expression: string;
  errorMessage?: string;
}

export interface IndexOptions {
  unique?: boolean;
  type?: string;
  where?: string;
  include?: string[];
}

export interface IndexUsage {
  indexName: string;
  tableName: string;
  scans: number;
  tupleReads: number;
  tuplesFetched: number;
  lastUsed?: Date;
}

