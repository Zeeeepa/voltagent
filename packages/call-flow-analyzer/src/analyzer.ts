import * as fs from "fs";
import * as path from "path";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { parse as parseTypeScript } from "@typescript-eslint/typescript-estree";
import {
  CallFlowAnalyzerConfig,
  CallFlowAnalysisResult,
  CallGraph,
  CallNode,
  CallEdge,
  AnalysisFinding,
  FindingType,
  Severity,
  UnreachableReason,
  AnalysisContext,
  ExecutionPath,
  PerformanceBottleneck,
  DEFAULT_CONFIG,
} from "./types";

/**
 * Main call flow analyzer class
 */
export class CallFlowAnalyzer {
  private config: CallFlowAnalyzerConfig;
  private callGraph: CallGraph;
  private analysisStartTime: number = 0;
  private filesAnalyzed: number = 0;
  private functionsAnalyzed: number = 0;

  constructor(config: Partial<CallFlowAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callGraph = {
      nodes: new Map(),
      edges: [],
      entryPoints: [],
      unreachableNodes: [],
    };
  }

  /**
   * Analyze a directory or file for call flow patterns
   */
  public async analyze(targetPath: string): Promise<CallFlowAnalysisResult> {
    this.analysisStartTime = Date.now();
    this.resetAnalysis();

    const files = await this.collectFiles(targetPath);
    const context: AnalysisContext = {
      currentFile: "",
      callStack: [],
      visitedNodes: new Set(),
      findings: [],
      callGraph: this.callGraph,
      config: this.config,
    };

    // Phase 1: Build call graph
    for (const file of files) {
      await this.analyzeFile(file, context);
    }

    // Phase 2: Analyze call flows and detect issues
    this.detectUnreachableCode(context);
    this.analyzeCallChains(context);
    this.detectPerformanceBottlenecks(context);
    this.detectCircularDependencies(context);

    // Phase 3: Generate results
    return this.generateResults(context);
  }

  /**
   * Reset analysis state
   */
  private resetAnalysis(): void {
    this.callGraph = {
      nodes: new Map(),
      edges: [],
      entryPoints: [],
      unreachableNodes: [],
    };
    this.filesAnalyzed = 0;
    this.functionsAnalyzed = 0;
  }

  /**
   * Collect files to analyze
   */
  private async collectFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const stats = await fs.promises.stat(targetPath);

    if (stats.isFile()) {
      if (this.isAnalyzableFile(targetPath)) {
        files.push(targetPath);
      }
    } else if (stats.isDirectory()) {
      const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name);
        
        if (entry.isDirectory() && !this.isExcluded(fullPath)) {
          const subFiles = await this.collectFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isAnalyzableFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Check if file should be analyzed
   */
  private isAnalyzableFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"].includes(ext) && !this.isExcluded(filePath);
  }

