import * as ts from "typescript";
import {
  DataFlowAnalysisResult,
  DataFlowAnalysisInput,
  DataFlowAnalysisConfig,
  DataFlowFinding,
  DataFlowIssueType,
  AnalysisSeverity,
  Location,
  VariableInfo,
  ConcurrentAccess
} from "./types";

/**
 * Variable declaration and usage tracking
 */
interface VariableDeclaration {
  name: string;
  type?: string;
  scope: string;
  declaration: Location;
  usages: Location[];
  initialized: boolean;
  assigned: boolean;
  accessed: boolean;
  node: ts.Node;
}

/**
 * Scope information for tracking variable lifecycles
 */
interface ScopeInfo {
  type: 'global' | 'function' | 'block' | 'class' | 'module';
  name: string;
  variables: Map<string, VariableDeclaration>;
  parent?: ScopeInfo;
  children: ScopeInfo[];
}

/**
 * Data flow and variable tracking analyzer
 */
export class DataFlowTracker {
  private sourceFile: ts.SourceFile | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private program: ts.Program | null = null;
  private findings: DataFlowFinding[] = [];
  private variables: Map<string, VariableDeclaration> = new Map();
  private scopes: ScopeInfo[] = [];
  private currentScope: ScopeInfo | null = null;
  private config: DataFlowAnalysisConfig;
  private fileName: string = "";

  constructor(config?: Partial<DataFlowAnalysisConfig>) {
    this.config = {
      enableUninitializedVariableDetection: true,
      enableUnusedVariableDetection: true,
      enableDataRaceDetection: true,
      enableMemoryLeakDetection: true,
      enableScopeViolationDetection: true,
      enableNullPointerDetection: true,
      enableTypeChecking: true,
      maxFileSizeKB: 1024,
      excludePatterns: [],
      includePatterns: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
      strictMode: false,
      confidenceThreshold: 0.7,
      ...config
    };
  }

  /**
   * Analyze data flow for given input
   */
  async analyze(input: DataFlowAnalysisInput): Promise<DataFlowAnalysisResult> {
    const startTime = Date.now();
    this.findings = [];
    this.variables.clear();
    this.scopes = [];

    let filesAnalyzed = 0;
    let variablesTracked = 0;

    for (const file of input.files) {
      if (this.shouldAnalyzeFile(file.path)) {
        await this.analyzeFile(file.path, file.content);
        filesAnalyzed++;
        variablesTracked += this.variables.size;
      }
    }

    const analysisTime = Date.now() - startTime;
    const summary = this.generateSummary();

    return {
      module: "data_flow_tracking",
      severity: this.getOverallSeverity(),
      analysisTime,
      filesAnalyzed,
      variablesTracked,
      findings: this.findings,
      summary,
      metadata: {
        analysisVersion: "1.0.0",
        timestamp: new Date().toISOString(),
        configuration: this.config
      }
    };
  }

  /**
   * Analyze a single file for data flow issues
   */
  private async analyzeFile(filePath: string, content: string): Promise<void> {
    this.fileName = filePath;
    
    // Check file size
    if (content.length > this.config.maxFileSizeKB * 1024) {
      return;
    }

    try {
      // Create TypeScript program for type checking
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        strict: this.config.strictMode,
        noImplicitAny: this.config.strictMode,
        strictNullChecks: this.config.strictMode
      };

      this.sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.ES2020,
        true
      );

      // Create program for type checking if enabled
      if (this.config.enableTypeChecking) {
        this.program = ts.createProgram([filePath], compilerOptions, {
          getSourceFile: (fileName) => fileName === filePath ? this.sourceFile : undefined,
          writeFile: () => {},
          getCurrentDirectory: () => "",
          getDirectories: () => [],
          fileExists: () => true,
          readFile: () => "",
          getCanonicalFileName: (fileName) => fileName,
          useCaseSensitiveFileNames: () => true,
          getNewLine: () => "\n"
        });
        this.typeChecker = this.program.getTypeChecker();
      }

      // Reset analysis state
      this.variables.clear();
      this.scopes = [];
      this.currentScope = null;

      // Create global scope
      this.currentScope = {
        type: 'global',
        name: 'global',
        variables: new Map(),
        children: []
      };
      this.scopes.push(this.currentScope);

      // Traverse AST and analyze
      this.visitNode(this.sourceFile);

