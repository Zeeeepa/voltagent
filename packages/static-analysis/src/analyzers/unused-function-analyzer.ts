import * as fs from "fs/promises";
import * as path from "path";
import type {
  AnalysisInput,
  UnusedFunctionAnalysisResult,
  FunctionDefinition,
  FunctionUsage,
  ImportExportMapping,
  UnusedFunctionFinding,
  CallGraph,
  CallGraphNode,
  Severity,
  SupportedLanguage,
  FunctionType,
} from "../types";
import { ParserFactory } from "../parsers";

/**
 * Analyzer for detecting unused functions across the codebase
 */
export class UnusedFunctionAnalyzer {
  private functionDefinitions: Map<string, FunctionDefinition[]> = new Map();
  private functionUsages: Map<string, FunctionUsage[]> = new Map();
  private importExportMappings: Map<string, ImportExportMapping[]> = new Map();
  private callGraph: CallGraph = { nodes: new Map(), entryPoints: new Set() };

  /**
   * Analyze codebase for unused functions
   */
  async analyze(input: AnalysisInput): Promise<UnusedFunctionAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Reset state
      this.reset();

      // Parse all files and extract function information
      await this.parseFiles(input);

      // Build call graph
      this.buildCallGraph();

      // Detect unused functions
      const findings = this.detectUnusedFunctions(input);

      // Calculate analysis metadata
      const totalFunctions = Array.from(this.functionDefinitions.values())
        .reduce((sum, funcs) => sum + funcs.length, 0);
      
      const filesAnalyzed = this.functionDefinitions.size;
      const analysisTime = Date.now() - startTime;
      const languagesAnalyzed = this.getAnalyzedLanguages();

