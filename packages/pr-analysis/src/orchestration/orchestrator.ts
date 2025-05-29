import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { 
  PRContext, 
  WorkflowExecution, 
  WorkflowState, 
  AnalysisResult,
  PRAnalysisConfig 
} from '../types'
import { AnalysisEngine } from './engine'
import { WorkflowManager } from './workflow'
import { LinearIntegration } from '../integrations/linear'
import { AgentAPIIntegration } from '../integrations/agentapi'
import { AnalysisDatabase } from '../database/analysis-db'
import { ErrorRecoverySystem } from '../recovery/system'
import { Logger } from '../utils/logger'

/**
 * Main orchestrator for the PR analysis system
 * 
 * Coordinates the entire workflow from PR analysis to issue resolution:
 * 1. Receives PR events
 * 2. Orchestrates analysis modules
 * 3. Creates Linear issues
 * 4. Triggers automated fixes via AgentAPI
 * 5. Validates results and handles errors
 */
export class PRAnalysisOrchestrator extends EventEmitter {
  private readonly logger: Logger
  private readonly config: PRAnalysisConfig
  private readonly analysisEngine: AnalysisEngine
  private readonly workflowManager: WorkflowManager
  private readonly linearIntegration: LinearIntegration
  private readonly agentAPIIntegration: AgentAPIIntegration
  private readonly database: AnalysisDatabase
  private readonly errorRecovery: ErrorRecoverySystem
  
  private isInitialized = false
  private activeWorkflows = new Map<string, WorkflowExecution>()

  constructor(config: PRAnalysisConfig) {
    super()
    
    this.config = config
    this.logger = new Logger('PRAnalysisOrchestrator', config.logging)
    
    // Initialize core components
    this.analysisEngine = new AnalysisEngine(config)
    this.workflowManager = new WorkflowManager(config)
    this.linearIntegration = new LinearIntegration(config.integrations.linear)
    this.agentAPIIntegration = new AgentAPIIntegration(config.integrations.agentapi)
    this.database = new AnalysisDatabase(config.database)
    this.errorRecovery = new ErrorRecoverySystem(config)
    
    this.setupEventHandlers()
  }

