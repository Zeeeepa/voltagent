// GitHub Integration Package
export { default as GitHubPRManager } from './integrations/github/pr-manager';
export { default as GitHubWebhookHandler } from './integrations/github/webhook-handler';
export { default as GitHubReviewAutomation } from './integrations/github/review-automation';

// Export types
export type {
  PRConfig,
  PRInfo,
  PRStatus,
  CheckStatus,
  ReviewStatus,
} from './integrations/github/pr-manager';

export type {
  WebhookConfig,
  PREvent,
  PushEvent,
  CheckRunEvent,
  CommitInfo,
} from './integrations/github/webhook-handler';

export type {
  ReviewConfig,
  AutoReviewResult,
  ReviewIssue,
  ReviewSuggestion,
  SecurityFinding,
  PerformanceIssue,
} from './integrations/github/review-automation';

