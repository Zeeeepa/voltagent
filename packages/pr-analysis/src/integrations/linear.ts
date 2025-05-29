import { IIntegration, LinearConfig, PRContext, AnalysisResult, AutoFixResult } from '../types'

/**
 * Linear Integration - Manages Linear issue creation and updates
 * 
 * Handles:
 * - Creating main orchestration issues
 * - Creating sub-issues for analysis results
 * - Updating issues with progress and fixes
 * - Managing issue relationships and dependencies
 */
export class LinearIntegration implements IIntegration {
  readonly name = 'linear'
  private config!: LinearConfig
  private isInitialized = false

  async initialize(config: LinearConfig): Promise<void> {
    this.config = config
    
    // Validate Linear API connection
    await this.validateConnection()
    
    this.isInitialized = true
  }

  async isHealthy(): Promise<boolean> {
    if (!this.isInitialized) return false
    
    try {
      // Simple health check - verify API access
      await this.validateConnection()
      return true
    } catch {
      return false
    }
  }

  /**
   * Create main orchestration issue for PR analysis
   */
  async createMainIssue(prContext: PRContext, results: AnalysisResult[]): Promise<string> {
    const title = `🔬 PR Analysis: ${prContext.title}`
    
    const description = this.buildMainIssueDescription(prContext, results)
    
    // Mock implementation - would use actual Linear API
    const issueId = `linear-issue-${Date.now()}`
    
    console.log(`Created Linear main issue: ${issueId}`)
    console.log(`Title: ${title}`)
    console.log(`Description: ${description}`)
    
    return issueId
  }

