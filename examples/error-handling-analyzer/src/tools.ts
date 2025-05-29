import { createTool } from "@voltagent/core";
import { z } from "zod";
import { ErrorHandlingAnalyzer } from "./analyzer";
import { CodeAnalysisInput, ErrorHandlingAnalysisResult } from "./types";
import * as fs from "fs";
import * as path from "path";

// Tool to analyze error handling in code files
export const analyzeErrorHandlingTool = createTool({
  name: "analyze_error_handling",
  description: "Analyzes error handling patterns and exception flows in code files to identify missing error handling, unhandled exceptions, and error propagation issues",
  parameters: z.object({
    files: z.array(z.object({
      path: z.string().describe("Path to the code file to analyze"),
      content: z.string().optional().describe("File content (if not provided, will read from file system)"),
      language: z.string().optional().describe("Programming language (auto-detected if not provided)")
    })).describe("Array of files to analyze"),
    analysis_depth: z.enum(["basic", "comprehensive", "deep"]).default("comprehensive").describe("Depth of analysis to perform"),
    project_type: z.string().optional().describe("Type of project (web, api, cli, etc.) for context-specific analysis")
  }),
  execute: async ({ files, analysis_depth, project_type }) => {
    try {
      const analyzer = new ErrorHandlingAnalyzer();
      
      // Prepare files for analysis
      const analysisFiles = await Promise.all(files.map(async (file) => {
        let content = file.content;
        
        // Read file content if not provided
        if (!content) {
          try {
            content = await fs.promises.readFile(file.path, 'utf-8');
          } catch (error) {
            throw new Error(`Failed to read file ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        return {
          path: file.path,
          content,
          language: file.language
        };
      }));

      const input: CodeAnalysisInput = {
        files: analysisFiles,
        project_type,
        analysis_depth
      };

      const result = await analyzer.analyzeCode(input);

      return {
        success: true,
        analysis: result,
        summary: `Analyzed ${result.analyzed_files.length} files and found ${result.total_findings} error handling issues`,
        recommendations: result.recommendations
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        analysis: null
      };
    }
  }
});

// Tool to analyze error handling in a directory
export const analyzeDirectoryErrorHandlingTool = createTool({
  name: "analyze_directory_error_handling",
  description: "Recursively analyzes error handling patterns in all code files within a directory",
  parameters: z.object({
    directory_path: z.string().describe("Path to the directory to analyze"),
    file_extensions: z.array(z.string()).default([".ts", ".js", ".py", ".go", ".java"]).describe("File extensions to include in analysis"),
    exclude_patterns: z.array(z.string()).default(["node_modules", ".git", "dist", "build", "__pycache__"]).describe("Patterns to exclude from analysis"),
    max_files: z.number().default(100).describe("Maximum number of files to analyze"),
    analysis_depth: z.enum(["basic", "comprehensive", "deep"]).default("comprehensive").describe("Depth of analysis to perform")
  }),
  execute: async ({ directory_path, file_extensions, exclude_patterns, max_files, analysis_depth }) => {
    try {
      const analyzer = new ErrorHandlingAnalyzer();
      
      // Find all code files in the directory
      const files = await findCodeFiles(directory_path, file_extensions, exclude_patterns, max_files);
      
      if (files.length === 0) {
        return {
          success: true,
          analysis: null,
          message: `No code files found in ${directory_path} with extensions ${file_extensions.join(', ')}`
        };
      }

      // Read file contents
      const analysisFiles = await Promise.all(files.map(async (filePath) => {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return {
          path: filePath,
          content,
          language: undefined // Will be auto-detected
        };
      }));

      const input: CodeAnalysisInput = {
        files: analysisFiles,
        analysis_depth
      };

      const result = await analyzer.analyzeCode(input);

      return {
        success: true,
        analysis: result,
        summary: `Analyzed ${result.analyzed_files.length} files in ${directory_path} and found ${result.total_findings} error handling issues`,
        files_analyzed: files,
        recommendations: result.recommendations
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        analysis: null
      };
    }
  }
});

// Tool to generate error handling report
export const generateErrorHandlingReportTool = createTool({
  name: "generate_error_handling_report",
  description: "Generates a comprehensive error handling analysis report in various formats",
  parameters: z.object({
    analysis_result: z.any().describe("Error handling analysis result from previous analysis"),
    format: z.enum(["json", "markdown", "html", "csv"]).default("markdown").describe("Output format for the report"),
    include_code_snippets: z.boolean().default(true).describe("Whether to include code snippets in the report"),
    group_by: z.enum(["file", "type", "severity"]).default("severity").describe("How to group findings in the report")
  }),
  execute: async ({ analysis_result, format, include_code_snippets, group_by }) => {
    try {
      const result = analysis_result as ErrorHandlingAnalysisResult;
      
      let report: string;
      
      switch (format) {
        case "json":
          report = JSON.stringify(result, null, 2);
          break;
        case "markdown":
          report = generateMarkdownReport(result, include_code_snippets, group_by);
          break;
        case "html":
          report = generateHtmlReport(result, include_code_snippets, group_by);
          break;
        case "csv":
          report = generateCsvReport(result);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return {
        success: true,
        report,
        format,
        summary: `Generated ${format.toUpperCase()} report with ${result.total_findings} findings`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        report: null
      };
    }
  }
});

// Helper function to find code files recursively
async function findCodeFiles(
  dirPath: string,
  extensions: string[],
  excludePatterns: string[],
  maxFiles: number
): Promise<string[]> {
  const files: string[] = [];
  
  async function walkDir(currentPath: string): Promise<void> {
    if (files.length >= maxFiles) return;
    
    const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(dirPath, fullPath);
      
      // Check if path should be excluded
      if (excludePatterns.some(pattern => relativePath.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await walkDir(dirPath);
  return files;
}

// Report generation functions
function generateMarkdownReport(
  result: ErrorHandlingAnalysisResult,
  includeCodeSnippets: boolean,
  groupBy: string
): string {
  let report = `# Error Handling Analysis Report\n\n`;
  report += `**Generated:** ${result.timestamp}\n`;
  report += `**Overall Severity:** ${result.severity.toUpperCase()}\n`;
  report += `**Files Analyzed:** ${result.analyzed_files.length}\n`;
  report += `**Total Findings:** ${result.total_findings}\n\n`;

  // Summary
  report += `## Summary\n\n`;
  report += `- Missing Error Handling: ${result.summary.missing_error_handling}\n`;
  report += `- Unhandled Exceptions: ${result.summary.unhandled_exceptions}\n`;
  report += `- Error Propagation Issues: ${result.summary.error_propagation_issues}\n`;
  report += `- Missing Recovery Mechanisms: ${result.summary.missing_recovery_mechanisms}\n`;
  report += `- Inadequate Logging: ${result.summary.inadequate_logging}\n`;
  report += `- Error Handling Coverage: ${result.summary.coverage_percentage}%\n\n`;

  // Recommendations
  if (result.recommendations.length > 0) {
    report += `## Recommendations\n\n`;
    result.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    report += `\n`;
  }

  // Findings
  report += `## Detailed Findings\n\n`;
  
  const groupedFindings = groupFindings(result.findings, groupBy);
  
  for (const [groupName, findings] of Object.entries(groupedFindings)) {
    report += `### ${groupName}\n\n`;
    
    findings.forEach((finding, index) => {
      report += `#### ${index + 1}. ${finding.type.replace(/_/g, ' ').toUpperCase()}\n`;
      report += `- **File:** ${finding.file}\n`;
      report += `- **Line:** ${finding.line}\n`;
      if (finding.function) report += `- **Function:** ${finding.function}\n`;
      if (finding.operation) report += `- **Operation:** ${finding.operation}\n`;
      report += `- **Severity:** ${finding.severity.toUpperCase()}\n`;
      report += `- **Suggestion:** ${finding.suggestion}\n`;
      if (finding.confidence) report += `- **Confidence:** ${Math.round(finding.confidence * 100)}%\n`;
      
      if (includeCodeSnippets && finding.code_snippet) {
        report += `\n**Code Snippet:**\n\`\`\`\n${finding.code_snippet}\n\`\`\`\n`;
      }
      
      report += `\n`;
    });
  }

  return report;
}

function generateHtmlReport(
  result: ErrorHandlingAnalysisResult,
  includeCodeSnippets: boolean,
  groupBy: string
): string {
  // Basic HTML report structure
  let html = `<!DOCTYPE html>
<html>
<head>
    <title>Error Handling Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .severity-critical { color: #d32f2f; }
        .severity-high { color: #f57c00; }
        .severity-medium { color: #fbc02d; }
        .severity-low { color: #388e3c; }
        .finding { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .code-snippet { background-color: #f5f5f5; padding: 10px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Error Handling Analysis Report</h1>
        <p><strong>Generated:</strong> ${result.timestamp}</p>
        <p><strong>Overall Severity:</strong> <span class="severity-${result.severity}">${result.severity.toUpperCase()}</span></p>
        <p><strong>Files Analyzed:</strong> ${result.analyzed_files.length}</p>
        <p><strong>Total Findings:</strong> ${result.total_findings}</p>
    </div>`;

  // Add summary and findings...
  html += `</body></html>`;
  
  return html;
}

function generateCsvReport(result: ErrorHandlingAnalysisResult): string {
  const headers = ["File", "Line", "Type", "Severity", "Function", "Operation", "Suggestion", "Confidence"];
  let csv = headers.join(",") + "\n";
  
  result.findings.forEach(finding => {
    const row = [
      `"${finding.file}"`,
      finding.line.toString(),
      `"${finding.type}"`,
      `"${finding.severity}"`,
      `"${finding.function || ''}"`,
      `"${finding.operation || ''}"`,
      `"${finding.suggestion.replace(/"/g, '""')}"`,
      (finding.confidence || 0).toString()
    ];
    csv += row.join(",") + "\n";
  });
  
  return csv;
}

function groupFindings(findings: any[], groupBy: string): Record<string, any[]> {
  return findings.reduce((groups, finding) => {
    let key: string;
    
    switch (groupBy) {
      case "file":
        key = finding.file;
        break;
      case "type":
        key = finding.type.replace(/_/g, ' ').toUpperCase();
        break;
      case "severity":
        key = finding.severity.toUpperCase();
        break;
      default:
        key = "All Findings";
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(finding);
    
    return groups;
  }, {} as Record<string, any[]>);
}

