import { 
  IAnalysisModule, 
  PRContext, 
  AnalysisConfig, 
  AnalysisResult, 
  AutoFixResult 
} from '../../types'

/**
 * Base class for static analysis modules
 * 
 * Static analysis examines code without executing it, focusing on:
 * - Code structure and patterns
 * - Syntax and style issues
 * - Potential bugs and code smells
 * - Complexity metrics
 * - Import/dependency analysis
 */
export abstract class StaticAnalysisModule implements IAnalysisModule {
  abstract readonly name: string
  readonly type = 'static' as const
  abstract readonly version: string

  /**
   * Analyze the PR context for static issues
   */
  abstract analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]>

  /**
   * Check if this module can auto-fix a specific result
   */
  abstract canAutoFix(result: AnalysisResult): boolean

  /**
   * Attempt to auto-fix a specific result (optional)
   */
  autoFix?(result: AnalysisResult, context: PRContext): Promise<AutoFixResult>

  /**
   * Filter files relevant for static analysis
   */
  protected getRelevantFiles(context: PRContext): Array<{
    filename: string
    status: 'added' | 'modified' | 'removed'
    content?: string
    patch?: string
  }> {
    return context.files.filter(file => {
      // Skip removed files for most static analysis
      if (file.status === 'removed') return false
      
      // Focus on code files
      const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs']
      return codeExtensions.some(ext => file.filename.endsWith(ext))
    })
  }

  /**
   * Extract code content from patch
   */
  protected extractCodeFromPatch(patch: string): { added: string[], removed: string[], context: string[] } {
    const lines = patch.split('\n')
    const added: string[] = []
    const removed: string[] = []
    const context: string[] = []
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added.push(line.substring(1))
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removed.push(line.substring(1))
      } else if (!line.startsWith('@@') && !line.startsWith('+++') && !line.startsWith('---')) {
        context.push(line.startsWith(' ') ? line.substring(1) : line)
      }
    }
    
    return { added, removed, context }
  }

  /**
   * Create a standardized analysis result
   */
  protected createResult(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    file?: string,
    line?: number,
    column?: number,
    suggestion?: string,
    autoFixable = false,
    metadata?: Record<string, any>
  ): AnalysisResult {
    return {
      id: `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'static',
      module: this.name,
      severity,
      title,
      description,
      file,
      line,
      column,
      suggestion,
      autoFixable,
      metadata,
      timestamp: new Date()
    }
  }

  /**
   * Parse TypeScript/JavaScript code to extract AST information
   */
  protected parseCode(code: string, filename: string): any {
    // This would integrate with a proper TypeScript parser
    // For now, return a mock structure
    return {
      functions: this.extractFunctions(code),
      imports: this.extractImports(code),
      exports: this.extractExports(code),
      classes: this.extractClasses(code),
      variables: this.extractVariables(code)
    }
  }

  /**
   * Extract function definitions from code
   */
  private extractFunctions(code: string): Array<{
    name: string
    line: number
    parameters: string[]
    isAsync: boolean
    isExported: boolean
  }> {
    const functions: Array<{
      name: string
      line: number
      parameters: string[]
      isAsync: boolean
      isExported: boolean
    }> = []
    
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Match function declarations
      const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/)
      if (functionMatch) {
        functions.push({
          name: functionMatch[1],
          line: i + 1,
          parameters: functionMatch[2].split(',').map(p => p.trim()).filter(Boolean),
          isAsync: line.includes('async'),
          isExported: line.includes('export')
        })
      }
      
      // Match arrow functions
      const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/)
      if (arrowMatch) {
        functions.push({
          name: arrowMatch[1],
          line: i + 1,
          parameters: [], // Would need more sophisticated parsing
          isAsync: line.includes('async'),
          isExported: line.includes('export')
        })
      }
    }
    
    return functions
  }

  /**
   * Extract import statements from code
   */
  private extractImports(code: string): Array<{
    module: string
    imports: string[]
    line: number
    isDefault: boolean
  }> {
    const imports: Array<{
      module: string
      imports: string[]
      line: number
      isDefault: boolean
    }> = []
    
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      const importMatch = line.match(/import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/)
      if (importMatch) {
        const importClause = importMatch[1]
        const module = importMatch[2]
        
        // Parse import clause
        const isDefault = !importClause.includes('{')
        const imports = isDefault 
          ? [importClause.trim()]
          : importClause.replace(/[{}]/g, '').split(',').map(i => i.trim())
        
        imports.push({
          module,
          imports,
          line: i + 1,
          isDefault
        })
      }
    }
    
    return imports
  }

  /**
   * Extract export statements from code
   */
  private extractExports(code: string): Array<{
    name: string
    line: number
    isDefault: boolean
    type: 'function' | 'class' | 'variable' | 'type'
  }> {
    const exports: Array<{
      name: string
      line: number
      isDefault: boolean
      type: 'function' | 'class' | 'variable' | 'type'
    }> = []
    
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('export')) {
        const isDefault = line.includes('default')
        
        if (line.includes('function')) {
          const match = line.match(/function\s+(\w+)/)
          if (match) {
            exports.push({
              name: match[1],
              line: i + 1,
              isDefault,
              type: 'function'
            })
          }
        } else if (line.includes('class')) {
          const match = line.match(/class\s+(\w+)/)
          if (match) {
            exports.push({
              name: match[1],
              line: i + 1,
              isDefault,
              type: 'class'
            })
          }
        }
      }
    }
    
    return exports
  }

  /**
   * Extract class definitions from code
   */
  private extractClasses(code: string): Array<{
    name: string
    line: number
    extends?: string
    implements?: string[]
    methods: string[]
  }> {
    const classes: Array<{
      name: string
      line: number
      extends?: string
      implements?: string[]
      methods: string[]
    }> = []
    
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      const classMatch = line.match(/class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/)
      if (classMatch) {
        classes.push({
          name: classMatch[1],
          line: i + 1,
          extends: classMatch[2],
          implements: classMatch[3]?.split(',').map(i => i.trim()),
          methods: [] // Would need more sophisticated parsing
        })
      }
    }
    
    return classes
  }

  /**
   * Extract variable declarations from code
   */
  private extractVariables(code: string): Array<{
    name: string
    line: number
    type: 'const' | 'let' | 'var'
    isExported: boolean
  }> {
    const variables: Array<{
      name: string
      line: number
      type: 'const' | 'let' | 'var'
      isExported: boolean
    }> = []
    
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      const varMatch = line.match(/(?:export\s+)?(const|let|var)\s+(\w+)/)
      if (varMatch) {
        variables.push({
          name: varMatch[2],
          line: i + 1,
          type: varMatch[1] as 'const' | 'let' | 'var',
          isExported: line.includes('export')
        })
      }
    }
    
    return variables
  }
}