  /**
   * Check if path is excluded
   */
  private isExcluded(filePath: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      // Simple glob pattern matching
      const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
      return regex.test(filePath);
    });
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string, context: AnalysisContext): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, "utf-8");
      context.currentFile = filePath;
      this.filesAnalyzed++;

      const isTypeScript = /\.tsx?$/.test(filePath);
      
      if (isTypeScript) {
        await this.analyzeTypeScriptFile(content, filePath, context);
      } else {
        await this.analyzeJavaScriptFile(content, filePath, context);
      }
    } catch (error) {
      console.warn(`Failed to analyze file ${filePath}:`, error);
    }
  }

  /**
   * Analyze JavaScript file using Babel
   */
  private async analyzeJavaScriptFile(content: string, filePath: string, context: AnalysisContext): Promise<void> {
    try {
      const ast = parse(content, {
        sourceType: "module",
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          "jsx",
          "typescript",
          "decorators-legacy",
          "classProperties",
          "objectRestSpread",
          "asyncGenerators",
          "functionBind",
          "exportDefaultFrom",
          "exportNamespaceFrom",
          "dynamicImport",
          "nullishCoalescingOperator",
          "optionalChaining",
        ],
      });

      traverse(ast, {
        Function: (path) => this.processFunctionNode(path, filePath, context),
        CallExpression: (path) => this.processCallExpression(path, filePath, context),
        ConditionalExpression: (path) => this.processConditionalExpression(path, filePath, context),
        IfStatement: (path) => this.processIfStatement(path, filePath, context),
        ReturnStatement: (path) => this.processReturnStatement(path, filePath, context),
      });
    } catch (error) {
      console.warn(`Failed to parse JavaScript file ${filePath}:`, error);
    }
  }

  /**
   * Analyze TypeScript file
   */
  private async analyzeTypeScriptFile(content: string, filePath: string, context: AnalysisContext): Promise<void> {
    try {
      const ast = parseTypeScript(content, {
        loc: true,
        range: true,
        tokens: true,
        comment: true,
        jsx: filePath.endsWith(".tsx"),
      });

      // Convert TypeScript AST to analysis format
      this.traverseTypeScriptAST(ast, filePath, context);
    } catch (error) {
      console.warn(`Failed to parse TypeScript file ${filePath}:`, error);
    }
  }

  /**
   * Process function declarations and expressions
   */
  private processFunctionNode(path: NodePath<t.Function>, filePath: string, context: AnalysisContext): void {
    const node = path.node;
    const loc = node.loc;
    
    if (!loc) return;

    const functionName = this.getFunctionName(node, path);
    const functionId = `${filePath}:${functionName}:${loc.start.line}`;

    const callNode: CallNode = {
      id: functionId,
      name: functionName,
      file: filePath,
      line: loc.start.line,
      column: loc.start.column,
      type: this.getFunctionType(node),
      parameters: this.extractParameters(node),
      isExported: this.isExported(path),
      isAsync: node.async || false,
      complexity: this.calculateComplexity(path),
    };

    this.callGraph.nodes.set(functionId, callNode);
    this.functionsAnalyzed++;

    // Check if this is an entry point
    if (this.isEntryPoint(functionName, path)) {
      this.callGraph.entryPoints.push(functionId);
    }
  }

  /**
   * Process function calls
   */
  private processCallExpression(path: NodePath<t.CallExpression>, filePath: string, context: AnalysisContext): void {
    const node = path.node;
    const loc = node.loc;
    
    if (!loc) return;

    const callerFunction = this.findContainingFunction(path);
    const calledFunction = this.getCalledFunctionName(node);

    if (callerFunction && calledFunction) {
      const edge: CallEdge = {
        from: callerFunction,
        to: calledFunction,
        file: filePath,
        line: loc.start.line,
        callType: this.getCallType(path),
        weight: 1, // Could be enhanced with dynamic analysis
      };

      this.callGraph.edges.push(edge);
    }
  }

  /**
   * Process conditional expressions for unreachable code detection
   */
  private processConditionalExpression(path: NodePath<t.ConditionalExpression>, filePath: string, context: AnalysisContext): void {
    const test = path.node.test;
    
    if (this.isAlwaysTrue(test)) {
      this.addUnreachableCodeFinding(
        path.node.alternate,
        filePath,
        UnreachableReason.CONDITION_NEVER_FALSE,
        "Conditional expression test is always true",
        context
      );
    } else if (this.isAlwaysFalse(test)) {
      this.addUnreachableCodeFinding(
        path.node.consequent,
        filePath,
        UnreachableReason.CONDITION_NEVER_TRUE,
        "Conditional expression test is always false",
        context
      );
    }
  }

  /**
   * Process if statements for unreachable code detection
   */
  private processIfStatement(path: NodePath<t.IfStatement>, filePath: string, context: AnalysisContext): void {
    const test = path.node.test;
    
    if (this.isAlwaysTrue(test)) {
      if (path.node.alternate) {
        this.addUnreachableCodeFinding(
          path.node.alternate,
          filePath,
          UnreachableReason.CONDITION_NEVER_FALSE,
          "If statement condition is always true",
          context
        );
      }
    } else if (this.isAlwaysFalse(test)) {
      this.addUnreachableCodeFinding(
        path.node.consequent,
        filePath,
        UnreachableReason.CONDITION_NEVER_TRUE,
        "If statement condition is always false",
        context
      );
    }
  }

  /**
   * Process return statements for early return detection
   */
  private processReturnStatement(path: NodePath<t.ReturnStatement>, filePath: string, context: AnalysisContext): void {
    const functionPath = path.getFunctionParent();
    if (!functionPath) return;

    const siblings = functionPath.get("body.body") as NodePath[];
    if (!Array.isArray(siblings)) return;

    const returnIndex = siblings.findIndex(sibling => sibling.node === path.node);
    if (returnIndex === -1 || returnIndex === siblings.length - 1) return;

    // Check if there are unreachable statements after this return
    const unreachableStatements = siblings.slice(returnIndex + 1);
    if (unreachableStatements.length > 0) {
      const firstUnreachable = unreachableStatements[0];
      const lastUnreachable = unreachableStatements[unreachableStatements.length - 1];
      
      if (firstUnreachable.node.loc && lastUnreachable.node.loc) {
        const finding: AnalysisFinding = {
          type: FindingType.UNREACHABLE_CODE,
          file: filePath,
          function: this.findContainingFunction(path) || "unknown",
          lines: `${firstUnreachable.node.loc.start.line}-${lastUnreachable.node.loc.end.line}`,
          reason: UnreachableReason.EARLY_RETURN,
          suggestion: "Remove unreachable code after return statement",
          confidence: 0.95,
        };

        context.findings.push(finding);
      }
    }
  }

  /**
   * Traverse TypeScript AST (simplified implementation)
   */
  private traverseTypeScriptAST(ast: any, filePath: string, context: AnalysisContext): void {
    // This would need a more sophisticated implementation
    // For now, we'll focus on the Babel-based analysis
    console.log(`TypeScript analysis for ${filePath} - placeholder implementation`);
  }

  /**
   * Detect unreachable code patterns
   */
  private detectUnreachableCode(context: AnalysisContext): void {
    // Additional unreachable code detection logic
    // This could include more sophisticated analysis like:
    // - Dead code after throw statements
    // - Unreachable catch blocks
    // - Dead branches in switch statements
  }

  /**
   * Analyze call chains and execution paths
   */
  private analyzeCallChains(context: AnalysisContext): void {
    for (const entryPoint of this.callGraph.entryPoints) {
      const paths = this.findExecutionPaths(entryPoint, context);
      
      // Analyze each path for bottlenecks and optimization opportunities
      for (const path of paths) {
        this.analyzeExecutionPath(path, context);
      }
    }
  }

  /**
   * Find all execution paths from an entry point
   */
  private findExecutionPaths(entryPoint: string, context: AnalysisContext): ExecutionPath[] {
    const paths: ExecutionPath[] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: string, currentPath: string[], depth: number): void => {
      if (depth > this.config.maxCallDepth || visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      const newPath = [...currentPath, nodeId];

      // Find outgoing edges
      const outgoingEdges = this.callGraph.edges.filter(edge => edge.from === nodeId);
      
      if (outgoingEdges.length === 0) {
        // Leaf node - complete path
        paths.push({
          id: `path_${paths.length}`,
          nodes: newPath,
          depth,
          isComplete: true,
          hasLoop: this.hasLoop(newPath),
        });
      } else {
        for (const edge of outgoingEdges) {
          dfs(edge.to, newPath, depth + 1);
        }
      }

      visited.delete(nodeId);
    };

    dfs(entryPoint, [], 0);
    return paths;
  }

  /**
   * Analyze a specific execution path
   */
  private analyzeExecutionPath(path: ExecutionPath, context: AnalysisContext): void {
    // Analyze path for performance characteristics
    // This could include:
    // - Identifying CPU-intensive operations
    // - Detecting I/O bottlenecks
    // - Finding memory allocation patterns
  }

  /**
   * Detect performance bottlenecks
   */
  private detectPerformanceBottlenecks(context: AnalysisContext): void {
    for (const [nodeId, node] of this.callGraph.nodes) {
      if (node.complexity > 10) {
        const finding: AnalysisFinding = {
          type: FindingType.PERFORMANCE_BOTTLENECK,
          file: node.file,
          function: node.name,
          lines: node.line.toString(),
          suggestion: `Function has high complexity (${node.complexity}). Consider refactoring.`,
          confidence: 0.8,
        };

        context.findings.push(finding);
      }
    }
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(context: AnalysisContext): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        
        const finding: AnalysisFinding = {
          type: FindingType.CIRCULAR_DEPENDENCY,
          file: this.callGraph.nodes.get(nodeId)?.file || "unknown",
          function: this.callGraph.nodes.get(nodeId)?.name || "unknown",
          suggestion: `Circular dependency detected: ${cycle.join(" -> ")}`,
          confidence: 0.9,
        };

        context.findings.push(finding);
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = this.callGraph.edges.filter(edge => edge.from === nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.to, [...path, nodeId]);
      }

      recursionStack.delete(nodeId);
    };

    for (const entryPoint of this.callGraph.entryPoints) {
      dfs(entryPoint, []);
    }
  }

  /**
   * Generate final analysis results
   */
  private generateResults(context: AnalysisContext): CallFlowAnalysisResult {
    const analysisEndTime = Date.now();
    const duration = analysisEndTime - this.analysisStartTime;

    // Calculate statistics
    const totalLines = this.calculateTotalLines();
    const executableLines = this.calculateExecutableLines();
    const unreachableLines = this.calculateUnreachableLines(context);

    // Determine overall severity
    const severity = this.calculateOverallSeverity(context.findings);

    return {
      module: "call_flow_mapping",
      severity,
      timestamp: new Date().toISOString(),
      analysis_duration_ms: duration,
      files_analyzed: this.filesAnalyzed,
      functions_analyzed: this.functionsAnalyzed,
      findings: context.findings,
      statistics: {
        total_lines: totalLines,
        executable_lines: executableLines,
        unreachable_lines: unreachableLines,
        coverage_percentage: executableLines > 0 ? ((executableLines - unreachableLines) / executableLines) * 100 : 100,
      },
    };
  }

  // Helper methods

  private getFunctionName(node: t.Function, path: NodePath<t.Function>): string {
    if (t.isFunctionDeclaration(node) && node.id) {
      return node.id.name;
    }
    
    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
      const parent = path.parent;
      if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
        return parent.id.name;
      }
      if (t.isProperty(parent) && t.isIdentifier(parent.key)) {
        return parent.key.name;
      }
      if (t.isAssignmentExpression(parent) && t.isMemberExpression(parent.left)) {
        return `${parent.left.object}.${parent.left.property}`;
      }
    }

    return "anonymous";
  }

  private getFunctionType(node: t.Function): CallNode["type"] {
    if (t.isArrowFunctionExpression(node)) return "arrow";
    if (t.isFunctionExpression(node)) return "function";
    if (t.isFunctionDeclaration(node)) return "function";
    if (node.async) return "async";
    return "function";
  }

  private extractParameters(node: t.Function): string[] {
    return node.params.map(param => {
      if (t.isIdentifier(param)) return param.name;
      if (t.isPattern(param)) return "pattern";
      return "unknown";
    });
  }

  private isExported(path: NodePath<t.Function>): boolean {
    const program = path.findParent(p => p.isProgram());
    if (!program) return false;

    // Check if function is exported
    return path.isExportDefaultDeclaration() || 
           path.isExportNamedDeclaration() ||
           (path.isFunctionDeclaration() && path.node.id && 
            program.scope.hasBinding(path.node.id.name));
  }

  private calculateComplexity(path: NodePath<t.Function>): number {
    let complexity = 1; // Base complexity

    path.traverse({
      IfStatement: () => complexity++,
      ConditionalExpression: () => complexity++,
      LogicalExpression: () => complexity++,
      SwitchCase: () => complexity++,
      WhileStatement: () => complexity++,
      DoWhileStatement: () => complexity++,
      ForStatement: () => complexity++,
      ForInStatement: () => complexity++,
      ForOfStatement: () => complexity++,
      CatchClause: () => complexity++,
    });

    return complexity;
  }

  private isEntryPoint(functionName: string, path: NodePath<t.Function>): boolean {
    // Common entry point patterns
    const entryPointNames = ["main", "index", "start", "init", "run"];
    return entryPointNames.includes(functionName.toLowerCase()) || 
           this.isExported(path);
  }

  private findContainingFunction(path: NodePath): string | null {
    const functionPath = path.getFunctionParent();
    if (!functionPath) return null;

    const functionName = this.getFunctionName(functionPath.node, functionPath);
    const loc = functionPath.node.loc;
    if (!loc) return null;

    return `${path.hub.file.opts.filename}:${functionName}:${loc.start.line}`;
  }

  private getCalledFunctionName(node: t.CallExpression): string | null {
    const callee = node.callee;
    
    if (t.isIdentifier(callee)) {
      return callee.name;
    }
    
    if (t.isMemberExpression(callee)) {
      const object = callee.object;
      const property = callee.property;
      
      if (t.isIdentifier(object) && t.isIdentifier(property)) {
        return `${object.name}.${property.name}`;
      }
    }

    return null;
  }

  private getCallType(path: NodePath<t.CallExpression>): CallEdge["callType"] {
    const parent = path.parent;
    
    if (t.isIfStatement(parent) || t.isConditionalExpression(parent)) {
      return "conditional";
    }
    
    if (t.isWhileStatement(parent) || t.isForStatement(parent) || 
        t.isDoWhileStatement(parent) || t.isForInStatement(parent) || 
        t.isForOfStatement(parent)) {
      return "loop";
    }

    return "direct";
  }

  private isAlwaysTrue(node: t.Expression): boolean {
    if (t.isBooleanLiteral(node)) return node.value === true;
    if (t.isNumericLiteral(node)) return node.value !== 0;
    if (t.isStringLiteral(node)) return node.value !== "";
    return false;
  }

  private isAlwaysFalse(node: t.Expression): boolean {
    if (t.isBooleanLiteral(node)) return node.value === false;
    if (t.isNumericLiteral(node)) return node.value === 0;
    if (t.isStringLiteral(node)) return node.value === "";
    if (t.isNullLiteral(node) || t.isIdentifier(node, { name: "undefined" })) return true;
    return false;
  }

  private addUnreachableCodeFinding(
    node: t.Node,
    filePath: string,
    reason: UnreachableReason,
    description: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    const finding: AnalysisFinding = {
      type: FindingType.UNREACHABLE_CODE,
      file: filePath,
      function: context.currentFunction || "unknown",
      lines: `${node.loc.start.line}-${node.loc.end.line}`,
      reason,
      suggestion: `${description}. Consider removing or fixing the condition.`,
      confidence: 0.9,
    };

    context.findings.push(finding);
  }

  private hasLoop(path: string[]): boolean {
    const seen = new Set<string>();
    for (const node of path) {
      if (seen.has(node)) return true;
      seen.add(node);
    }
    return false;
  }

  private calculateTotalLines(): number {
    // This would need to be implemented based on the analyzed files
    return 0;
  }

  private calculateExecutableLines(): number {
    // This would need to be implemented based on the AST analysis
    return 0;
  }

  private calculateUnreachableLines(context: AnalysisContext): number {
    return context.findings
      .filter(f => f.type === FindingType.UNREACHABLE_CODE)
      .reduce((total, finding) => {
        if (finding.lines) {
          const [start, end] = finding.lines.split("-").map(Number);
          return total + (end ? end - start + 1 : 1);
        }
        return total + 1;
      }, 0);
  }

  private calculateOverallSeverity(findings: AnalysisFinding[]): Severity {
    if (findings.length === 0) return Severity.LOW;
    
    const hasHigh = findings.some(f => 
      f.type === FindingType.CIRCULAR_DEPENDENCY || 
      f.type === FindingType.PERFORMANCE_BOTTLENECK
    );
    
    if (hasHigh) return Severity.HIGH;
    
    const hasMedium = findings.some(f => 
      f.type === FindingType.UNREACHABLE_CODE || 
      f.type === FindingType.DEAD_CODE
    );
    
    return hasMedium ? Severity.MEDIUM : Severity.LOW;
  }
}

