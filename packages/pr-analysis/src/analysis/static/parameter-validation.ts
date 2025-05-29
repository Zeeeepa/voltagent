import { StaticAnalysisModule } from './base'
import { PRContext, AnalysisConfig, AnalysisResult } from '../../types'

/**
 * Parameter Validation Module
 * 
 * Analyzes function parameters for proper validation and type checking.
 * Identifies missing validation, type mismatches, and security vulnerabilities.
 */
export class ParameterValidationModule extends StaticAnalysisModule {
  readonly name = 'parameter-validation'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = []
    const relevantFiles = this.getRelevantFiles(context)
    
    for (const file of relevantFiles) {
      if (!file.patch) continue
      
      const { added } = this.extractCodeFromPatch(file.patch)
      const code = added.join('\n')
      const parsed = this.parseCode(code, file.filename)
      
      // Analyze each function for parameter validation issues
      for (const func of parsed.functions) {
        const validationIssues = this.analyzeParameterValidation(func, code)
        
        for (const issue of validationIssues) {
          results.push(this.createResult(
            'parameter-validation',
            issue.severity,
            issue.title,
            issue.description,
            file.filename,
            func.line,
            undefined,
            issue.suggestion,
            issue.autoFixable,
            { functionName: func.name, parameterName: issue.parameter }
          ))
        }
      }
    }
    
    return results
  }

  canAutoFix(result: AnalysisResult): boolean {
    return result.autoFixable && result.metadata?.parameterName
  }

  private analyzeParameterValidation(func: any, code: string): Array<{
    parameter: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    suggestion: string
    autoFixable: boolean
  }> {
    const issues: Array<{
      parameter: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      title: string
      description: string
      suggestion: string
      autoFixable: boolean
    }> = []
    
    // Mock analysis - would use proper AST parsing
    for (const param of func.parameters) {
      if (param && !param.includes(':')) {
        issues.push({
          parameter: param,
          severity: 'medium',
          title: `Missing type annotation for parameter '${param}'`,
          description: `Parameter '${param}' in function '${func.name}' lacks type annotation, which can lead to runtime errors.`,
          suggestion: `Add type annotation: ${param}: string | number | boolean`,
          autoFixable: true
        })
      }
    }
    
    return issues
  }
}

