import { EventEmitter } from 'events'
import { 
  PRContext, 
  AnalysisResult, 
  AnalysisConfig, 
  IAnalysisModule,
  PRAnalysisConfig 
} from '../types'
import { Logger } from '../utils/logger'

// Import analysis modules
import { UnusedFunctionDetectionModule } from '../analysis/static/unused-functions'
import { ParameterValidationModule } from '../analysis/static/parameter-validation'
import { DuplicateCodeDetectionModule } from '../analysis/static/duplicate-code'
import { ComplexityAnalysisModule } from '../analysis/static/complexity'
import { ImportValidationModule } from '../analysis/static/imports'

import { FunctionFlowMappingModule } from '../analysis/dynamic/function-flow'
import { DataFlowTrackingModule } from '../analysis/dynamic/data-flow'
import { ErrorHandlingModule } from '../analysis/dynamic/error-handling'
import { PerformanceHotspotModule } from '../analysis/dynamic/performance-hotspots'

import { VulnerabilityDetectionModule } from '../analysis/security/vulnerability-detection'
import { AccessControlModule } from '../analysis/security/access-control'
import { ComplianceModule } from '../analysis/security/compliance'

import { HotspotDetectionModule } from '../analysis/performance/hotspot-detection'
import { MemoryAnalysisModule } from '../analysis/performance/memory-analysis'
import { OptimizationModule } from '../analysis/performance/optimization'

import { CodeStandardsModule } from '../analysis/compliance/code-standards'
import { DocumentationModule } from '../analysis/compliance/documentation'

/**
 * Analysis Engine - Coordinates all analysis modules
 * 
 * Manages the execution of 15+ atomic analysis modules across 5 categories:
 * - Static Code Analysis (5 modules)
 * - Dynamic Flow Analysis (4 modules) 
 * - Security & Compliance (3 modules)
 * - Performance & Optimization (3 modules)
 * - Documentation & Standards (2 modules)
 */
export class AnalysisEngine extends EventEmitter {
  private readonly logger: Logger
  private readonly config: PRAnalysisConfig
  private readonly modules = new Map<string, IAnalysisModule>()
  private isInitialized = false

  constructor(config: PRAnalysisConfig) {
    super()
    this.config = config
    this.logger = new Logger('AnalysisEngine', config.logging)
  }

  /**
   * Initialize the analysis engine and register all modules
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Analysis engine already initialized')
      return
    }

    try {
      this.logger.info('Initializing Analysis Engine...')
      
      // Register static analysis modules
      if (this.config.analysis.modules.static.enabled) {
        await this.registerStaticModules()
      }
      
      // Register dynamic analysis modules
      if (this.config.analysis.modules.dynamic.enabled) {
        await this.registerDynamicModules()
      }
      
      // Register security analysis modules
      if (this.config.analysis.modules.security.enabled) {
        await this.registerSecurityModules()
      }
      
      // Register performance analysis modules
      if (this.config.analysis.modules.performance.enabled) {
        await this.registerPerformanceModules()
      }
      
      // Register compliance analysis modules
      if (this.config.analysis.modules.compliance.enabled) {
        await this.registerComplianceModules()
      }
      
      this.isInitialized = true
      this.logger.info(`Analysis Engine initialized with ${this.modules.size} modules`)
      
    } catch (error) {
      this.logger.error('Failed to initialize Analysis Engine', error)
      throw error
    }
  }

  /**
   * Register static analysis modules
   */
  private async registerStaticModules(): Promise<void> {
    const enabledModules = this.config.analysis.modules.static.modules
    
    if (enabledModules.includes('unused-functions')) {
      this.modules.set('unused-functions', new UnusedFunctionDetectionModule())
    }
    
    if (enabledModules.includes('parameter-validation')) {
      this.modules.set('parameter-validation', new ParameterValidationModule())
    }
    
    if (enabledModules.includes('duplicate-code')) {
      this.modules.set('duplicate-code', new DuplicateCodeDetectionModule())
    }
    
    if (enabledModules.includes('complexity')) {
      this.modules.set('complexity', new ComplexityAnalysisModule())
    }
    
    if (enabledModules.includes('imports')) {
      this.modules.set('imports', new ImportValidationModule())
    }
    
    this.logger.info(`Registered ${this.modules.size} static analysis modules`)
  }

