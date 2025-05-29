import { StaticAnalysisModule } from './base'
import { PRContext, AnalysisConfig, AnalysisResult, AutoFixResult } from '../../types'

/**
 * Unused Function Detection Module
 * 
 * Analyzes code to identify functions that are defined but never called.
 * This helps reduce code bloat and improve maintainability.
 * 
 * Features:
 * - Detects unused functions across files
 * - Handles exports and imports
 * - Considers dynamic calls and reflection
 * - Provides auto-fix capabilities for safe removals
 */
export class UnusedFunctionDetectionModule extends StaticAnalysisModule {
  readonly name = 'unused-functions'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = []
    const relevantFiles = this.getRelevantFiles(context)
    
    // Build a map of all functions and their usage
    const functionMap = new Map<string, {
      file: string
      line: number
      name: string
      isExported: boolean
      isUsed: boolean
    }>()
    
    const usageMap = new Set<string>()
    
    // First pass: collect all function definitions
    for (const file of relevantFiles) {
      if (!file.patch) continue
      
      const { added } = this.extractCodeFromPatch(file.patch)
      const code = added.join('\n')
      const parsed = this.parseCode(code, file.filename)
      
      for (const func of parsed.functions) {
        const key = `${file.filename}:${func.name}`
        functionMap.set(key, {
          file: file.filename,
          line: func.line,
          name: func.name,
          isExported: func.isExported,
          isUsed: false
        })
      }
    }
    
    // Second pass: find function usages
    for (const file of relevantFiles) {
      if (!file.patch) continue
      
      const { added, context } = this.extractCodeFromPatch(file.patch)
      const allCode = [...added, ...context].join('\n')
      
      // Look for function calls
      for (const [key, funcInfo] of functionMap) {
        if (this.isFunctionUsed(allCode, funcInfo.name)) {
          funcInfo.isUsed = true
          usageMap.add(key)
        }
      }
    }
    
    // Third pass: check for external usage (imports/exports)
    for (const [key, funcInfo] of functionMap) {
      if (!funcInfo.isUsed && funcInfo.isExported) {
        // Exported functions might be used externally
        // Check if this is a public API or internal function
        if (this.isLikelyPublicAPI(funcInfo.file, funcInfo.name)) {
          funcInfo.isUsed = true
        }
      }
    }
    
    // Generate results for unused functions
    for (const [key, funcInfo] of functionMap) {
      if (!funcInfo.isUsed) {
        const severity = funcInfo.isExported ? 'medium' : 'low'
        const autoFixable = !funcInfo.isExported && this.isSafeToRemove(funcInfo)
        
        results.push(this.createResult(
          'unused-function',
          severity,
          `Unused function: ${funcInfo.name}`,
          `Function '${funcInfo.name}' is defined but never called. Consider removing it to reduce code bloat.`,
          funcInfo.file,
          funcInfo.line,
          undefined,
          autoFixable ? `Remove the unused function '${funcInfo.name}'` : undefined,
          autoFixable,
          {
            functionName: funcInfo.name,
            isExported: funcInfo.isExported,
            safeToRemove: autoFixable
          }
        ))
      }
    }
    
