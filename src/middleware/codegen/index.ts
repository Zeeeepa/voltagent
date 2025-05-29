/**
 * Codegen SDK Integration
 * 
 * Main exports for Codegen SDK middleware
 */

// SDK Client
export {
  CodegenSDKClient,
  CodegenTask,
  type CodegenConfig,
  type TaskStatus,
  type CodeGenerationRequest,
  type RepositoryOperation,
  type PullRequestRequest,
  type IssueRequest
} from './sdk-client.js';

// Authentication
export {
  CodegenAuthManager,
  authManager,
  type AuthCredentials,
  type AuthValidationResult
} from './auth-manager.js';

// Repository Operations
export {
  CodegenRepositoryOps,
  type FileOperation,
  type CommitInfo,
  type BranchInfo,
  type PullRequestInfo
} from './repository-ops.js';

// Pull Request Management
export {
  CodegenPRManager,
  type PRTemplate,
  type PRStatus,
  type PRCheck,
  type PRReview,
  type PRComment
} from './pr-manager.js';