      return {
        module: "unused_function_detection",
        severity: this.calculateOverallSeverity(findings),
        findings,
        metadata: {
          totalFunctions,
          filesAnalyzed,
          analysisTime,
          languagesAnalyzed,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Error during unused function analysis:", error);
      
      return {
        module: "unused_function_detection",
        severity: Severity.LOW,
        findings: [],
        metadata: {
          totalFunctions: 0,
          filesAnalyzed: 0,
          analysisTime: Date.now() - startTime,
          languagesAnalyzed: [],
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Reset analyzer state
   */
  private reset(): void {
    this.functionDefinitions.clear();
    this.functionUsages.clear();
    this.importExportMappings.clear();
    this.callGraph = { nodes: new Map(), entryPoints: new Set() };
  }

  /**
   * Parse all files and extract function information
   */
  private async parseFiles(input: AnalysisInput): Promise<void> {
    const { codebaseContext, config } = input;
    const filesToAnalyze = this.getFilesToAnalyze(codebaseContext.filePaths, config);

    const parsePromises = filesToAnalyze.map(async (filePath) => {
      try {
        const fullPath = path.resolve(codebaseContext.rootPath, filePath);
        const content = await fs.readFile(fullPath, "utf-8");
        const parser = ParserFactory.getParserForFile(filePath);

        if (!parser) {
          return;
        }

        // Extract function definitions, usages, and import/export mappings
        const [definitions, usages, mappings] = await Promise.all([
          parser.extractFunctionDefinitions(filePath, content),
          parser.extractFunctionUsages(filePath, content),
          parser.extractImportExportMappings(filePath, content),
        ]);

        this.functionDefinitions.set(filePath, definitions);
        this.functionUsages.set(filePath, usages);
        this.importExportMappings.set(filePath, mappings);
      } catch (error) {
        console.warn(`Failed to parse file ${filePath}:`, error);
      }
    });

    await Promise.all(parsePromises);
  }

  /**
   * Filter files to analyze based on configuration
   */
  private getFilesToAnalyze(filePaths: string[], config: any): string[] {
    return filePaths.filter((filePath) => {
      // Check if file is supported
      if (!ParserFactory.isFileSupported(filePath)) {
        return false;
      }

      // Check include patterns
      if (config.includePatterns?.length > 0) {
        const included = config.includePatterns.some((pattern: string) =>
          this.matchesPattern(filePath, pattern)
        );
        if (!included) return false;
      }

      // Check exclude patterns
      if (config.excludePatterns?.length > 0) {
        const excluded = config.excludePatterns.some((pattern: string) =>
          this.matchesPattern(filePath, pattern)
        );
        if (excluded) return false;
      }

      // Check if should include test files
      if (!config.includeTests && this.isTestFile(filePath)) {
        return false;
      }

      // Check if should include node_modules
      if (!config.includeNodeModules && filePath.includes("node_modules")) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if a file path matches a pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regex = new RegExp(
      pattern
        .replace(/\\./g, "\\\\.")
        .replace(/\\*/g, ".*")
        .replace(/\\?/g, ".")
    );
    return regex.test(filePath);
  }

  /**
   * Check if a file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\\.test\\./,
      /\\.spec\\./,
      /_test\\./,
      /test_.*\\./,
      /tests?\\//,
      /__tests?__\\//,
    ];
    return testPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Build call graph from function definitions and usages
   */
  private buildCallGraph(): void {
    // Initialize nodes for all function definitions
    for (const [filePath, definitions] of this.functionDefinitions) {
      for (const func of definitions) {
        const key = this.getFunctionKey(func.name, func.file);
        this.callGraph.nodes.set(key, {
          name: func.name,
          file: func.file,
          calls: [],
          calledBy: [],
          isEntryPoint: func.isExported || func.isDefaultExport,
        });

        if (func.isExported || func.isDefaultExport) {
          this.callGraph.entryPoints.add(key);
        }
      }
    }

    // Build call relationships
    for (const [filePath, usages] of this.functionUsages) {
      for (const usage of usages) {
        const callerContext = this.findCallerFunction(usage);
        if (callerContext) {
          const callerKey = this.getFunctionKey(callerContext.name, callerContext.file);
          const calleeKey = this.findCalleeFunction(usage);

          if (calleeKey) {
            const callerNode = this.callGraph.nodes.get(callerKey);
            const calleeNode = this.callGraph.nodes.get(calleeKey);

            if (callerNode && calleeNode) {
              if (!callerNode.calls.includes(calleeKey)) {
                callerNode.calls.push(calleeKey);
              }
              if (!calleeNode.calledBy.includes(callerKey)) {
                calleeNode.calledBy.push(callerKey);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Find the function that contains a usage
   */
  private findCallerFunction(usage: FunctionUsage): FunctionDefinition | null {
    const definitions = this.functionDefinitions.get(usage.file) || [];
    
    // Find the function that contains this usage based on line numbers
    for (const func of definitions) {
      if (func.line <= usage.line) {
        // This is a simple heuristic - in practice, you'd need proper scope analysis
        return func;
      }
    }
    
    return null;
  }

  /**
   * Find the function being called
   */
  private findCalleeFunction(usage: FunctionUsage): string | null {
    // First, look in the same file
    const localDefinitions = this.functionDefinitions.get(usage.file) || [];
    const localFunc = localDefinitions.find(func => func.name === usage.functionName);
    
    if (localFunc) {
      return this.getFunctionKey(localFunc.name, localFunc.file);
    }

    // Then, look in imported files
    const imports = this.importExportMappings.get(usage.file) || [];
    for (const importMapping of imports) {
      if (importMapping.symbols.includes(usage.functionName)) {
        // Try to resolve the imported function
        const targetDefinitions = this.functionDefinitions.get(importMapping.target) || [];
        const targetFunc = targetDefinitions.find(func => func.name === usage.functionName);
        
        if (targetFunc) {
          return this.getFunctionKey(targetFunc.name, targetFunc.file);
        }
      }
    }

    return null;
  }

  /**
   * Generate a unique key for a function
   */
  private getFunctionKey(name: string, file: string): string {
    return `${file}:${name}`;
  }

  /**
   * Detect unused functions using call graph analysis
   */
  private detectUnusedFunctions(input: AnalysisInput): UnusedFunctionFinding[] {
    const findings: UnusedFunctionFinding[] = [];
    const visited = new Set<string>();

    // Mark all reachable functions starting from entry points
    for (const entryPoint of this.callGraph.entryPoints) {
      this.markReachable(entryPoint, visited);
    }

    // Find unreachable functions
    for (const [key, node] of this.callGraph.nodes) {
      if (!visited.has(key)) {
        const func = this.findFunctionDefinition(node.name, node.file);
        if (func) {
          const confidence = this.calculateConfidence(func, node);
          
          if (confidence >= input.config.confidenceThreshold) {
            findings.push({
              file: func.file,
              function: func.name,
              line: func.line,
              type: func.type,
              confidence,
              suggestion: this.generateSuggestion(func),
              context: this.generateContext(func, node),
            });
          }
        }
      }
    }

    return findings;
  }

  /**
   * Mark all functions reachable from a given function
   */
  private markReachable(functionKey: string, visited: Set<string>): void {
    if (visited.has(functionKey)) {
      return;
    }

    visited.add(functionKey);
    const node = this.callGraph.nodes.get(functionKey);
    
    if (node) {
      for (const calledFunction of node.calls) {
        this.markReachable(calledFunction, visited);
      }
    }
  }

  /**
   * Find function definition by name and file
   */
  private findFunctionDefinition(name: string, file: string): FunctionDefinition | null {
    const definitions = this.functionDefinitions.get(file) || [];
    return definitions.find(func => func.name === name) || null;
  }

  /**
   * Calculate confidence that a function is truly unused
   */
  private calculateConfidence(func: FunctionDefinition, node: CallGraphNode): number {
    let confidence = 0.8; // Base confidence

    // Increase confidence for private functions
    if (func.type === FunctionType.PRIVATE_METHOD || func.name.startsWith("_")) {
      confidence += 0.1;
    }

    // Decrease confidence for exported functions (might be used externally)
    if (func.isExported || func.isDefaultExport) {
      confidence -= 0.3;
    }

    // Decrease confidence for functions with documentation (likely intentional)
    if (func.documentation) {
      confidence -= 0.1;
    }

    // Increase confidence if no callers found
    if (node.calledBy.length === 0) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate suggestion for unused function
   */
  private generateSuggestion(func: FunctionDefinition): string {
    if (func.isExported || func.isDefaultExport) {
      return "Consider removing export if function is not used externally, or remove function entirely";
    }
    
    if (func.documentation) {
      return "Remove unused function or verify if it should be called somewhere";
    }
    
    return "Remove unused function or add usage";
  }

  /**
   * Generate context information for the finding
   */
  private generateContext(func: FunctionDefinition, node: CallGraphNode): string {
    const parts: string[] = [];
    
    if (func.scope) {
      parts.push(`in ${func.scope}`);
    }
    
    if (func.signature) {
      parts.push(`signature: ${func.signature}`);
    }
    
    if (node.calls.length > 0) {
      parts.push(`calls ${node.calls.length} other function(s)`);
    }
    
    return parts.join(", ");
  }

  /**
   * Calculate overall severity based on findings
   */
  private calculateOverallSeverity(findings: UnusedFunctionFinding[]): Severity {
    if (findings.length === 0) {
      return Severity.LOW;
    }
    
    const highConfidenceFindings = findings.filter(f => f.confidence > 0.8);
    const exportedFindings = findings.filter(f => f.type === FunctionType.PUBLIC_FUNCTION);
    
    if (highConfidenceFindings.length > 10 || exportedFindings.length > 5) {
      return Severity.HIGH;
    }
    
    if (highConfidenceFindings.length > 5 || exportedFindings.length > 2) {
      return Severity.MEDIUM;
    }
    
    return Severity.LOW;
  }

  /**
   * Get languages that were analyzed
   */
  private getAnalyzedLanguages(): SupportedLanguage[] {
    const languages = new Set<SupportedLanguage>();
    
    for (const filePath of this.functionDefinitions.keys()) {
      const parser = ParserFactory.getParserForFile(filePath);
      if (parser) {
        languages.add(parser.language);
      }
    }
    
    return Array.from(languages);
  }
}