  /**
   * Register dynamic analysis modules
   */
  private async registerDynamicModules(): Promise<void> {
    const enabledModules = this.config.analysis.modules.dynamic.modules
    
    if (enabledModules.includes('function-flow')) {
      this.modules.set('function-flow', new FunctionFlowMappingModule())
    }
    
    if (enabledModules.includes('data-flow')) {
      this.modules.set('data-flow', new DataFlowTrackingModule())
    }
    
    if (enabledModules.includes('error-handling')) {
      this.modules.set('error-handling', new ErrorHandlingModule())
    }
    
    if (enabledModules.includes('performance-hotspots')) {
      this.modules.set('performance-hotspots', new PerformanceHotspotModule())
    }
    
    this.logger.info(`Registered dynamic analysis modules`)
  }

  /**
   * Register security analysis modules
   */
  private async registerSecurityModules(): Promise<void> {
    const enabledModules = this.config.analysis.modules.security.modules
    
    if (enabledModules.includes('vulnerability-detection')) {
      this.modules.set('vulnerability-detection', new VulnerabilityDetectionModule())
    }
    
    if (enabledModules.includes('access-control')) {
      this.modules.set('access-control', new AccessControlModule())
    }
    
    if (enabledModules.includes('compliance')) {
      this.modules.set('compliance', new ComplianceModule())
    }
    
    this.logger.info(`Registered security analysis modules`)
  }

  /**
   * Register performance analysis modules
   */
  private async registerPerformanceModules(): Promise<void> {
    const enabledModules = this.config.analysis.modules.performance.modules
    
    if (enabledModules.includes('hotspot-detection')) {
      this.modules.set('hotspot-detection', new HotspotDetectionModule())
    }
    
    if (enabledModules.includes('memory-analysis')) {
      this.modules.set('memory-analysis', new MemoryAnalysisModule())
    }
    
    if (enabledModules.includes('optimization')) {
      this.modules.set('optimization', new OptimizationModule())
    }
    
    this.logger.info(`Registered performance analysis modules`)
  }

  /**
   * Register compliance analysis modules
   */
  private async registerComplianceModules(): Promise<void> {
    const enabledModules = this.config.analysis.modules.compliance.modules
    
    if (enabledModules.includes('code-standards')) {
      this.modules.set('code-standards', new CodeStandardsModule())
    }
    
    if (enabledModules.includes('documentation')) {
      this.modules.set('documentation', new DocumentationModule())
    }
    
    this.logger.info(`Registered compliance analysis modules`)
  }

  /**
   * Run all enabled analysis modules on a PR
   */
  async analyzeAll(prContext: PRContext): Promise<AnalysisResult[]> {
    if (!this.isInitialized) {
      throw new Error('Analysis engine not initialized')
    }

    this.logger.info(`Starting comprehensive analysis for PR ${prContext.number}`, {
      prId: prContext.id,
      filesChanged: prContext.files.length,
      modulesEnabled: this.modules.size
    })

    const startTime = Date.now()
    const allResults: AnalysisResult[] = []
    const moduleResults = new Map<string, AnalysisResult[]>()

    // Run modules in parallel if enabled, otherwise sequentially
    if (this.config.analysis.parallel) {
      await this.runModulesInParallel(prContext, moduleResults)
    } else {
      await this.runModulesSequentially(prContext, moduleResults)
    }

    // Collect all results
    for (const [moduleName, results] of moduleResults) {
      allResults.push(...results)
      this.logger.info(`Module ${moduleName} found ${results.length} issues`)
    }

    const duration = Date.now() - startTime
    this.logger.info(`Analysis completed`, {
      prId: prContext.id,
      duration,
      totalIssues: allResults.length,
      criticalIssues: allResults.filter(r => r.severity === 'critical').length,
      highIssues: allResults.filter(r => r.severity === 'high').length,
      autoFixableIssues: allResults.filter(r => r.autoFixable).length
    })

    // Emit completion event
    this.emit('analysis:completed', allResults)

    return allResults
  }

