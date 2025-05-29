/**
 * VoltAgent Database Module
 * Phase 1.3: Setup Database Event Storage System
 * 
 * Comprehensive database event storage system for tracking all development activities,
 * AI interactions, and system events with PostgreSQL backend.
 */

// Connection and configuration
export { 
  DatabaseConnection, 
  DatabaseConfig, 
  initializeDatabase, 
  getDatabase 
} from './connection';

// Migration system
export { 
  MigrationRunner, 
  MigrationConfig, 
  runMigrationsFromEnv 
} from './migrations/runner';

// Models
export {
  EventsModel,
  Event,
  CreateEventInput,
  UpdateEventInput,
  EventFilters
} from './models/events';

export {
  RequirementsModel,
  Requirement,
  RequirementStatus,
  CreateRequirementInput,
  UpdateRequirementInput,
  RequirementFilters
} from './models/requirements';

export {
  TasksModel,
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskHierarchy
} from './models/tasks';

export {
  CorrelationsModel,
  Correlation,
  CorrelationType,
  CreateCorrelationInput,
  UpdateCorrelationInput,
  CorrelationFilters
} from './models/correlations';

// Services
export {
  EventStorageService,
  EventBatch,
  EventStorageMetrics,
  EventQuery,
  EventQueryResult
} from './services/event-storage';

export {
  RequirementParserService,
  PRDDocument,
  PRDSection,
  ParsedRequirement,
  RequirementBreakdown,
  TaskHierarchy as ParsedTaskHierarchy,
  ParsedTask,
  DependencyMap,
  ParsingOptions
} from './services/requirement-parser';

export {
  AnalyticsService,
  DevelopmentMetrics,
  AgentPerformanceMetrics,
  ProjectMetrics,
  TrendData,
  ActivityTrends,
  PerformanceInsights,
  AnalyticsQuery
} from './services/analytics';

/**
 * Database Manager - Main entry point for database operations
 */
export class DatabaseManager {
  private connection: DatabaseConnection;
  private eventsModel: EventsModel;
  private requirementsModel: RequirementsModel;
  private tasksModel: TasksModel;
  private correlationsModel: CorrelationsModel;
  private eventStorageService: EventStorageService;
  private requirementParserService: RequirementParserService;
  private analyticsService: AnalyticsService;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.eventsModel = new EventsModel(connection);
    this.requirementsModel = new RequirementsModel(connection);
    this.tasksModel = new TasksModel(connection);
    this.correlationsModel = new CorrelationsModel(connection);
    this.eventStorageService = new EventStorageService(connection);
    this.requirementParserService = new RequirementParserService(connection);
    this.analyticsService = new AnalyticsService(connection);
  }

  /**
   * Get database connection
   */
  getConnection(): DatabaseConnection {
    return this.connection;
  }

  /**
   * Get events model
   */
  getEventsModel(): EventsModel {
    return this.eventsModel;
  }

  /**
   * Get requirements model
   */
  getRequirementsModel(): RequirementsModel {
    return this.requirementsModel;
  }

  /**
   * Get tasks model
   */
  getTasksModel(): TasksModel {
    return this.tasksModel;
  }

  /**
   * Get correlations model
   */
  getCorrelationsModel(): CorrelationsModel {
    return this.correlationsModel;
  }

  /**
   * Get event storage service
   */
  getEventStorageService(): EventStorageService {
    return this.eventStorageService;
  }

  /**
   * Get requirement parser service
   */
  getRequirementParserService(): RequirementParserService {
    return this.requirementParserService;
  }

  /**
   * Get analytics service
   */
  getAnalyticsService(): AnalyticsService {
    return this.analyticsService;
  }

  /**
   * Initialize database with migrations
   */
  async initialize(): Promise<void> {
    const migrationRunner = new MigrationRunner({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'voltagent',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true'
    });

    await migrationRunner.testConnection();
    await migrationRunner.runMigrations();
    await migrationRunner.close();
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    return this.connection.testConnection();
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    events: number;
    requirements: number;
    tasks: number;
    correlations: number;
    pool_stats: any;
  }> {
    const [events, requirements, tasks, correlations] = await Promise.all([
      this.eventsModel.count(),
      this.requirementsModel.count(),
      this.tasksModel.count(),
      this.correlationsModel.count()
    ]);

    return {
      events,
      requirements,
      tasks,
      correlations,
      pool_stats: this.connection.getPoolStats()
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.eventStorageService.stop();
    await this.connection.close();
  }
}

/**
 * Create and initialize database manager
 */
export async function createDatabaseManager(config?: DatabaseConfig): Promise<DatabaseManager> {
  const connection = config ? 
    DatabaseConnection.getInstance(config) : 
    DatabaseConnection.initializeFromEnv();

  const manager = new DatabaseManager(connection);
  await manager.initialize();
  
  return manager;
}

/**
 * Default database manager instance
 */
let defaultManager: DatabaseManager | null = null;

/**
 * Get default database manager
 */
export function getDefaultDatabaseManager(): DatabaseManager {
  if (!defaultManager) {
    throw new Error('Default database manager not initialized. Call initializeDefaultDatabaseManager() first.');
  }
  return defaultManager;
}

/**
 * Initialize default database manager
 */
export async function initializeDefaultDatabaseManager(config?: DatabaseConfig): Promise<DatabaseManager> {
  defaultManager = await createDatabaseManager(config);
  return defaultManager;
}

