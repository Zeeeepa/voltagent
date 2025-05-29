import { createTool } from "@voltagent/core";
import { z } from "zod";
import { CallFlowAnalyzer } from "./analyzer";
import { CallFlowAnalyzerConfig, DEFAULT_CONFIG } from "./types";
import * as path from "path";
import * as fs from "fs";

/**
 * Tool for analyzing call flows in a codebase
 */
export const analyzeCallFlowTool = createTool({
  name: "analyze_call_flow",
  description: "Analyze function call flows, detect unreachable code, and identify performance bottlenecks in a codebase",
  parameters: z.object({
    targetPath: z.string().describe("Path to the file or directory to analyze"),
    config: z.object({
      maxCallDepth: z.number().optional().describe("Maximum depth for call chain analysis (default: 50)"),
      includeExternalDeps: z.boolean().optional().describe("Whether to include external dependencies (default: false)"),
      excludePatterns: z.array(z.string()).optional().describe("File patterns to exclude from analysis"),
      enableDynamicTracing: z.boolean().optional().describe("Enable dynamic tracing (default: false)"),
      confidenceThreshold: z.number().min(0).max(1).optional().describe("Confidence threshold for reporting findings (default: 0.7)"),
      generateVisualization: z.boolean().optional().describe("Generate visualization data (default: true)"),
    }).optional().describe("Configuration options for the analyzer"),
  }),
  execute: async ({ targetPath, config = {} }) => {
    try {
      // Validate target path exists
      if (!fs.existsSync(targetPath)) {
        return {
          success: false,
          error: `Target path does not exist: ${targetPath}`,
        };
      }

      // Merge configuration with defaults
      const analyzerConfig: CallFlowAnalyzerConfig = {
        ...DEFAULT_CONFIG,
        ...config,
      };

      // Create analyzer instance
      const analyzer = new CallFlowAnalyzer(analyzerConfig);

      // Perform analysis
      const result = await analyzer.analyze(targetPath);

      return {
        success: true,
        result,
        summary: {
          filesAnalyzed: result.files_analyzed,
          functionsAnalyzed: result.functions_analyzed,
          findingsCount: result.findings.length,
          severity: result.severity,
          analysisTime: `${result.analysis_duration_ms}ms`,
          coveragePercentage: `${result.statistics.coverage_percentage.toFixed(2)}%`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Tool for analyzing a specific file's call flow
 */
export const analyzeFileCallFlowTool = createTool({
  name: "analyze_file_call_flow",
  description: "Analyze function call flows for a specific file",
  parameters: z.object({
    filePath: z.string().describe("Path to the specific file to analyze"),
    functionName: z.string().optional().describe("Specific function to focus analysis on"),
    maxDepth: z.number().optional().describe("Maximum call depth to analyze (default: 20)"),
  }),
  execute: async ({ filePath, functionName, maxDepth = 20 }) => {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File does not exist: ${filePath}`,
        };
      }

      const config: CallFlowAnalyzerConfig = {
        ...DEFAULT_CONFIG,
        maxCallDepth: maxDepth,
        excludePatterns: [], // Don't exclude anything for single file analysis
      };

      const analyzer = new CallFlowAnalyzer(config);
      const result = await analyzer.analyze(filePath);

      // Filter results if specific function requested
      let filteredFindings = result.findings;
      if (functionName) {
        filteredFindings = result.findings.filter(
          finding => finding.function === functionName
        );
      }

      return {
        success: true,
        result: {
          ...result,
          findings: filteredFindings,
        },
        summary: {
          file: path.basename(filePath),
          functionsAnalyzed: result.functions_analyzed,
          findingsCount: filteredFindings.length,
          focusFunction: functionName || "all",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `File analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Tool for detecting unreachable code specifically
 */
export const detectUnreachableCodeTool = createTool({
  name: "detect_unreachable_code",
  description: "Specifically detect unreachable code patterns in a codebase",
  parameters: z.object({
    targetPath: z.string().describe("Path to analyze for unreachable code"),
    confidenceThreshold: z.number().min(0).max(1).optional().describe("Minimum confidence level for reporting (default: 0.8)"),
  }),
  execute: async ({ targetPath, confidenceThreshold = 0.8 }) => {
    try {
      if (!fs.existsSync(targetPath)) {
        return {
          success: false,
          error: `Target path does not exist: ${targetPath}`,
        };
      }

      const config: CallFlowAnalyzerConfig = {
        ...DEFAULT_CONFIG,
        confidenceThreshold,
      };

      const analyzer = new CallFlowAnalyzer(config);
      const result = await analyzer.analyze(targetPath);

      // Filter for unreachable code findings only
      const unreachableFindings = result.findings.filter(
        finding => finding.type === "unreachable_code" && 
                  (finding.confidence || 1) >= confidenceThreshold
      );

      return {
        success: true,
        unreachableCode: unreachableFindings,
        summary: {
          totalFindings: unreachableFindings.length,
          unreachableLines: result.statistics.unreachable_lines,
          affectedFiles: [...new Set(unreachableFindings.map(f => f.file))].length,
          suggestions: unreachableFindings.map(f => f.suggestion),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Unreachable code detection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Tool for performance bottleneck analysis
 */
export const analyzePerformanceBottlenecksTool = createTool({
  name: "analyze_performance_bottlenecks",
  description: "Analyze code for performance bottlenecks and optimization opportunities",
  parameters: z.object({
    targetPath: z.string().describe("Path to analyze for performance issues"),
    complexityThreshold: z.number().optional().describe("Complexity threshold for flagging functions (default: 10)"),
  }),
  execute: async ({ targetPath, complexityThreshold = 10 }) => {
    try {
      if (!fs.existsSync(targetPath)) {
        return {
          success: false,
          error: `Target path does not exist: ${targetPath}`,
        };
      }

      const analyzer = new CallFlowAnalyzer(DEFAULT_CONFIG);
      const result = await analyzer.analyze(targetPath);

      // Filter for performance-related findings
      const performanceFindings = result.findings.filter(
        finding => finding.type === "performance_bottleneck"
      );

      // Extract optimization opportunities from call chain analysis
      const optimizationOpportunities = result.call_chain_analysis?.optimization_opportunities || [];

      return {
        success: true,
        bottlenecks: performanceFindings,
        optimizationOpportunities,
        summary: {
          bottleneckCount: performanceFindings.length,
          optimizationCount: optimizationOpportunities.length,
          affectedFiles: [...new Set(performanceFindings.map(f => f.file))].length,
          recommendations: performanceFindings.map(f => f.suggestion),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Performance analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Tool for generating call flow visualization data
 */
export const generateCallFlowVisualizationTool = createTool({
  name: "generate_call_flow_visualization",
  description: "Generate visualization data for function call flows",
  parameters: z.object({
    targetPath: z.string().describe("Path to analyze for visualization"),
    format: z.enum(["mermaid", "graphviz", "json"]).optional().describe("Output format for visualization (default: json)"),
    maxNodes: z.number().optional().describe("Maximum number of nodes to include (default: 50)"),
  }),
  execute: async ({ targetPath, format = "json", maxNodes = 50 }) => {
    try {
      if (!fs.existsSync(targetPath)) {
        return {
          success: false,
          error: `Target path does not exist: ${targetPath}`,
        };
      }

      const config: CallFlowAnalyzerConfig = {
        ...DEFAULT_CONFIG,
        generateVisualization: true,
      };

      const analyzer = new CallFlowAnalyzer(config);
      const result = await analyzer.analyze(targetPath);

      // Generate visualization data based on format
      let visualizationData: any;

      switch (format) {
        case "mermaid":
          visualizationData = generateMermaidDiagram(result, maxNodes);
          break;
        case "graphviz":
          visualizationData = generateGraphvizDot(result, maxNodes);
          break;
        default:
          visualizationData = generateJsonVisualization(result, maxNodes);
      }

      return {
        success: true,
        visualization: visualizationData,
        format,
        summary: {
          totalFunctions: result.functions_analyzed,
          visualizedNodes: Math.min(result.functions_analyzed, maxNodes),
          entryPoints: result.call_chain_analysis?.entry_point ? 1 : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Visualization generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Helper functions for visualization generation

function generateMermaidDiagram(result: any, maxNodes: number): string {
  let mermaid = "graph TD\n";
  
  // Add nodes and edges (simplified implementation)
  const findings = result.findings.slice(0, maxNodes);
  findings.forEach((finding: any, index: number) => {
    if (finding.function) {
      mermaid += `    ${index}[${finding.function}]\n`;
    }
  });

  return mermaid;
}

function generateGraphvizDot(result: any, maxNodes: number): string {
  let dot = "digraph CallFlow {\n";
  dot += "  rankdir=TB;\n";
  dot += "  node [shape=box];\n";
  
  // Add nodes and edges (simplified implementation)
  const findings = result.findings.slice(0, maxNodes);
  findings.forEach((finding: any, index: number) => {
    if (finding.function) {
      dot += `  "${finding.function}" [label="${finding.function}"];\n`;
    }
  });

  dot += "}";
  return dot;
}

function generateJsonVisualization(result: any, maxNodes: number): object {
  return {
    nodes: result.findings.slice(0, maxNodes).map((finding: any, index: number) => ({
      id: index,
      label: finding.function || "unknown",
      file: finding.file,
      type: finding.type,
    })),
    edges: [],
    metadata: {
      totalFindings: result.findings.length,
      analysisTime: result.analysis_duration_ms,
      coverage: result.statistics.coverage_percentage,
    },
  };
}

