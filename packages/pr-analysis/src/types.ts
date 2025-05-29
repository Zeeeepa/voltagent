import { z } from 'zod'

// Core analysis types
export const AnalysisResultSchema = z.object({
  id: z.string(),
  type: z.enum(['static', 'dynamic', 'security', 'performance', 'compliance']),
  module: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  suggestion: z.string().optional(),
  autoFixable: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
  timestamp: z.date().default(() => new Date())
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// PR context
export const PRContextSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  description: z.string(),
  author: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
  repository: z.object({
    owner: z.string(),
    name: z.string(),
    fullName: z.string()
  }),
  files: z.array(z.object({
    filename: z.string(),
    status: z.enum(['added', 'modified', 'removed']),
    additions: z.number(),
    deletions: z.number(),
    patch: z.string().optional()
  })),
  commits: z.array(z.object({
    sha: z.string(),
    message: z.string(),
    author: z.string(),
    timestamp: z.date()
  })),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type PRContext = z.infer<typeof PRContextSchema>

// Analysis configuration
export const AnalysisConfigSchema = z.object({
  enabled: z.boolean().default(true),
  timeout: z.number().default(300), // 5 minutes
  parallel: z.boolean().default(true),
  modules: z.object({
    static: z.object({
      enabled: z.boolean().default(true),
      modules: z.array(z.string()).default([
        'unused-functions',
        'parameter-validation',
        'duplicate-code',
        'complexity',
        'imports'
      ])
    }),
    dynamic: z.object({
      enabled: z.boolean().default(true),
      modules: z.array(z.string()).default([
        'function-flow',
        'data-flow',
        'error-handling',
        'performance-hotspots'
      ])
    }),
    security: z.object({
      enabled: z.boolean().default(true),
      modules: z.array(z.string()).default([
        'vulnerability-detection',
        'access-control',
        'compliance'
      ])
    }),
    performance: z.object({
      enabled: z.boolean().default(true),
      modules: z.array(z.string()).default([
        'hotspot-detection',
        'memory-analysis',
        'optimization'
      ])
    }),
    compliance: z.object({
      enabled: z.boolean().default(true),
      modules: z.array(z.string()).default([
        'code-standards',
        'documentation'
      ])
    })
  })
})

export type AnalysisConfig = z.infer<typeof AnalysisConfigSchema>

// Workflow states
export const WorkflowStateSchema = z.enum([
  'pending',
  'analyzing',
  'creating-issues',
  'auto-fixing',
  'validating',
  'completed',
  'failed'
])

export type WorkflowState = z.infer<typeof WorkflowStateSchema>

// Workflow execution
export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  prId: z.string(),
  state: WorkflowStateSchema,
  startedAt: z.date(),
  completedAt: z.date().optional(),
  results: z.array(AnalysisResultSchema).default([]),
  linearIssues: z.array(z.string()).default([]),
  autoFixAttempts: z.number().default(0),
  errors: z.array(z.object({
    message: z.string(),
    stack: z.string().optional(),
    timestamp: z.date()
  })).default([]),
  metadata: z.record(z.any()).optional()
})

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>

// Integration configurations
export const LinearConfigSchema = z.object({
  apiKey: z.string(),
  teamId: z.string(),
  projectId: z.string().optional(),
  createSubIssues: z.boolean().default(true),
  assignToBot: z.boolean().default(true)
})

export type LinearConfig = z.infer<typeof LinearConfigSchema>

export const AgentAPIConfigSchema = z.object({
  baseUrl: z.string(),
  apiKey: z.string(),
  timeout: z.number().default(300),
  maxRetries: z.number().default(3)
})

export type AgentAPIConfig = z.infer<typeof AgentAPIConfigSchema>

export const GitHubConfigSchema = z.object({
  token: z.string(),
  webhookSecret: z.string(),
  appId: z.string().optional(),
  privateKey: z.string().optional()
})

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>

// Database schemas
export const AnalysisRecordSchema = z.object({
  id: z.string(),
  prId: z.string(),
  workflowId: z.string(),
  type: z.string(),
  module: z.string(),
  result: AnalysisResultSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})

export type AnalysisRecord = z.infer<typeof AnalysisRecordSchema>

// Error recovery
export const AutoFixResultSchema = z.object({
  id: z.string(),
  analysisId: z.string(),
  success: z.boolean(),
  changes: z.array(z.object({
    file: z.string(),
    type: z.enum(['create', 'modify', 'delete']),
    content: z.string().optional(),
    diff: z.string().optional()
  })),
  commitSha: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.date()
})

export type AutoFixResult = z.infer<typeof AutoFixResultSchema>

// Metrics and reporting
export const AnalysisMetricsSchema = z.object({
  totalPRsAnalyzed: z.number(),
  averageAnalysisTime: z.number(),
  issuesDetected: z.number(),
  autoFixSuccessRate: z.number(),
  modulePerformance: z.record(z.object({
    executionTime: z.number(),
    issuesFound: z.number(),
    successRate: z.number()
  })),
  timestamp: z.date()
})

export type AnalysisMetrics = z.infer<typeof AnalysisMetricsSchema>

// Base interfaces for analysis modules
export interface IAnalysisModule {
  readonly name: string
  readonly type: 'static' | 'dynamic' | 'security' | 'performance' | 'compliance'
  readonly version: string
  
  analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]>
  canAutoFix(result: AnalysisResult): boolean
  autoFix?(result: AnalysisResult, context: PRContext): Promise<AutoFixResult>
}

export interface IIntegration {
  readonly name: string
  initialize(config: any): Promise<void>
  isHealthy(): Promise<boolean>
}

export interface IDatabase {
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
}

