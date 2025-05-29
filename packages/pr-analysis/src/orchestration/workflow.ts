import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { 
  WorkflowExecution, 
  WorkflowState, 
  PRContext,
  PRAnalysisConfig 
} from '../types'
import { Logger } from '../utils/logger'

/**
 * Workflow Manager - Handles workflow state and execution tracking
 * 
 * Manages the lifecycle of PR analysis workflows:
 * - State transitions
 * - Progress tracking
 * - Error handling
 * - Metrics collection
 */
export class WorkflowManager extends EventEmitter {
  private readonly logger: Logger
  private readonly config: PRAnalysisConfig
  private readonly workflows = new Map<string, WorkflowExecution>()
  
  constructor(config: PRAnalysisConfig) {
    super()
    this.config = config
    this.logger = new Logger('WorkflowManager', config.logging)
  }

  /**
   * Create a new workflow execution
   */
  createWorkflow(prContext: PRContext): WorkflowExecution {
    const workflow: WorkflowExecution = {
      id: uuidv4(),
      prId: prContext.id,
      state: 'pending',
      startedAt: new Date(),
      results: [],
      linearIssues: [],
      autoFixAttempts: 0,
      errors: [],
      metadata: {
        prNumber: prContext.number,
        repository: prContext.repository.fullName,
        author: prContext.author,
        filesChanged: prContext.files.length
      }
    }
    
    this.workflows.set(workflow.id, workflow)
    
    this.logger.info(`Created workflow ${workflow.id} for PR ${prContext.number}`)
    this.emit('workflow:created', workflow)
    
    return workflow
  }

  /**
   * Update workflow state
   */
  updateWorkflowState(workflowId: string, newState: WorkflowState): void {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }
    
    const previousState = workflow.state
    workflow.state = newState
    
    this.logger.info(`Workflow ${workflowId} state changed: ${previousState} -> ${newState}`)
    this.emit('workflow:state-changed', workflow, previousState)
    