      // Perform analysis checks
      this.checkUninitializedVariables();
      this.checkUnusedVariables();
      this.checkDataRaces();
      this.checkMemoryLeaks();
      this.checkScopeViolations();
      this.checkNullPointerAccess();

    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
    }
  }

  /**
   * Visit AST node and track variables
   */
  private visitNode(node: ts.Node): void {
    switch (node.kind) {
      case ts.SyntaxKind.VariableDeclaration:
        this.handleVariableDeclaration(node as ts.VariableDeclaration);
        break;
      case ts.SyntaxKind.Parameter:
        this.handleParameter(node as ts.ParameterDeclaration);
        break;
      case ts.SyntaxKind.Identifier:
        this.handleIdentifier(node as ts.Identifier);
        break;
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        this.handleFunction(node as ts.FunctionLikeDeclaration);
        break;
      case ts.SyntaxKind.Block:
        this.handleBlock(node as ts.Block);
        break;
      case ts.SyntaxKind.ClassDeclaration:
        this.handleClass(node as ts.ClassDeclaration);
        break;
      case ts.SyntaxKind.BinaryExpression:
        this.handleBinaryExpression(node as ts.BinaryExpression);
        break;
      case ts.SyntaxKind.CallExpression:
        this.handleCallExpression(node as ts.CallExpression);
        break;
    }

    // Continue traversing
    ts.forEachChild(node, child => this.visitNode(child));
  }

  /**
   * Handle variable declarations
   */
  private handleVariableDeclaration(node: ts.VariableDeclaration): void {
    if (!ts.isIdentifier(node.name)) return;

    const name = node.name.text;
    const location = this.getLocation(node);
    const type = this.getTypeString(node);
    const initialized = node.initializer !== undefined;

    const variable: VariableDeclaration = {
      name,
      type,
      scope: this.currentScope?.name || 'unknown',
      declaration: location,
      usages: [],
      initialized,
      assigned: initialized,
      accessed: false,
      node
    };

    this.variables.set(`${this.currentScope?.name || 'global'}.${name}`, variable);
    if (this.currentScope) {
      this.currentScope.variables.set(name, variable);
    }
  }

  /**
   * Handle function parameters
   */
  private handleParameter(node: ts.ParameterDeclaration): void {
    if (!ts.isIdentifier(node.name)) return;

    const name = node.name.text;
    const location = this.getLocation(node);
    const type = this.getTypeString(node);

    const variable: VariableDeclaration = {
      name,
      type,
      scope: this.currentScope?.name || 'unknown',
      declaration: location,
      usages: [],
      initialized: true, // Parameters are always initialized
      assigned: true,
      accessed: false,
      node
    };

    this.variables.set(`${this.currentScope?.name || 'global'}.${name}`, variable);
    if (this.currentScope) {
      this.currentScope.variables.set(name, variable);
    }
  }

  /**
   * Handle identifier usage
   */
  private handleIdentifier(node: ts.Identifier): void {
    const name = node.text;
    const location = this.getLocation(node);

    // Find variable in current scope or parent scopes
    const variable = this.findVariable(name);
    if (variable) {
      variable.usages.push(location);
      variable.accessed = true;
    }
  }

  /**
   * Handle function declarations
   */
  private handleFunction(node: ts.FunctionLikeDeclaration): void {
    const functionName = node.name ? (ts.isIdentifier(node.name) ? node.name.text : 'anonymous') : 'anonymous';
    
    // Create new scope for function
    const functionScope: ScopeInfo = {
      type: 'function',
      name: functionName,
      variables: new Map(),
      parent: this.currentScope,
      children: []
    };

    if (this.currentScope) {
      this.currentScope.children.push(functionScope);
    }
    this.scopes.push(functionScope);

    const previousScope = this.currentScope;
    this.currentScope = functionScope;

    // Process function body
    if (node.body) {
      this.visitNode(node.body);
    }

    this.currentScope = previousScope;
  }

  /**
   * Handle block statements
   */
  private handleBlock(node: ts.Block): void {
    // Create new block scope
    const blockScope: ScopeInfo = {
      type: 'block',
      name: `block_${node.pos}`,
      variables: new Map(),
      parent: this.currentScope,
      children: []
    };

    if (this.currentScope) {
      this.currentScope.children.push(blockScope);
    }
    this.scopes.push(blockScope);

    const previousScope = this.currentScope;
    this.currentScope = blockScope;

    // Process block statements
    for (const statement of node.statements) {
      this.visitNode(statement);
    }

    this.currentScope = previousScope;
  }

  /**
   * Handle class declarations
   */
  private handleClass(node: ts.ClassDeclaration): void {
    const className = node.name ? node.name.text : 'anonymous';
    
    const classScope: ScopeInfo = {
      type: 'class',
      name: className,
      variables: new Map(),
      parent: this.currentScope,
      children: []
    };

    if (this.currentScope) {
      this.currentScope.children.push(classScope);
    }
    this.scopes.push(classScope);

    const previousScope = this.currentScope;
    this.currentScope = classScope;

    // Process class members
    for (const member of node.members) {
      this.visitNode(member);
    }

    this.currentScope = previousScope;
  }

  /**
   * Handle binary expressions (assignments)
   */
  private handleBinaryExpression(node: ts.BinaryExpression): void {
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      // Assignment operation
      if (ts.isIdentifier(node.left)) {
        const variable = this.findVariable(node.left.text);
        if (variable) {
          variable.assigned = true;
          variable.usages.push(this.getLocation(node.left));
        }
      }
    }
  }

  /**
   * Handle function calls
   */
  private handleCallExpression(node: ts.CallExpression): void {
    // Check for potential memory leaks or async issues
    if (ts.isIdentifier(node.expression)) {
      const functionName = node.expression.text;
      
      // Check for common memory leak patterns
      if (this.config.enableMemoryLeakDetection) {
        this.checkMemoryLeakPatterns(node, functionName);
      }
    }
  }

  /**
   * Check for uninitialized variable usage
   */
  private checkUninitializedVariables(): void {
    if (!this.config.enableUninitializedVariableDetection) return;

    for (const [key, variable] of this.variables) {
      if (!variable.initialized && variable.accessed) {
        this.addFinding({
          type: DataFlowIssueType.UNINITIALIZED_VARIABLE,
          severity: AnalysisSeverity.HIGH,
          message: `Variable '${variable.name}' is used before being initialized`,
          location: variable.usages[0] || variable.declaration,
          variable: variable.name,
          variableInfo: this.createVariableInfo(variable),
          relatedLocations: [variable.declaration],
          suggestion: `Initialize variable '${variable.name}' before use`,
          confidence: 0.9
        });
      }
    }
  }

  /**
   * Check for unused variables
   */
  private checkUnusedVariables(): void {
    if (!this.config.enableUnusedVariableDetection) return;

    for (const [key, variable] of this.variables) {
      if (!variable.accessed && variable.name !== '_') {
        this.addFinding({
          type: DataFlowIssueType.UNUSED_VARIABLE,
          severity: AnalysisSeverity.MEDIUM,
          message: `Variable '${variable.name}' is declared but never used`,
          location: variable.declaration,
          variable: variable.name,
          variableInfo: this.createVariableInfo(variable),
          suggestion: `Remove unused variable '${variable.name}' or prefix with underscore if intentionally unused`,
          confidence: 0.95
        });
      }
    }
  }

  /**
   * Check for potential data races
   */
  private checkDataRaces(): void {
    if (!this.config.enableDataRaceDetection) return;

    // Simple heuristic: look for variables accessed in async contexts
    for (const [key, variable] of this.variables) {
      if (variable.usages.length > 1) {
        // Check if variable is accessed in multiple async contexts
        const asyncAccesses = this.findAsyncAccesses(variable);
        if (asyncAccesses.length > 1) {
          this.addFinding({
            type: DataFlowIssueType.DATA_RACE,
            severity: AnalysisSeverity.HIGH,
            message: `Variable '${variable.name}' may have concurrent access in async contexts`,
            location: variable.declaration,
            variable: variable.name,
            variableInfo: this.createVariableInfo(variable),
            concurrentAccess: asyncAccesses,
            suggestion: `Add synchronization mechanism or use atomic operations for variable '${variable.name}'`,
            confidence: 0.7
          });
        }
      }
    }
  }

  /**
   * Check for memory leaks
   */
  private checkMemoryLeaks(): void {
    if (!this.config.enableMemoryLeakDetection) return;
    // Memory leak detection is handled in handleCallExpression
  }

  /**
   * Check for scope violations
   */
  private checkScopeViolations(): void {
    if (!this.config.enableScopeViolationDetection) return;

    // Check for variables accessed outside their scope
    for (const [key, variable] of this.variables) {
      for (const usage of variable.usages) {
        if (!this.isInScope(variable, usage)) {
          this.addFinding({
            type: DataFlowIssueType.SCOPE_VIOLATION,
            severity: AnalysisSeverity.HIGH,
            message: `Variable '${variable.name}' accessed outside its scope`,
            location: usage,
            variable: variable.name,
            variableInfo: this.createVariableInfo(variable),
            relatedLocations: [variable.declaration],
            suggestion: `Ensure variable '${variable.name}' is accessed within its declared scope`,
            confidence: 0.8
          });
        }
      }
    }
  }

  /**
   * Check for null pointer access
   */
  private checkNullPointerAccess(): void {
    if (!this.config.enableNullPointerDetection) return;

    // This would require more sophisticated type analysis
    // For now, we'll implement basic heuristics
    for (const [key, variable] of this.variables) {
      if (variable.type?.includes('null') || variable.type?.includes('undefined')) {
        for (const usage of variable.usages) {
          this.addFinding({
            type: DataFlowIssueType.NULL_POINTER_ACCESS,
            severity: AnalysisSeverity.MEDIUM,
            message: `Potential null/undefined access for variable '${variable.name}'`,
            location: usage,
            variable: variable.name,
            variableInfo: this.createVariableInfo(variable),
            suggestion: `Add null/undefined check before accessing variable '${variable.name}'`,
            confidence: 0.6
          });
        }
      }
    }
  }

  /**
   * Check for memory leak patterns in function calls
   */
  private checkMemoryLeakPatterns(node: ts.CallExpression, functionName: string): void {
    const leakPatterns = [
      'setInterval',
      'setTimeout',
      'addEventListener',
      'on', // Event listeners
      'subscribe'
    ];

    if (leakPatterns.includes(functionName)) {
      this.addFinding({
        type: DataFlowIssueType.MEMORY_LEAK,
        severity: AnalysisSeverity.MEDIUM,
        message: `Potential memory leak: '${functionName}' call without cleanup`,
        location: this.getLocation(node),
        suggestion: `Ensure proper cleanup for '${functionName}' (clearInterval, removeEventListener, unsubscribe, etc.)`,
        confidence: 0.7
      });
    }
  }

  /**
   * Find async accesses for data race detection
   */
  private findAsyncAccesses(variable: VariableDeclaration): ConcurrentAccess[] {
    // Simplified implementation - would need more sophisticated analysis
    return variable.usages.map(usage => ({
      file: this.fileName,
      line: usage.line,
      operation: "read" as const,
      context: "async"
    }));
  }

  /**
   * Check if a variable usage is within its scope
   */
  private isInScope(variable: VariableDeclaration, usage: Location): boolean {
    // Simplified scope checking - would need more sophisticated implementation
    return true; // For now, assume all usages are in scope
  }

  /**
   * Find variable in current scope or parent scopes
   */
  private findVariable(name: string): VariableDeclaration | undefined {
    let scope = this.currentScope;
    while (scope) {
      const variable = scope.variables.get(name);
      if (variable) return variable;
      scope = scope.parent;
    }
    return undefined;
  }

  /**
   * Get location information from AST node
   */
  private getLocation(node: ts.Node): Location {
    const sourceFile = this.sourceFile!;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      file: this.fileName,
      line: start.line + 1,
      column: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1
    };
  }

  /**
   * Get type string from node
   */
  private getTypeString(node: ts.Node): string | undefined {
    if (this.typeChecker) {
      const type = this.typeChecker.getTypeAtLocation(node);
      return this.typeChecker.typeToString(type);
    }
    return undefined;
  }

  /**
   * Create variable info from variable declaration
   */
  private createVariableInfo(variable: VariableDeclaration): VariableInfo {
    return {
      name: variable.name,
      type: variable.type,
      scope: variable.scope,
      declaration: variable.declaration,
      usages: variable.usages
    };
  }

  /**
   * Add finding to results
   */
  private addFinding(finding: DataFlowFinding): void {
    if (finding.confidence >= this.config.confidenceThreshold) {
      this.findings.push(finding);
    }
  }

  /**
   * Check if file should be analyzed
   */
  private shouldAnalyzeFile(filePath: string): boolean {
    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.config.includePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filePath);
  }

  /**
   * Get overall severity of findings
   */
  private getOverallSeverity(): AnalysisSeverity {
    if (this.findings.some(f => f.severity === AnalysisSeverity.CRITICAL)) {
      return AnalysisSeverity.CRITICAL;
    }
    if (this.findings.some(f => f.severity === AnalysisSeverity.HIGH)) {
      return AnalysisSeverity.HIGH;
    }
    if (this.findings.some(f => f.severity === AnalysisSeverity.MEDIUM)) {
      return AnalysisSeverity.MEDIUM;
    }
    return AnalysisSeverity.LOW;
  }

  /**
   * Generate summary of findings
   */
  private generateSummary() {
    const summary = {
      totalIssues: this.findings.length,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0
    };

    for (const finding of this.findings) {
      switch (finding.severity) {
        case AnalysisSeverity.CRITICAL:
          summary.criticalIssues++;
          break;
        case AnalysisSeverity.HIGH:
          summary.highIssues++;
          break;
        case AnalysisSeverity.MEDIUM:
          summary.mediumIssues++;
          break;
        case AnalysisSeverity.LOW:
          summary.lowIssues++;
          break;
      }
    }

    return summary;
  }
}