    return results
  }

  canAutoFix(result: AnalysisResult): boolean {
    return result.autoFixable && 
           result.metadata?.safeToRemove === true &&
           !result.metadata?.isExported
  }

  async autoFix(result: AnalysisResult, context: PRContext): Promise<AutoFixResult> {
    if (!this.canAutoFix(result)) {
      return {
        id: `fix-${result.id}`,
        analysisId: result.id,
        success: false,
        changes: [],
        error: 'Function is not safe to auto-remove',
        timestamp: new Date()
      }
    }
    
    try {
      // Find the function in the code and remove it
      const file = context.files.find(f => f.filename === result.file)
      if (!file || !file.patch) {
        throw new Error('File not found or no patch available')
      }
      
      const { added } = this.extractCodeFromPatch(file.patch)
      const functionName = result.metadata?.functionName
      
      // Remove the function definition
      const modifiedCode = this.removeFunctionFromCode(added.join('\n'), functionName)
      
      return {
        id: `fix-${result.id}`,
        analysisId: result.id,
        success: true,
        changes: [{
          file: result.file!,
          type: 'modify',
          content: modifiedCode,
          diff: this.generateDiff(added.join('\n'), modifiedCode)
        }],
        timestamp: new Date()
      }
      
    } catch (error) {
      return {
        id: `fix-${result.id}`,
        analysisId: result.id,
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      }
    }
  }

  /**
   * Check if a function is used in the given code
   */
  private isFunctionUsed(code: string, functionName: string): boolean {
    // Look for direct function calls
    const callPattern = new RegExp(`\\b${functionName}\\s*\\(`, 'g')
    if (callPattern.test(code)) return true
    
    // Look for function references (without parentheses)
    const refPattern = new RegExp(`\\b${functionName}\\b(?!\\s*[=:]|\\s*\\()`, 'g')
    if (refPattern.test(code)) return true
    
    // Look for method calls
    const methodPattern = new RegExp(`\\.${functionName}\\s*\\(`, 'g')
    if (methodPattern.test(code)) return true
    
    return false
  }

  /**
   * Check if a function is likely part of a public API
   */
  private isLikelyPublicAPI(filename: string, functionName: string): boolean {
    // Check if it's in an index file or API file
    if (filename.includes('index.') || filename.includes('api.') || filename.includes('public.')) {
      return true
    }
    
    // Check if function name suggests it's public (starts with uppercase, etc.)
    if (functionName[0] === functionName[0].toUpperCase()) {
      return true
    }
    
    // Check for common public function patterns
    const publicPatterns = [
      /^create/i,
      /^get/i,
      /^set/i,
      /^init/i,
      /^setup/i,
      /^configure/i,
      /^handle/i,
      /^process/i
    ]
    
    return publicPatterns.some(pattern => pattern.test(functionName))
  }

  /**
   * Check if a function is safe to remove
   */
  private isSafeToRemove(funcInfo: { name: string; isExported: boolean }): boolean {
    // Don't remove exported functions
    if (funcInfo.isExported) return false
    
    // Don't remove functions that might be used dynamically
    const dynamicPatterns = [
      /^on[A-Z]/,  // Event handlers
      /^handle[A-Z]/, // Event handlers
      /^_/,        // Private functions might be used via reflection
      /test/i,     // Test functions
      /mock/i,     // Mock functions
      /stub/i      // Stub functions
    ]
    
    return !dynamicPatterns.some(pattern => pattern.test(funcInfo.name))
  }

  /**
   * Remove a function from code
   */
  private removeFunctionFromCode(code: string, functionName: string): string {
    const lines = code.split('\n')
    const result: string[] = []
    let inFunction = false
    let braceCount = 0
    let functionStartLine = -1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if this line starts the target function
      if (!inFunction && this.isFunctionDeclaration(line, functionName)) {
        inFunction = true
        functionStartLine = i
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
        
        // If it's a single-line function, skip it entirely
        if (braceCount === 0 && line.includes('=>')) {
          continue
        }
        
        // If opening brace is on the same line, continue tracking
        if (braceCount > 0) {
          continue
        }
      } else if (inFunction) {
        // Count braces to find function end
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
        
        if (braceCount <= 0) {
          // Function ended, stop skipping
          inFunction = false
          continue
        }
        // Skip lines inside the function
        continue
      } else {
        // Keep lines that are not part of the target function
        result.push(line)
      }
    }
    
    return result.join('\n')
  }

  /**
   * Check if a line contains a function declaration for the target function
   */
  private isFunctionDeclaration(line: string, functionName: string): boolean {
    const trimmed = line.trim()
    
    // Regular function declaration
    if (trimmed.match(new RegExp(`function\\s+${functionName}\\s*\\(`))) {
      return true
    }
    
    // Arrow function assignment
    if (trimmed.match(new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*.*=>`))) {
      return true
    }
    
    // Method definition
    if (trimmed.match(new RegExp(`${functionName}\\s*\\([^)]*\\)\\s*{`))) {
      return true
    }
    
    return false
  }

  /**
   * Generate a diff between original and modified code
   */
  private generateDiff(original: string, modified: string): string {
    const originalLines = original.split('\n')
    const modifiedLines = modified.split('\n')
    
    const diff: string[] = []
    let i = 0, j = 0
    
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i < originalLines.length && j < modifiedLines.length) {
        if (originalLines[i] === modifiedLines[j]) {
          diff.push(` ${originalLines[i]}`)
          i++
          j++
        } else {
          diff.push(`-${originalLines[i]}`)
          i++
        }
      } else if (i < originalLines.length) {
        diff.push(`-${originalLines[i]}`)
        i++
      } else {
        diff.push(`+${modifiedLines[j]}`)
        j++
      }
    }
    
    return diff.join('\n')
  }
}

