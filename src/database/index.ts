/**
 * Task Master Database Module
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

// Configuration
export * from './config';
export * from './connection';

// Models
export * from './models/requirements';
export * from './models/tasks';
export * from './models/events';
export * from './models/correlations';

// Services
export * from './services/event-storage';
export * from './services/requirement-parser';
export * from './services/analytics';

// Main Database Manager
export { getDatabaseManager, DatabaseConnectionManager } from './connection';

// Convenience exports for common use cases
export {
  RequirementsModel,
  TasksModel,
  EventsModel,
  CorrelationsModel,
} from './models';

export {
  EventStorageService,
  RequirementParserService,
  AnalyticsService,
} from './services';

// Event constants
export {
  TaskMasterEventTypes,
  TaskMasterEventSources,
} from './services/event-storage';

