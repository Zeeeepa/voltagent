/**
 * VoltAgent tool for security vulnerability detection
 */

import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { SecurityAnalyzer } from './security-analyzer';
import { ScanOptions } from './types';

// Zod schema for scan options
const ScanOptionsSchema = z.object({
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  maxFileSize: z.number().optional(),
  enabledDetectors: z.array(z.string()).optional(),
  disabledDetectors: z.array(z.string()).optional(),
  confidenceThreshold: z.number().min(0).max(100).optional(),
  outputFormat: z.enum(['json', 'sarif', 'csv']).optional()
});

// Zod schema for file analysis
const FileAnalysisSchema = z.object({
  filePath: z.string().describe('Path to the file to analyze'),
  options: ScanOptionsSchema.optional().describe('Scan configuration options')
});

// Zod schema for content analysis
const ContentAnalysisSchema = z.object({
  content: z.string().describe('Source code content to analyze'),
  filePath: z.string().describe('Virtual file path for context (determines language)'),
  options: ScanOptionsSchema.optional().describe('Scan configuration options')
});

// Zod schema for directory analysis
const DirectoryAnalysisSchema = z.object({
  directoryPath: z.string().describe('Path to the directory to analyze'),
  options: ScanOptionsSchema.optional().describe('Scan configuration options')
});

/**
 * Tool for analyzing a single file for security vulnerabilities
 */
export const analyzeFileTool = createTool({
  name: 'analyze_file_security',
  description: 'Analyze a single file for security vulnerabilities using OWASP Top 10 patterns',
  parameters: FileAnalysisSchema,
  execute: async ({ filePath, options }) => {
    const analyzer = new SecurityAnalyzer();
    const result = await analyzer.analyzeFile(filePath, options as ScanOptions);
    
    return {
      success: true,
      result,
      summary: `Found ${result.total_vulnerabilities} vulnerabilities in ${result.total_files_scanned} file(s). Severity: ${result.severity}`
    };
  }
});

/**
 * Tool for analyzing source code content for security vulnerabilities
 */
export const analyzeContentTool = createTool({
  name: 'analyze_content_security',
  description: 'Analyze source code content for security vulnerabilities using OWASP Top 10 patterns',
  parameters: ContentAnalysisSchema,
  execute: async ({ content, filePath, options }) => {
    const analyzer = new SecurityAnalyzer();
    const result = await analyzer.analyzeContent(content, filePath, options as ScanOptions);
    
    return {
      success: true,
      result,
      summary: `Found ${result.total_vulnerabilities} vulnerabilities. Severity: ${result.severity}`
    };
  }
});

/**
 * Tool for analyzing a directory for security vulnerabilities
 */
export const analyzeDirectoryTool = createTool({
  name: 'analyze_directory_security',
  description: 'Analyze all files in a directory for security vulnerabilities using OWASP Top 10 patterns',
  parameters: DirectoryAnalysisSchema,
  execute: async ({ directoryPath, options }) => {
    const analyzer = new SecurityAnalyzer();
    const result = await analyzer.analyzeDirectory(directoryPath, options as ScanOptions);
    
    return {
      success: true,
      result,
      summary: `Scanned ${result.total_files_scanned} files and found ${result.total_vulnerabilities} vulnerabilities. Severity: ${result.severity}`
    };
  }
});

/**
 * Tool for getting security analysis patterns and configuration
 */
export const getSecurityPatternsTool = createTool({
  name: 'get_security_patterns',
  description: 'Get information about available security vulnerability detection patterns',
  parameters: z.object({
    category: z.string().optional().describe('Filter patterns by OWASP category (e.g., "A01:2021")')
  }),
  execute: async ({ category }) => {
    const analyzer = new SecurityAnalyzer();
    const detector = analyzer.getDetector('Pattern-based Security Detector');
    
    if (!detector) {
      return {
        success: false,
        error: 'Pattern detector not found'
      };
    }

    // Get patterns from the detector (assuming it has a getPatterns method)
    const patterns = (detector as any).getPatterns?.() || [];
    
    const filteredPatterns = category 
      ? patterns.filter((p: any) => p.owasp_category === category)
      : patterns;

    return {
      success: true,
      patterns: filteredPatterns.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: p.type,
        risk_level: p.risk_level,
        owasp_category: p.owasp_category,
        cwe_id: p.cwe_id,
        confidence: p.confidence,
        file_extensions: p.file_extensions
      })),
      total: filteredPatterns.length,
      owasp_categories: [...new Set(patterns.map((p: any) => p.owasp_category))].sort()
    };
  }
});

/**
 * Comprehensive security analysis toolkit
 */
export const securityAnalysisToolkit = {
  analyzeFile: analyzeFileTool,
  analyzeContent: analyzeContentTool,
  analyzeDirectory: analyzeDirectoryTool,
  getPatterns: getSecurityPatternsTool
};

// Export individual tools and toolkit
export {
  analyzeFileTool,
  analyzeContentTool,
  analyzeDirectoryTool,
  getSecurityPatternsTool
};

