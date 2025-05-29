import { z } from 'zod';

// Base analysis result schema
export const AnalysisResultSchema = z.object({
  module: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  findings: z.array(z.object({
    type: z.string(),
    file: z.string(),
    line: z.number().optional(),
    column: z.number().optional(),
    function: z.string().optional(),
    endpoint: z.string().optional(),
    risk: z.string(),
    vulnerability: z.string().optional(),
    suggestion: z.string(),
    description: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  })),
  metadata: z.object({
    analysisTime: z.number(),
    filesAnalyzed: z.number(),
    totalLines: z.number(),
    coverage: z.number().optional(),
  }).optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Finding = AnalysisResult['findings'][0];

// Security-specific schemas
export const SecurityFindingSchema = z.object({
  type: z.enum([
    'missing_authentication',
    'weak_authorization',
    'privilege_escalation',
    'session_management',
    'token_validation',
    'csrf_vulnerability',
    'rate_limiting',
    'insecure_storage',
    'unprotected_endpoint',
    'weak_session_handling',
  ]),
  file: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  function: z.string().optional(),
  endpoint: z.string().optional(),
  risk: z.string(),
  vulnerability: z.string().optional(),
  suggestion: z.string(),
  description: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const AccessControlAnalysisResultSchema = AnalysisResultSchema.extend({
  module: z.literal('access_control_analysis'),
  findings: z.array(SecurityFindingSchema),
});

export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;
export type AccessControlAnalysisResult = z.infer<typeof AccessControlAnalysisResultSchema>;

// Analysis context for file processing
export interface AnalysisContext {
  filePath: string;
  content: string;
  language: string;
  framework?: string;
  dependencies?: string[];
}

// Base analyzer interface
export interface Analyzer {
  name: string;
  version: string;
  analyze(context: AnalysisContext[]): Promise<AnalysisResult>;
}

// Security patterns to detect
export interface SecurityPattern {
  name: string;
  pattern: RegExp | string;
  type: SecurityFinding['type'];
  severity: SecurityFinding['severity'];
  description: string;
  suggestion: string;
  risk: string;
}

// Authentication and authorization patterns
export interface AuthPattern {
  middleware: RegExp[];
  decorators: RegExp[];
  functions: RegExp[];
  endpoints: RegExp[];
  tokens: RegExp[];
  sessions: RegExp[];
}

