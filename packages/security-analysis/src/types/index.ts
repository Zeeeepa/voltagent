/**
 * Security vulnerability detection types and interfaces
 */

export type VulnerabilityType = 
  | 'sql_injection'
  | 'xss_vulnerability'
  | 'command_injection'
  | 'path_traversal'
  | 'authentication_bypass'
  | 'authorization_weakness'
  | 'insecure_crypto'
  | 'hardcoded_secrets'
  | 'insecure_deserialization'
  | 'xxe_vulnerability'
  | 'csrf_vulnerability'
  | 'open_redirect'
  | 'information_disclosure'
  | 'dos_vulnerability'
  | 'race_condition';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface VulnerabilityFinding {
  type: VulnerabilityType;
  file: string;
  function?: string;
  line: number;
  column?: number;
  vulnerability: string;
  risk_level: RiskLevel;
  suggestion: string;
  description: string;
  cwe_id?: string;
  owasp_category?: string;
  confidence: number; // 0-100
  evidence?: string;
  remediation_effort?: 'low' | 'medium' | 'high';
}

export interface SecurityAnalysisResult {
  module: 'security_vulnerability_detection';
  severity: Severity;
  scan_timestamp: string;
  total_files_scanned: number;
  total_vulnerabilities: number;
  findings: VulnerabilityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  owasp_coverage: string[];
  scan_duration_ms: number;
}

export interface SecurityPattern {
  id: string;
  name: string;
  description: string;
  type: VulnerabilityType;
  risk_level: RiskLevel;
  owasp_category: string;
  cwe_id?: string;
  pattern: RegExp | string;
  file_extensions: string[];
  confidence: number;
  suggestion: string;
  examples: {
    vulnerable: string;
    secure: string;
  };
}

export interface CodeContext {
  file: string;
  content: string;
  language: string;
  lines: string[];
  functions: FunctionInfo[];
  imports: string[];
  exports: string[];
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface ScanOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
  enabledDetectors?: string[];
  disabledDetectors?: string[];
  confidenceThreshold?: number;
  outputFormat?: 'json' | 'sarif' | 'csv';
}

export interface DetectorResult {
  findings: VulnerabilityFinding[];
  scannedFiles: number;
  processingTime: number;
}

export interface ISecurityDetector {
  readonly name: string;
  readonly description: string;
  readonly supportedLanguages: string[];
  readonly owaspCategories: string[];
  
  detect(context: CodeContext, options?: ScanOptions): Promise<VulnerabilityFinding[]>;
  isApplicable(context: CodeContext): boolean;
}

