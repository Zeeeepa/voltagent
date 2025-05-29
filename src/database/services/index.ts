/**
 * Database Services Index
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

export { EventStorageService } from './event-storage';
export { RequirementParserService } from './requirement-parser';
export { AnalyticsService } from './analytics';

export type {
  EventIngestionOptions,
  EventProcessingRule,
} from './event-storage';

export type {
  ParsedRequirement,
  RequirementAnalysis,
  RequirementHierarchy,
} from './requirement-parser';

export type {
  PerformanceMetrics,
  ProjectMetrics,
  UserMetrics,
  SystemHealth,
  TrendData,
  AnalyticsReport,
} from './analytics';

