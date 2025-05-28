import { v4 as uuidv4 } from 'uuid';
import { AgentAPIClient, ValidationOptions, ValidationResult } from '../agentapi/client.js';
import { WSL2Manager, DeploymentResult } from '../wsl2/manager.js';
import { db } from '../database/connection.js';
import { config } from '../config/index.js';

export interface PRInfo {
  url: string;
  number: number;
  branchName: string;
  repository: string;
  owner: string;
}

export interface TaskContext {
  taskId: string;
  title: string;
  description?: string;
  priority: number;
  metadata?: Record<string, any>;
}

export interface ValidationSession {
  id: string;
  taskId: string;
  prInfo: PRInfo;
  status: 'pending' | 'deploying' | 'validating' | 'completed' | 'failed' | 'cancelled';
  wsl2InstanceId?: string;
  deploymentPath?: string;
  startedAt: Date;
  completedAt?: Date;
  validationDuration?: number;
  result?: ValidationResult;
  error?: string;
  metadata: Record<string, any>;
}

export interface ValidationMetrics {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageValidationTime: number;
  averageScore: number;
  activeInstances: number;
}

export class ClaudeCodeValidator {
  private agentApiClient: AgentAPIClient;
  private wsl2Manager: WSL2Manager;

  constructor(options: {
    agentapiUrl?: string;
    apiKey?: string;
    wsl2Config?: any;
  } = {}) {
    this.agentApiClient = new AgentAPIClient({
      agentapiUrl: options.agentapiUrl,
      apiKey: options.apiKey,
    });
    
    this.wsl2Manager = new WSL2Manager(options.wsl2Config);
  }

  async validatePR(
    prInfo: PRInfo,
    taskContext: TaskContext,
    options: ValidationOptions = {}
  ): Promise<ValidationSession> {
    const sessionId = uuidv4();
    
    try {
      console.log(`Starting PR validation session: ${sessionId}`);
      
      // Create validation session record
      const session = await this.createValidationSession(sessionId, prInfo, taskContext);
      
      // Start validation process asynchronously
      this.runValidationProcess(session, options).catch(error => {
        console.error(`Validation process failed for session ${sessionId}:`, error);
        this.updateSessionStatus(sessionId, 'failed', error.message);
      });
      
      return session;
    } catch (error) {
      console.error(`Failed to start validation session ${sessionId}:`, error);
      throw error;
    }
  }

  async deployPRToEnvironment(
    prUrl: string,
    branchName: string,
    options: { projectId?: string; wsl2Config?: any } = {}
  ): Promise<DeploymentResult> {
    const projectId = options.projectId || `pr-${Date.now()}`;
    
    try {
      console.log(`Deploying PR to environment: ${prUrl}#${branchName}`);
      
      // Create or get WSL2 instance
      const instance = await this.wsl2Manager.createInstance(projectId, options.wsl2Config);
      
      // Deploy PR to instance
      const deploymentResult = await this.wsl2Manager.deployPRToInstance(
        instance.instanceName,
        prUrl,
        branchName
      );
      
      return deploymentResult;
    } catch (error) {
      console.error(`Failed to deploy PR to environment:`, error);
      throw error;
    }
  }

  async runCodeAnalysis(
    deploymentPath: string,
    analysisOptions: any = {}
  ): Promise<any> {
    try {
      console.log(`Running code analysis on: ${deploymentPath}`);
      
      const analysisResult = await this.agentApiClient.analyzeCode(
        deploymentPath,
        analysisOptions
      );
      
      return analysisResult;
    } catch (error) {
      console.error(`Code analysis failed:`, error);
      throw error;
    }
  }

