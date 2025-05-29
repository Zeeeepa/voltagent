/**
 * Codegen SDK Types
 * TypeScript definitions for the Codegen REST API
 */

export interface CodegenConfig {
  /** Organization ID from codegen.com/developer */
  orgId: string;
  /** API token from codegen.com/developer */
  token: string;
  /** Base URL for the Codegen API */
  baseURL?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Rate limiting configuration */
  rateLimit?: {
    requests: number;
    window: number;
  };
  /** Cache configuration */
  cache?: {
    ttl: number;
    maxSize: number;
  };
}

export interface CodegenTask {
  /** Unique task identifier */
  id: string;
  /** Current task status */
  status: TaskStatus;
  /** Task result when completed */
  result?: TaskResult;
  /** Error information if task failed */
  error?: TaskError;
  /** Task creation timestamp */
  createdAt: string;
  /** Task completion timestamp */
  completedAt?: string;
  /** Original prompt that created the task */
  prompt: string;
  /** Task metadata */
  metadata?: Record<string, any>;
}

export type TaskStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TaskResult {
  /** Generated code or content */
  code?: string;
  /** Summary of changes made */
  summary?: string;
  /** Links to created resources (PRs, files, etc.) */
  links?: string[];
  /** Files that were modified */
  files?: ModifiedFile[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface ModifiedFile {
  /** File path relative to repository root */
  path: string;
  /** Type of modification */
  action: 'created' | 'modified' | 'deleted';
  /** File content (for created/modified files) */
  content?: string;
  /** Number of lines added */
  linesAdded?: number;
  /** Number of lines removed */
  linesRemoved?: number;
}

export interface TaskError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, any>;
  /** Stack trace if available */
  stack?: string;
}

export interface CreateTaskRequest {
  /** The prompt describing what to implement */
  prompt: string;
  /** Repository context */
  repository?: RepositoryContext;
  /** Additional parameters */
  parameters?: TaskParameters;
}

export interface RepositoryContext {
  /** Repository URL or identifier */
  url?: string;
  /** Branch to work on */
  branch?: string;
  /** Base directory within the repository */
  baseDir?: string;
  /** Files to focus on */
  files?: string[];
}

export interface TaskParameters {
  /** Programming language preference */
  language?: string;
  /** Framework or library preferences */
  framework?: string;
  /** Code style preferences */
  style?: string;
  /** Whether to create tests */
  includeTests?: boolean;
  /** Whether to create documentation */
  includeDocumentation?: boolean;
  /** Custom instructions */
  instructions?: string[];
}

export interface CodegenAPIResponse<T = any> {
  /** Response data */
  data: T;
  /** Response status */
  status: number;
  /** Response message */
  message?: string;
  /** Request ID for tracking */
  requestId?: string;
}

export interface CodegenAPIError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: Record<string, any>;
  /** Request ID for tracking */
  requestId?: string;
}

export interface AuthenticationInfo {
  /** Organization ID */
  orgId: string;
  /** Whether the token is valid */
  valid: boolean;
  /** Token expiration date */
  expiresAt?: string;
  /** Available quota */
  quota?: {
    used: number;
    limit: number;
    resetAt: string;
  };
}

export interface RepositoryInfo {
  /** Repository ID */
  id: string;
  /** Repository name */
  name: string;
  /** Repository URL */
  url: string;
  /** Default branch */
  defaultBranch: string;
  /** Available branches */
  branches: string[];
  /** Repository permissions */
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
}

export interface PullRequestInfo {
  /** PR number */
  number: number;
  /** PR title */
  title: string;
  /** PR description */
  description: string;
  /** PR URL */
  url: string;
  /** Source branch */
  sourceBranch: string;
  /** Target branch */
  targetBranch: string;
  /** PR status */
  status: 'open' | 'closed' | 'merged';
  /** Files changed in the PR */
  files: ModifiedFile[];
}

export interface CodeGenerationRequest {
  /** Natural language description of what to generate */
  prompt: string;
  /** Context about the codebase */
  context?: CodebaseContext;
  /** Generation parameters */
  parameters?: CodeGenerationParameters;
}

export interface CodebaseContext {
  /** Programming language */
  language: string;
  /** Framework being used */
  framework?: string;
  /** Existing code snippets for context */
  existingCode?: string[];
  /** File structure */
  fileStructure?: string[];
  /** Dependencies */
  dependencies?: string[];
}

export interface CodeGenerationParameters {
  /** Code style preferences */
  style?: 'minimal' | 'standard' | 'documented' | 'comprehensive';
  /** Whether to include error handling */
  includeErrorHandling?: boolean;
  /** Whether to include logging */
  includeLogging?: boolean;
  /** Whether to include type annotations */
  includeTypes?: boolean;
  /** Maximum lines of code to generate */
  maxLines?: number;
}

export interface CodeAnalysisResult {
  /** Code quality score */
  qualityScore: number;
  /** Detected issues */
  issues: CodeIssue[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Code metrics */
  metrics: CodeMetrics;
}

export interface CodeIssue {
  /** Issue type */
  type: 'error' | 'warning' | 'info';
  /** Issue message */
  message: string;
  /** File path */
  file?: string;
  /** Line number */
  line?: number;
  /** Column number */
  column?: number;
  /** Suggested fix */
  fix?: string;
}

export interface CodeMetrics {
  /** Lines of code */
  linesOfCode: number;
  /** Cyclomatic complexity */
  complexity: number;
  /** Test coverage percentage */
  testCoverage?: number;
  /** Number of functions */
  functions: number;
  /** Number of classes */
  classes: number;
  /** Number of dependencies */
  dependencies: number;
}