  /**
   * Initialize the orchestrator and all its components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Orchestrator already initialized')
      return
    }

    try {
      this.logger.info('Initializing PR Analysis Orchestrator...')
      
      // Initialize database connection
      await this.database.connect()
      this.logger.info('Database connected')
      
      // Initialize integrations
      await this.linearIntegration.initialize(this.config.integrations.linear)
      this.logger.info('Linear integration initialized')
      
      await this.agentAPIIntegration.initialize(this.config.integrations.agentapi)
      this.logger.info('AgentAPI integration initialized')
      
      // Initialize analysis engine
      await this.analysisEngine.initialize()
      this.logger.info('Analysis engine initialized')
      
      // Initialize error recovery system
      await this.errorRecovery.initialize()
      this.logger.info('Error recovery system initialized')
      
      this.isInitialized = true
      this.logger.info('PR Analysis Orchestrator initialized successfully')
      
      this.emit('initialized')
    } catch (error) {
      this.logger.error('Failed to initialize orchestrator', error)
      throw error
    }
  }

  /**
   * Process a PR for comprehensive analysis
   */
  async processPR(prContext: PRContext): Promise<WorkflowExecution> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized')
    }

    const workflowId = uuidv4()
    const workflow: WorkflowExecution = {
      id: workflowId,
      prId: prContext.id,
      state: 'pending',
      startedAt: new Date(),
      results: [],
      linearIssues: [],
      autoFixAttempts: 0,
      errors: []
    }

    this.activeWorkflows.set(workflowId, workflow)
    
    try {
      this.logger.info(`Starting PR analysis workflow`, { 
        workflowId, 
        prId: prContext.id,
        prNumber: prContext.number 
      })

      // Phase 1: Analysis
      await this.executeAnalysisPhase(workflow, prContext)
      
      // Phase 2: Issue Creation
      await this.executeIssueCreationPhase(workflow, prContext)
      
      // Phase 3: Auto-fixing
      await this.executeAutoFixPhase(workflow, prContext)
      
      // Phase 4: Validation
      await this.executeValidationPhase(workflow, prContext)
      
      // Mark as completed
      workflow.state = 'completed'
      workflow.completedAt = new Date()
      
      this.logger.info(`PR analysis workflow completed successfully`, {
        workflowId,
        duration: workflow.completedAt.getTime() - workflow.startedAt.getTime(),
        issuesFound: workflow.results.length,
        linearIssuesCreated: workflow.linearIssues.length
      })
      
      this.emit('workflow:completed', workflow)
      
    } catch (error) {
      workflow.state = 'failed'
      workflow.errors.push({
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      })
      
      this.logger.error(`PR analysis workflow failed`, { workflowId, error })
      
      // Attempt error recovery
      await this.errorRecovery.handleWorkflowError(workflow, error)
      
      this.emit('workflow:failed', workflow, error)
    } finally {
      // Save workflow to database
      await this.database.saveWorkflow(workflow)
      
      // Clean up active workflows after some time
      setTimeout(() => {
        this.activeWorkflows.delete(workflowId)
      }, 60000) // 1 minute
    }

    return workflow
  }

  /**
   * Execute the analysis phase
   */
  private async executeAnalysisPhase(
    workflow: WorkflowExecution, 
    prContext: PRContext
  ): Promise<void> {
    workflow.state = 'analyzing'
    this.emit('workflow:state-changed', workflow)
    
    this.logger.info(`Starting analysis phase`, { workflowId: workflow.id })
    
    const results = await this.analysisEngine.analyzeAll(prContext)
    workflow.results = results
    
    this.logger.info(`Analysis phase completed`, { 
      workflowId: workflow.id,
      issuesFound: results.length,
      criticalIssues: results.filter(r => r.severity === 'critical').length,
      highIssues: results.filter(r => r.severity === 'high').length
    })
  }

  /**
   * Execute the issue creation phase
   */
  private async executeIssueCreationPhase(
    workflow: WorkflowExecution,
    prContext: PRContext
  ): Promise<void> {
    workflow.state = 'creating-issues'
    this.emit('workflow:state-changed', workflow)
    
    this.logger.info(`Starting issue creation phase`, { workflowId: workflow.id })
    
    // Group results by severity and type for better organization
    const groupedResults = this.groupAnalysisResults(workflow.results)
    
    // Create main orchestration issue
    const mainIssueId = await this.linearIntegration.createMainIssue(
      prContext,
      workflow.results
    )
    workflow.linearIssues.push(mainIssueId)
    
    // Create sub-issues for each analysis result group
    for (const [groupKey, results] of Object.entries(groupedResults)) {
      if (results.length > 0) {
        const subIssueId = await this.linearIntegration.createSubIssue(
          mainIssueId,
          groupKey,
          results,
          prContext
        )
        workflow.linearIssues.push(subIssueId)
      }
    }
    
    this.logger.info(`Issue creation phase completed`, {
      workflowId: workflow.id,
      issuesCreated: workflow.linearIssues.length
    })
  }

  /**
   * Execute the auto-fix phase
   */
  private async executeAutoFixPhase(
    workflow: WorkflowExecution,
    prContext: PRContext
  ): Promise<void> {
    workflow.state = 'auto-fixing'
    this.emit('workflow:state-changed', workflow)
    
    this.logger.info(`Starting auto-fix phase`, { workflowId: workflow.id })
    
    const autoFixableResults = workflow.results.filter(r => r.autoFixable)
    
    if (autoFixableResults.length === 0) {
      this.logger.info(`No auto-fixable issues found`, { workflowId: workflow.id })
      return
    }
    
    // Trigger AgentAPI for automated fixes
    for (const result of autoFixableResults) {
      try {
        workflow.autoFixAttempts++
        
        const fixResult = await this.agentAPIIntegration.requestAutoFix(
          result,
          prContext,
          workflow.linearIssues
        )
        
        if (fixResult.success) {
          // Update Linear issue with fix status
          await this.linearIntegration.updateIssueWithFix(
            workflow.linearIssues[0], // Main issue
            result,
            fixResult
          )
        }
        
      } catch (error) {
        this.logger.error(`Auto-fix failed for result ${result.id}`, { 
          workflowId: workflow.id,
          error 
        })
      }
    }
    
    this.logger.info(`Auto-fix phase completed`, {
      workflowId: workflow.id,
      attempts: workflow.autoFixAttempts
    })
  }

  /**
   * Execute the validation phase
   */
  private async executeValidationPhase(
    workflow: WorkflowExecution,
    prContext: PRContext
  ): Promise<void> {
    workflow.state = 'validating'
    this.emit('workflow:state-changed', workflow)
    
    this.logger.info(`Starting validation phase`, { workflowId: workflow.id })
    
    // Re-run analysis to validate fixes
    const validationResults = await this.analysisEngine.analyzeAll(prContext)
    
    // Compare with original results to measure improvement
    const improvement = this.calculateImprovement(workflow.results, validationResults)
    
    // Update Linear issues with validation results
    await this.linearIntegration.updateMainIssueWithValidation(
      workflow.linearIssues[0],
      improvement,
      validationResults
    )
    
    this.logger.info(`Validation phase completed`, {
      workflowId: workflow.id,
      improvement: improvement.percentage
    })
  }

  /**
   * Group analysis results for better organization
   */
  private groupAnalysisResults(results: AnalysisResult[]): Record<string, AnalysisResult[]> {
    const groups: Record<string, AnalysisResult[]> = {}
    
    for (const result of results) {
      const key = `${result.type}-${result.module}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(result)
    }
    
    return groups
  }

  /**
   * Calculate improvement between original and validation results
   */
  private calculateImprovement(
    original: AnalysisResult[],
    validation: AnalysisResult[]
  ): { percentage: number; fixed: number; remaining: number } {
    const originalCount = original.length
    const validationCount = validation.length
    const fixed = Math.max(0, originalCount - validationCount)
    const percentage = originalCount > 0 ? (fixed / originalCount) * 100 : 0
    
    return {
      percentage: Math.round(percentage * 100) / 100,
      fixed,
      remaining: validationCount
    }
  }

  /**
   * Setup event handlers for component communication
   */
  private setupEventHandlers(): void {
    this.analysisEngine.on('analysis:started', (module: string) => {
      this.emit('analysis:module-started', module)
    })
    
    this.analysisEngine.on('analysis:completed', (module: string, results: AnalysisResult[]) => {
      this.emit('analysis:module-completed', module, results)
    })
    
    this.analysisEngine.on('analysis:error', (module: string, error: Error) => {
      this.emit('analysis:module-error', module, error)
    })
  }

  /**
   * Get current workflow status
   */
  getWorkflowStatus(workflowId: string): WorkflowExecution | undefined {
    return this.activeWorkflows.get(workflowId)
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.activeWorkflows.values())
  }

  /**
   * Health check for the orchestrator
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    components: Record<string, boolean>
    activeWorkflows: number
  }> {
    const components = {
      database: this.database.isConnected(),
      linear: await this.linearIntegration.isHealthy(),
      agentapi: await this.agentAPIIntegration.isHealthy(),
      analysisEngine: this.analysisEngine.isHealthy()
    }
    
    const allHealthy = Object.values(components).every(Boolean)
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      components,
      activeWorkflows: this.activeWorkflows.size
    }
  }

  /**
   * Shutdown the orchestrator gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down PR Analysis Orchestrator...')
    
    // Wait for active workflows to complete (with timeout)
    const timeout = 30000 // 30 seconds
    const start = Date.now()
    
    while (this.activeWorkflows.size > 0 && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    if (this.activeWorkflows.size > 0) {
      this.logger.warn(`Shutting down with ${this.activeWorkflows.size} active workflows`)
    }
    
    // Disconnect from database
    await this.database.disconnect()
    
    this.isInitialized = false
    this.logger.info('PR Analysis Orchestrator shutdown complete')
  }
}

