/**
 * Example of creating a custom analysis module
 */

import { 
  StaticAnalysisModule, 
  PRContext, 
  AnalysisConfig, 
  AnalysisResult,
  AnalysisEngine,
  createDefaultConfig
} from '@voltagent/pr-analysis'

/**
 * Custom analysis module that checks for TODO comments
 */
class TodoAnalysisModule extends StaticAnalysisModule {
  readonly name = 'todo-analysis'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = []
    const relevantFiles = this.getRelevantFiles(context)
    
    for (const file of relevantFiles) {
      if (!file.patch) continue
      
      const { added } = this.extractCodeFromPatch(file.patch)
      
      for (let i = 0; i < added.length; i++) {
        const line = added[i]
        const todoMatch = line.match(/(TODO|FIXME|HACK|XXX):\s*(.+)/i)
        
        if (todoMatch) {
          const [, type, description] = todoMatch
          
          results.push(this.createResult(
            'todo-analysis',
            'low',
            `${type} comment found`,
            `Found ${type} comment: ${description}`,
            file.filename,
            i + 1,
            line.indexOf(todoMatch[0]),
            `Consider creating a proper issue for: ${description}`,
            false, // Not auto-fixable
            { todoType: type, todoDescription: description }
          ))
        }
      }
    }
    
    return results
  }

  canAutoFix(result: AnalysisResult): boolean {
    return false // TODO comments require manual review
  }
}

/**
 * Example usage with custom module
 */
async function exampleWithCustomModule() {
  const config = createDefaultConfig()
  const logger = new (await import('@voltagent/pr-analysis')).Logger('example', config.logging)
  
  // Create analysis engine
  const engine = new AnalysisEngine(config, logger)
  
  // Register custom module
  engine.registerModule(new TodoAnalysisModule())
  
  // Mock PR context for testing
  const mockContext: PRContext = {
    id: 123,
    number: 123,
    title: 'Test PR with TODO comments',
    author: 'developer',
    repository: {
      name: 'test-repo',
      owner: 'test-owner',
      fullName: 'test-owner/test-repo'
    },
    baseBranch: 'main',
    headBranch: 'feature-branch',
    files: [{
      filename: 'src/example.ts',
      status: 'modified',
      patch: `@@ -1,3 +1,6 @@
 function example() {
+  // TODO: Implement proper error handling
   console.log('Hello World')
+  // FIXME: This is a temporary hack
+  return true
 }`
    }]
  }
  
  // Run analysis
  const results = await engine.analyze(mockContext)
  
  console.log('Analysis Results:')
  results.forEach(result => {
    console.log(`- ${result.severity.toUpperCase()}: ${result.title}`)
    console.log(`  File: ${result.file}:${result.line}`)
    console.log(`  Description: ${result.description}`)
    if (result.suggestion) {
      console.log(`  Suggestion: ${result.suggestion}`)
    }
    console.log()
  })
}

if (require.main === module) {
  exampleWithCustomModule().catch(console.error)
}