  /**
   * Create sub-issue for specific analysis results
   */
  async createSubIssue(
    parentIssueId: string,
    groupKey: string,
    results: AnalysisResult[],
    prContext: PRContext
  ): Promise<string> {
    const [type, module] = groupKey.split('-')
    const title = `${this.getModuleEmoji(type, module)} ${this.formatModuleName(module)}`
    
    const description = this.buildSubIssueDescription(results, prContext, module)
    
    // Mock implementation
    const subIssueId = `linear-subissue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`Created Linear sub-issue: ${subIssueId}`)
    console.log(`Parent: ${parentIssueId}`)
    console.log(`Title: ${title}`)
    
    return subIssueId
  }

  /**
   * Update issue with auto-fix results
   */
  async updateIssueWithFix(
    issueId: string,
    result: AnalysisResult,
    fixResult: AutoFixResult
  ): Promise<void> {
    const updateText = fixResult.success
      ? `✅ Auto-fix applied for: ${result.title}`
      : `❌ Auto-fix failed for: ${result.title} - ${fixResult.error}`
    
    console.log(`Updated Linear issue ${issueId}: ${updateText}`)
    
    // Mock implementation - would use Linear API to add comment
  }

  /**
   * Update main issue with validation results
   */
  async updateMainIssueWithValidation(
    issueId: string,
    improvement: { percentage: number; fixed: number; remaining: number },
    validationResults: AnalysisResult[]
  ): Promise<void> {
    const updateText = `
## 🎯 Validation Results

**Improvement**: ${improvement.percentage}% (${improvement.fixed} issues fixed, ${improvement.remaining} remaining)

**Remaining Issues**: ${validationResults.length}
${validationResults.map(r => `- ${r.severity.toUpperCase()}: ${r.title}`).join('\n')}

**Status**: ${improvement.percentage >= 80 ? '✅ Target achieved' : '⚠️ Needs attention'}
    `
    
    console.log(`Updated Linear main issue ${issueId} with validation results`)
    console.log(updateText)
  }

  /**
   * Build description for main orchestration issue
   */
  private buildMainIssueDescription(prContext: PRContext, results: AnalysisResult[]): string {
    const criticalCount = results.filter(r => r.severity === 'critical').length
    const highCount = results.filter(r => r.severity === 'high').length
    const mediumCount = results.filter(r => r.severity === 'medium').length
    const lowCount = results.filter(r => r.severity === 'low').length
    const autoFixableCount = results.filter(r => r.autoFixable).length
    
    return `
## 🔬 Comprehensive PR Analysis Results

**PR**: [${prContext.title}](${prContext.repository.fullName}/pull/${prContext.number})
**Author**: ${prContext.author}
**Files Changed**: ${prContext.files.length}

### 📊 Analysis Summary

- **Total Issues Found**: ${results.length}
- **Critical**: ${criticalCount} 🔴
- **High**: ${highCount} 🟠  
- **Medium**: ${mediumCount} 🟡
- **Low**: ${lowCount} 🟢
- **Auto-fixable**: ${autoFixableCount} 🔧

### 🎯 Analysis Categories

${this.buildCategorySummary(results)}

### 🚀 Next Steps

1. **Review Critical Issues**: Address ${criticalCount} critical issues immediately
2. **Auto-fix Available**: ${autoFixableCount} issues can be automatically resolved
3. **Manual Review**: ${results.length - autoFixableCount} issues require manual attention

### 📋 Sub-Issues

Sub-issues will be created for each analysis module with detailed findings and recommendations.

---

**Workflow ID**: Generated automatically
**Analysis Engine**: VoltAgent PR Analysis v1.0.0
    `.trim()
  }

  /**
   * Build description for sub-issue
   */
  private buildSubIssueDescription(
    results: AnalysisResult[],
    prContext: PRContext,
    module: string
  ): string {
    const criticalResults = results.filter(r => r.severity === 'critical')
    const highResults = results.filter(r => r.severity === 'high')
    const mediumResults = results.filter(r => r.severity === 'medium')
    const lowResults = results.filter(r => r.severity === 'low')
    
    return `
## ${this.formatModuleName(module)} Analysis Results

**Module**: ${module}
**PR**: [${prContext.title}](${prContext.repository.fullName}/pull/${prContext.number})
**Issues Found**: ${results.length}

### 🔍 Findings

${this.buildResultsList(criticalResults, 'Critical Issues 🔴')}
${this.buildResultsList(highResults, 'High Priority Issues 🟠')}
${this.buildResultsList(mediumResults, 'Medium Priority Issues 🟡')}
${this.buildResultsList(lowResults, 'Low Priority Issues 🟢')}

### 🔧 Auto-fix Recommendations

${results.filter(r => r.autoFixable).map(r => 
  `- **${r.title}**: ${r.suggestion || 'Auto-fix available'}`
).join('\n') || 'No auto-fixable issues found.'}

### 📝 Manual Actions Required

${results.filter(r => !r.autoFixable).map(r => 
  `- **${r.title}** (${r.file}:${r.line}): ${r.description}`
).join('\n') || 'No manual actions required.'}

---

**Analysis Module**: ${module}
**Execution Time**: Generated automatically
    `.trim()
  }

  /**
   * Build category summary for main issue
   */
  private buildCategorySummary(results: AnalysisResult[]): string {
    const categories = {
      static: results.filter(r => r.type === 'static'),
      dynamic: results.filter(r => r.type === 'dynamic'),
      security: results.filter(r => r.type === 'security'),
      performance: results.filter(r => r.type === 'performance'),
      compliance: results.filter(r => r.type === 'compliance')
    }
    
    return Object.entries(categories)
      .map(([type, typeResults]) => {
        if (typeResults.length === 0) return null
        
        const emoji = this.getCategoryEmoji(type)
        const critical = typeResults.filter(r => r.severity === 'critical').length
        const high = typeResults.filter(r => r.severity === 'high').length
        
        return `- **${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}**: ${typeResults.length} issues (${critical} critical, ${high} high)`
      })
      .filter(Boolean)
      .join('\n')
  }

  /**
   * Build results list for a specific severity
   */
  private buildResultsList(results: AnalysisResult[], title: string): string {
    if (results.length === 0) return ''
    
    return `
#### ${title}

${results.map(r => 
  `- **${r.title}** (${r.file}:${r.line})\n  ${r.description}${r.suggestion ? `\n  💡 *${r.suggestion}*` : ''}`
).join('\n')}
    `.trim()
  }

  /**
   * Get emoji for analysis category
   */
  private getCategoryEmoji(type: string): string {
    const emojis: Record<string, string> = {
      static: '🔍',
      dynamic: '🌊',
      security: '🛡️',
      performance: '🎯',
      compliance: '📋'
    }
    return emojis[type] || '🔧'
  }

  /**
   * Get emoji for specific module
   */
  private getModuleEmoji(type: string, module: string): string {
    const moduleEmojis: Record<string, string> = {
      'unused-functions': '🔍',
      'parameter-validation': '⚙️',
      'duplicate-code': '🔄',
      'complexity': '📊',
      'imports': '🏗️',
      'function-flow': '🌊',
      'data-flow': '🔗',
      'error-handling': '🔄',
      'performance-hotspots': '🎯',
      'vulnerability-detection': '🔒',
      'access-control': '🛡️',
      'compliance': '📋',
      'hotspot-detection': '🎯',
      'memory-analysis': '💾',
      'optimization': '⚡',
      'code-standards': '📏',
      'documentation': '📚'
    }
    
    return moduleEmojis[module] || this.getCategoryEmoji(type)
  }

  /**
   * Format module name for display
   */
  private formatModuleName(module: string): string {
    return module
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Validate Linear API connection
   */
  private async validateConnection(): Promise<void> {
    // Mock validation - would use actual Linear API
    if (!this.config.apiKey) {
      throw new Error('Linear API key not configured')
    }
    
    if (!this.config.teamId) {
      throw new Error('Linear team ID not configured')
    }
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

