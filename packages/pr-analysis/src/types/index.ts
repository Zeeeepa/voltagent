/**
 * Core types for PR analysis modules
 */

export interface AnalysisResult {
  module: string;
  severity: 'low' | 'medium' | 'high';
  findings: Finding[];
  metadata?: {
    executionTime: number;
    filesAnalyzed: number;
    rulesApplied: string[];
  };
}

export interface Finding {
  type: string;
  file: string;
  line?: number;
  column?: number;
  message: string;
  rule?: string;
  severity: 'low' | 'medium' | 'high';
  autoFixable: boolean;
  suggestion?: string;
  context?: {
    variable?: string;
    function?: string;
    expected?: string;
    actual?: string;
  };
}

export interface AnalysisModule {
  name: string;
  version: string;
  analyze(files: FileInfo[]): Promise<AnalysisResult>;
  getConfiguration(): ModuleConfiguration;
}

export interface FileInfo {
  path: string;
  content: string;
  language: string;
  size: number;
  modified: boolean;
}

export interface ModuleConfiguration {
  enabled: boolean;
  rules: Record<string, any>;
  excludePatterns: string[];
  includePatterns: string[];
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'style' | 'naming' | 'documentation' | 'licensing' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high';
  autoFixable: boolean;
  languages: string[];
  pattern?: RegExp;
  validator?: (content: string, file: FileInfo) => Finding[];
}

export interface StyleGuide {
  name: string;
  language: string;
  rules: ComplianceRule[];
  extends?: string[];
}

