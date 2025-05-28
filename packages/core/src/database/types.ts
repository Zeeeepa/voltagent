/**
 * Consolidated Database Types
 * 
 * Unified type definitions for all database providers and operations
 */

export type DatabaseProvider = 'postgresql' | 'libsql' | 'cloudflare-d1' | 'sqlite';

export interface DatabaseConfig {
  provider: DatabaseProvider;
  url: string;
  authToken?: string;
  poolConfig?: ConnectionPoolConfig;
  migrationConfig?: MigrationConfig;
  monitoringConfig?: MonitoringConfig;
  securityConfig?: SecurityConfig;
  cloudflareConfig?: CloudflareConfig;
}

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  healthCheckIntervalMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface MigrationConfig {
  migrationsPath: string;
  tableName: string;
  autoMigrate: boolean;
  backupBeforeMigration: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  queryLogging: boolean;
  performanceMetrics: boolean;
  slowQueryThresholdMs: number;
  metricsRetentionDays: number;
}

export interface SecurityConfig {
  enableRowLevelSecurity: boolean;
  encryptionKey?: string;
  auditLogging: boolean;
  accessControl: AccessControlConfig;
}

export interface AccessControlConfig {
  enableRBAC: boolean;
  defaultRole: string;
  roles: Record<string, string[]>;
}

export interface CloudflareConfig {
  accountId?: string;
  databaseId?: string;
  apiToken?: string;
  workerScript?: string;
  enableEdgeCache: boolean;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: QueryField[];
  duration: number;
  cached?: boolean;
}

export interface QueryField {
  name: string;
  type: string;
  nullable: boolean;
}

export interface DatabaseConnection {
  execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

export interface DatabaseTransaction {
  execute<T = any>(query: string, params?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  checksum: string;
  appliedAt?: Date;
}

export interface PerformanceMetrics {
  queryCount: number;
  averageQueryTime: number;
  slowQueries: SlowQuery[];
  connectionPoolStats: ConnectionPoolStats;
  cacheHitRate?: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retentionDays: number;
  compression: boolean;
  encryption: boolean;
  destination: BackupDestination;
}

export interface BackupDestination {
  type: 'local' | 's3' | 'cloudflare-r2';
  path: string;
  credentials?: Record<string, string>;
}

export interface ValidationRule {
  table: string;
  column: string;
  type: 'required' | 'unique' | 'foreign_key' | 'check' | 'custom';
  constraint: string;
  message: string;
}

export interface DatabaseEvent {
  type: 'query' | 'connection' | 'migration' | 'backup' | 'error';
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export type DatabaseEventHandler = (event: DatabaseEvent) => void | Promise<void>;

