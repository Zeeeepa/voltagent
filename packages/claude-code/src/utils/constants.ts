// Constants for Claude Code integration

export const VALIDATION_TIMEOUTS = {
  DEFAULT: 300000, // 5 minutes
  QUICK: 60000,    // 1 minute
  EXTENDED: 900000, // 15 minutes
} as const;

export const VALIDATION_WEIGHTS = {
  CODE_QUALITY: 0.3,
  FUNCTIONALITY: 0.4,
  TESTING: 0.2,
  DOCUMENTATION: 0.1,
} as const;

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const VALIDATION_CATEGORIES = {
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  MAINTAINABILITY: 'maintainability',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  STYLE: 'style',
  COMPLEXITY: 'complexity',
} as const;

export const WSL2_DEFAULTS = {
  DISTRO: 'Ubuntu-22.04',
  MEMORY: '8GB',
  PROCESSORS: 4,
  SWAP: '2GB',
  MAX_INSTANCES: 5,
} as const;

export const AGENTAPI_ENDPOINTS = {
  VALIDATE: '/api/v1/claude-code/validate',
  ANALYZE: '/api/v1/claude-code/analyze',
  HEALTH: '/health',
  HISTORY: '/api/v1/claude-code/validation/history',
  CANCEL: '/api/v1/claude-code/validation/{sessionId}/cancel',
  STATUS: '/api/v1/claude-code/validation/{sessionId}/status',
  BATCH: '/api/v1/claude-code/validate/batch',
  METRICS: '/api/v1/claude-code/metrics',
} as const;

export const EVENT_TYPES = {
  VALIDATION_STARTED: 'validation_started',
  VALIDATION_PROGRESS: 'validation_progress',
  VALIDATION_COMPLETED: 'validation_completed',
  VALIDATION_FAILED: 'validation_failed',
  DEPLOYMENT_STARTED: 'deployment_started',
  DEPLOYMENT_COMPLETED: 'deployment_completed',
  DEPLOYMENT_FAILED: 'deployment_failed',
} as const;

export const GRADE_THRESHOLDS = {
  A_PLUS: 90,
  A: 85,
  A_MINUS: 80,
  B_PLUS: 75,
  B: 70,
  B_MINUS: 65,
  C_PLUS: 60,
  C: 55,
  C_MINUS: 50,
  D_PLUS: 45,
  D: 40,
} as const;

export const DEPLOYMENT_STRATEGIES = {
  WSL2: 'wsl2',
  DOCKER: 'docker',
  LOCAL: 'local',
} as const;

export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded',
} as const;

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