  async getValidationResults(taskId: string): Promise<ValidationSession[]> {
    try {
      const result = await db.query<ValidationSession>(
        `SELECT vs.*, vsc.overall_score, vsc.grade, vsc.strengths, vsc.weaknesses
         FROM validation_sessions vs
         LEFT JOIN validation_scores vsc ON vs.id = vsc.validation_session_id
         WHERE vs.task_id = $1
         ORDER BY vs.started_at DESC`,
        [taskId]
      );
      
      return result.rows;
    } catch (error) {
      console.error(`Failed to get validation results for task ${taskId}:`, error);
      throw error;
    }
  }

  async getValidationSession(sessionId: string): Promise<ValidationSession | null> {
    try {
      const result = await db.query<ValidationSession>(
        'SELECT * FROM validation_sessions WHERE id = $1',
        [sessionId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Failed to get validation session ${sessionId}:`, error);
      throw error;
    }
  }

  async cancelValidation(sessionId: string): Promise<boolean> {
    try {
      console.log(`Cancelling validation session: ${sessionId}`);
      
      // Update session status
      await this.updateSessionStatus(sessionId, 'cancelled');
      
      // Try to cancel AgentAPI request
      await this.agentApiClient.cancelValidation(sessionId);
      
      return true;
    } catch (error) {
      console.error(`Failed to cancel validation session ${sessionId}:`, error);
      return false;
    }
  }

  async getValidationMetrics(): Promise<ValidationMetrics> {
    try {
      const [sessionsResult, scoresResult, instancesResult] = await Promise.all([
        db.query(`
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_sessions,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions,
            AVG(validation_duration_ms) as avg_validation_time
          FROM validation_sessions
          WHERE started_at >= NOW() - INTERVAL '24 hours'
        `),
        db.query(`
          SELECT AVG(overall_score) as avg_score
          FROM validation_scores
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        `),
        db.query(`
          SELECT COUNT(*) as active_instances
          FROM wsl2_instances
          WHERE status IN ('creating', 'running')
        `),
      ]);

      const sessionStats = sessionsResult.rows[0];
      const scoreStats = scoresResult.rows[0];
      const instanceStats = instancesResult.rows[0];

      return {
        totalSessions: parseInt(sessionStats.total_sessions) || 0,
        successfulSessions: parseInt(sessionStats.successful_sessions) || 0,
        failedSessions: parseInt(sessionStats.failed_sessions) || 0,
        averageValidationTime: parseFloat(sessionStats.avg_validation_time) || 0,
        averageScore: parseFloat(scoreStats.avg_score) || 0,
        activeInstances: parseInt(instanceStats.active_instances) || 0,
      };
    } catch (error) {
      console.error('Failed to get validation metrics:', error);
      throw error;
    }
  }

  private async runValidationProcess(
    session: ValidationSession,
    options: ValidationOptions
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update status to deploying
      await this.updateSessionStatus(session.id, 'deploying');
      
      // Deploy PR to WSL2 instance
      const deploymentResult = await this.deployPRToEnvironment(
        session.prInfo.url,
        session.prInfo.branchName,
        { projectId: session.id }
      );
      
      if (!deploymentResult.success) {
        throw new Error(`Deployment failed: ${deploymentResult.error}`);
      }
      
      // Update session with deployment info
      await db.query(
        `UPDATE validation_sessions 
         SET wsl2_instance_id = $1, deployment_path = $2 
         WHERE id = $3`,
        [deploymentResult.instanceName, deploymentResult.deploymentPath, session.id]
      );
      
      // Update status to validating
      await this.updateSessionStatus(session.id, 'validating');
      
      // Run validation through AgentAPI
      const validationResult = await this.agentApiClient.validateCode(
        deploymentResult.deploymentPath,
        options
      );
      
      // Store validation results
      await this.storeValidationResults(session.id, validationResult);
      
      // Update session status to completed
      const duration = Date.now() - startTime;
      await db.query(
        `UPDATE validation_sessions 
         SET status = $1, completed_at = NOW(), validation_duration_ms = $2 
         WHERE id = $3`,
        ['completed', duration, session.id]
      );
      
      console.log(`Validation session completed: ${session.id} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await db.query(
        `UPDATE validation_sessions 
         SET status = $1, completed_at = NOW(), validation_duration_ms = $2, metadata = metadata || $3
         WHERE id = $4`,
        ['failed', duration, JSON.stringify({ error: errorMessage }), session.id]
      );
      
      console.error(`Validation session failed: ${session.id}`, error);
      throw error;
    }
  }

  private async createValidationSession(
    sessionId: string,
    prInfo: PRInfo,
    taskContext: TaskContext
  ): Promise<ValidationSession> {
    const result = await db.query<ValidationSession>(
      `INSERT INTO validation_sessions 
       (id, task_id, pr_url, pr_number, branch_name, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        sessionId,
        taskContext.taskId,
        prInfo.url,
        prInfo.number,
        prInfo.branchName,
        'pending',
        JSON.stringify({
          repository: prInfo.repository,
          owner: prInfo.owner,
          taskTitle: taskContext.title,
          taskDescription: taskContext.description,
          priority: taskContext.priority,
          ...taskContext.metadata,
        }),
      ]
    );

    return result.rows[0];
  }

  private async updateSessionStatus(
    sessionId: string,
    status: ValidationSession['status'],
    error?: string
  ): Promise<void> {
    const metadata = error ? JSON.stringify({ error }) : '{}';
    
    await db.query(
      `UPDATE validation_sessions 
       SET status = $1, metadata = metadata || $2::jsonb
       WHERE id = $3`,
      [status, metadata, sessionId]
    );
  }

  private async storeValidationResults(
    sessionId: string,
    validationResult: ValidationResult
  ): Promise<void> {
    await db.transaction(async (client) => {
      // Store validation scores
      await client.query(
        `INSERT INTO validation_scores 
         (validation_session_id, overall_score, code_quality_score, functionality_score, 
          testing_score, documentation_score, grade, strengths, weaknesses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          sessionId,
          validationResult.overallScore,
          validationResult.scores.codeQuality,
          validationResult.scores.functionality,
          validationResult.scores.testing,
          validationResult.scores.documentation,
          validationResult.grade,
          validationResult.strengths,
          validationResult.weaknesses,
        ]
      );

      // Store validation feedback
      for (const feedback of validationResult.feedback) {
        await client.query(
          `INSERT INTO validation_feedback 
           (validation_session_id, feedback_type, category, title, message, 
            severity, file_path, line_number, suggestions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sessionId,
            feedback.type,
            feedback.category,
            feedback.title,
            feedback.message,
            feedback.severity,
            feedback.filePath,
            feedback.lineNumber,
            feedback.suggestions,
          ]
        );
      }
    });
  }

  // Health check for the entire validation system
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    components: {
      agentapi: boolean;
      wsl2: boolean;
      database: boolean;
    };
    metrics: ValidationMetrics;
  }> {
    try {
      const [agentApiHealth, wsl2Health, dbHealth, metrics] = await Promise.all([
        this.agentApiClient.testConnection(),
        this.wsl2Manager.healthCheck(),
        db.healthCheck(),
        this.getValidationMetrics(),
      ]);

      const components = {
        agentapi: agentApiHealth,
        wsl2: wsl2Health.available,
        database: dbHealth,
      };

      const healthyComponents = Object.values(components).filter(Boolean).length;
      const totalComponents = Object.keys(components).length;

      let status: 'healthy' | 'unhealthy' | 'degraded';
      if (healthyComponents === totalComponents) {
        status = 'healthy';
      } else if (healthyComponents > 0) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        components,
        metrics,
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        components: {
          agentapi: false,
          wsl2: false,
          database: false,
        },
        metrics: {
          totalSessions: 0,
          successfulSessions: 0,
          failedSessions: 0,
          averageValidationTime: 0,
          averageScore: 0,
          activeInstances: 0,
        },
      };
    }
  }
}