    // Set completion time if workflow is completed or failed
    if (newState === 'completed' || newState === 'failed') {
      workflow.completedAt = new Date()
      this.emit('workflow:finished', workflow)
    }
  }

  /**
   * Add error to workflow
   */
  addWorkflowError(workflowId: string, error: Error): void {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }
    
    workflow.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    })
    
    this.logger.error(`Error added to workflow ${workflowId}`, error)
    this.emit('workflow:error', workflow, error)
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowExecution | undefined {
    return this.workflows.get(workflowId)
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): WorkflowExecution[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Get workflows by state
   */
  getWorkflowsByState(state: WorkflowState): WorkflowExecution[] {
    return Array.from(this.workflows.values()).filter(w => w.state === state)
  }

  /**
   * Get workflows by PR ID
   */
  getWorkflowsByPR(prId: string): WorkflowExecution[] {
    return Array.from(this.workflows.values()).filter(w => w.prId === prId)
  }

  /**
   * Get active workflows (not completed or failed)
   */
  getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.workflows.values()).filter(
      w => w.state !== 'completed' && w.state !== 'failed'
    )
  }

  /**
   * Calculate workflow duration
   */
  getWorkflowDuration(workflowId: string): number | null {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return null
    }
    
    const endTime = workflow.completedAt || new Date()
    return endTime.getTime() - workflow.startedAt.getTime()
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStatistics(): {
    total: number
    byState: Record<WorkflowState, number>
    averageDuration: number
    successRate: number
    activeCount: number
  } {
    const workflows = Array.from(this.workflows.values())
    const total = workflows.length
    
    // Count by state
    const byState: Record<WorkflowState, number> = {
      pending: 0,
      analyzing: 0,
      'creating-issues': 0,
      'auto-fixing': 0,
      validating: 0,
      completed: 0,
      failed: 0
    }
    
    let totalDuration = 0
    let completedCount = 0
    let successCount = 0
    
    for (const workflow of workflows) {
      byState[workflow.state]++
      
      if (workflow.completedAt) {
        completedCount++
        totalDuration += workflow.completedAt.getTime() - workflow.startedAt.getTime()
        
        if (workflow.state === 'completed') {
          successCount++
        }
      }
    }
    
    const averageDuration = completedCount > 0 ? totalDuration / completedCount : 0
    const successRate = completedCount > 0 ? (successCount / completedCount) * 100 : 0
    const activeCount = total - completedCount
    
    return {
      total,
      byState,
      averageDuration,
      successRate,
      activeCount
    }
  }

  /**
   * Clean up old workflows
   */
  cleanupOldWorkflows(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - maxAge)
    let cleaned = 0
    
    for (const [id, workflow] of this.workflows) {
      if (workflow.completedAt && workflow.completedAt < cutoff) {
        this.workflows.delete(id)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} old workflows`)
    }
    
    return cleaned
  }

  /**
   * Export workflow data for analysis
   */
  exportWorkflowData(workflowId?: string): any {
    if (workflowId) {
      const workflow = this.workflows.get(workflowId)
      return workflow ? this.serializeWorkflow(workflow) : null
    }
    
    return Array.from(this.workflows.values()).map(w => this.serializeWorkflow(w))
  }

  /**
   * Serialize workflow for export
   */
  private serializeWorkflow(workflow: WorkflowExecution): any {
    return {
      ...workflow,
      duration: workflow.completedAt 
        ? workflow.completedAt.getTime() - workflow.startedAt.getTime()
        : null,
      issuesFound: workflow.results.length,
      criticalIssues: workflow.results.filter(r => r.severity === 'critical').length,
      autoFixableIssues: workflow.results.filter(r => r.autoFixable).length
    }
  }

  /**
   * Get workflow performance metrics
   */
  getPerformanceMetrics(): {
    averageAnalysisTime: number
    targetSpeedCompliance: number
    issueDetectionRate: number
    autoFixSuccessRate: number
  } {
    const completedWorkflows = Array.from(this.workflows.values())
      .filter(w => w.state === 'completed' && w.completedAt)
    
    if (completedWorkflows.length === 0) {
      return {
        averageAnalysisTime: 0,
        targetSpeedCompliance: 0,
        issueDetectionRate: 0,
        autoFixSuccessRate: 0
      }
    }
    
    // Calculate average analysis time
    const totalTime = completedWorkflows.reduce((sum, w) => {
      return sum + (w.completedAt!.getTime() - w.startedAt.getTime())
    }, 0)
    const averageAnalysisTime = totalTime / completedWorkflows.length
    
    // Calculate target speed compliance (< 5 minutes)
    const targetSpeed = this.config.metrics.targetSpeed * 1000 // Convert to ms
    const withinTarget = completedWorkflows.filter(w => {
      const duration = w.completedAt!.getTime() - w.startedAt.getTime()
      return duration <= targetSpeed
    }).length
    const targetSpeedCompliance = (withinTarget / completedWorkflows.length) * 100
    
    // Calculate issue detection rate
    const totalIssues = completedWorkflows.reduce((sum, w) => sum + w.results.length, 0)
    const issueDetectionRate = totalIssues / completedWorkflows.length
    
    // Calculate auto-fix success rate
    const workflowsWithAutoFix = completedWorkflows.filter(w => w.autoFixAttempts > 0)
    const autoFixSuccessRate = workflowsWithAutoFix.length > 0
      ? (workflowsWithAutoFix.filter(w => w.errors.length === 0).length / workflowsWithAutoFix.length) * 100
      : 0
    
    return {
      averageAnalysisTime: Math.round(averageAnalysisTime),
      targetSpeedCompliance: Math.round(targetSpeedCompliance * 100) / 100,
      issueDetectionRate: Math.round(issueDetectionRate * 100) / 100,
      autoFixSuccessRate: Math.round(autoFixSuccessRate * 100) / 100
    }
  }

  /**
   * Check if performance targets are being met
   */
  checkPerformanceTargets(): {
    speedTarget: boolean
    accuracyTarget: boolean
    autoFixTarget: boolean
    overallCompliance: boolean
  } {
    const metrics = this.getPerformanceMetrics()
    const targets = this.config.metrics
    
    const speedTarget = metrics.targetSpeedCompliance >= targets.targetCoverage
    const accuracyTarget = metrics.issueDetectionRate >= targets.targetAccuracy
    const autoFixTarget = metrics.autoFixSuccessRate >= targets.targetAutoFix
    
    return {
      speedTarget,
      accuracyTarget,
      autoFixTarget,
      overallCompliance: speedTarget && accuracyTarget && autoFixTarget
    }
  }
}