  /**
   * Run analysis modules in parallel
   */
  private async runModulesInParallel(
    prContext: PRContext,
    moduleResults: Map<string, AnalysisResult[]>
  ): Promise<void> {
    const maxConcurrent = this.config.performance.maxConcurrentAnalyses
    const moduleEntries = Array.from(this.modules.entries())
    
    // Process modules in batches to respect concurrency limits
    for (let i = 0; i < moduleEntries.length; i += maxConcurrent) {
      const batch = moduleEntries.slice(i, i + maxConcurrent)
      
      const batchPromises = batch.map(async ([name, module]) => {
        try {
          const results = await this.runSingleModule(name, module, prContext)
          moduleResults.set(name, results)
        } catch (error) {
          this.logger.error(`Module ${name} failed`, error)
          this.emit('analysis:module-error', name, error)
          moduleResults.set(name, [])
        }
      })
      
      await Promise.all(batchPromises)
    }
  }

  /**
   * Run analysis modules sequentially
   */
  private async runModulesSequentially(
    prContext: PRContext,
    moduleResults: Map<string, AnalysisResult[]>
  ): Promise<void> {
    for (const [name, module] of this.modules) {
      try {
        const results = await this.runSingleModule(name, module, prContext)
        moduleResults.set(name, results)
      } catch (error) {
        this.logger.error(`Module ${name} failed`, error)
        this.emit('analysis:module-error', name, error)
        moduleResults.set(name, [])
      }
    }
  }

  /**
   * Run a single analysis module with timeout and error handling
   */
  private async runSingleModule(
    name: string,
    module: IAnalysisModule,
    prContext: PRContext
  ): Promise<AnalysisResult[]> {
    this.logger.debug(`Starting module: ${name}`)
    this.emit('analysis:module-started', name)
    
    const startTime = Date.now()
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Module ${name} timed out after ${this.config.analysis.timeout}ms`))
        }, this.config.analysis.timeout)
      })
      
      // Race between module execution and timeout
      const results = await Promise.race([
        module.analyze(prContext, this.config.analysis),
        timeoutPromise
      ])
      
      const duration = Date.now() - startTime
      this.logger.debug(`Module ${name} completed`, { duration, issuesFound: results.length })
      this.emit('analysis:module-completed', name, results)
      
      return results
      
    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error(`Module ${name} failed after ${duration}ms`, error)
      throw error
    }
  }

  /**
   * Run analysis for specific modules only
   */
  async analyzeWithModules(
    prContext: PRContext,
    moduleNames: string[]
  ): Promise<AnalysisResult[]> {
    if (!this.isInitialized) {
      throw new Error('Analysis engine not initialized')
    }

    const results: AnalysisResult[] = []
    
    for (const moduleName of moduleNames) {
      const module = this.modules.get(moduleName)
      if (!module) {
        this.logger.warn(`Module ${moduleName} not found or not enabled`)
        continue
      }
      
      try {
        const moduleResults = await this.runSingleModule(moduleName, module, prContext)
        results.push(...moduleResults)
      } catch (error) {
        this.logger.error(`Failed to run module ${moduleName}`, error)
      }
    }
    
    return results
  }

  /**
   * Get information about registered modules
   */
  getModuleInfo(): Array<{
    name: string
    type: string
    version: string
    enabled: boolean
  }> {
    return Array.from(this.modules.entries()).map(([name, module]) => ({
      name,
      type: module.type,
      version: module.version,
      enabled: true
    }))
  }

  /**
   * Check if a specific module can auto-fix a result
   */
  canAutoFix(result: AnalysisResult): boolean {
    const module = this.modules.get(result.module)
    return module ? module.canAutoFix(result) : false
  }

  /**
   * Request auto-fix from a specific module
   */
  async requestAutoFix(
    result: AnalysisResult,
    prContext: PRContext
  ): Promise<any> {
    const module = this.modules.get(result.module)
    if (!module || !module.autoFix) {
      throw new Error(`Module ${result.module} does not support auto-fix`)
    }
    
    return await module.autoFix(result, prContext)
  }

  /**
   * Health check for the analysis engine
   */
  isHealthy(): boolean {
    return this.isInitialized && this.modules.size > 0
  }

  /**
   * Get analysis statistics
   */
  getStatistics(): {
    totalModules: number
    modulesByType: Record<string, number>
    enabledModules: string[]
  } {
    const modulesByType: Record<string, number> = {}
    const enabledModules: string[] = []
    
    for (const [name, module] of this.modules) {
      enabledModules.push(name)
      modulesByType[module.type] = (modulesByType[module.type] || 0) + 1
    }
    
    return {
      totalModules: this.modules.size,
      modulesByType,
      enabledModules
    }
  }
}

