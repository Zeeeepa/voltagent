/**
 * VoltAgent Security Analysis Module
 * 
 * A comprehensive security vulnerability detection module for the VoltAgent PR analysis system.
 * Implements OWASP Top 10 vulnerability detection with high accuracy and detailed reporting.
 */

// Core exports
export { SecurityAnalyzer } from './security-analyzer';

// Types and interfaces
export * from './types';

// Detectors
export { BaseSecurityDetector } from './detectors/base-detector';
export { PatternSecurityDetector } from './detectors/pattern-detector';

// Patterns
export { 
  OWASP_TOP_10_PATTERNS, 
  getPatternsByCategory, 
  getPatternsByType, 
  getPatternsByRiskLevel 
} from './patterns/owasp-patterns';

// Utilities
export { CodeParser } from './utils/code-parser';

// VoltAgent tools
export {
  analyzeFileTool,
  analyzeContentTool,
  analyzeDirectoryTool,
  getSecurityPatternsTool,
  securityAnalysisToolkit
} from './voltagent-tool';

// Version
export const VERSION = '0.1.0';

// Module metadata
export const MODULE_INFO = {
  name: 'security_vulnerability_detection',
  version: VERSION,
  description: 'Security vulnerability detection module for VoltAgent PR analysis system',
  author: 'VoltAgent Team',
  owasp_coverage: [
    'A01:2021', 'A02:2021', 'A03:2021', 'A04:2021', 'A05:2021',
    'A06:2021', 'A07:2021', 'A08:2021', 'A09:2021', 'A10:2021'
  ],
  supported_languages: [
    'javascript', 'typescript', 'python', 'java', 'csharp', 
    'php', 'go', 'ruby', 'cpp', 'c', 'rust', 'kotlin', 
    'swift', 'scala', 'shell', 'sql'
  ],
  vulnerability_types: [
    'sql_injection', 'xss_vulnerability', 'command_injection',
    'path_traversal', 'authentication_bypass', 'authorization_weakness',
    'insecure_crypto', 'hardcoded_secrets', 'insecure_deserialization',
    'xxe_vulnerability', 'csrf_vulnerability', 'open_redirect',
    'information_disclosure', 'dos_vulnerability', 'race_condition'
  ]
};

