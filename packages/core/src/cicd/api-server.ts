import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { VoltAgentWorkflowIntegration } from '../workflow';
import type {
  WorkflowCreateOptions,
  WorkflowProgressEvent,
  WorkflowCompletionEvent
} from '../workflow/types';

/**
 * Comprehensive CI/CD API Server with Workflow Orchestration
 */
export class CICDApiServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private workflowIntegration: VoltAgentWorkflowIntegration;
  private port: number;

  constructor(options: {
    port?: number;
    nlpEngine?: any;
    codegenIntegration?: any;
    validationEngine?: any;
    taskStorage?: any;
  } = {}) {
    this.port = options.port || 3000;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    // Initialize workflow integration
    this.workflowIntegration = new VoltAgentWorkflowIntegration({
      nlpEngine: options.nlpEngine,
      codegenIntegration: options.codegenIntegration,
      validationEngine: options.validationEngine,
      taskStorage: options.taskStorage
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const orchestrator = this.workflowIntegration.getOrchestrator();

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Workflow Management Endpoints
    this.app.post('/api/v1/workflows', async (req, res) => {
      try {
        const { requirement_text, project_context, options } = req.body;
        
        if (!requirement_text) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'requirement_text is required'
          });
        }

        const workflow = await orchestrator.createWorkflow(
          requirement_text,
          project_context || {},
          options || {}
        );
        
        res.status(201).json(workflow);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to create workflow',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/workflows/:id/start', async (req, res) => {
      try {
        const result = await orchestrator.startWorkflow(req.params.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to start workflow',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/workflows/:id/status', async (req, res) => {
      try {
        const status = await orchestrator.getWorkflowStatus(req.params.id);
        res.json(status);
      } catch (error) {
        res.status(404).json({
          error: 'Workflow not found',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/workflows/:id/pause', async (req, res) => {
      try {
        const result = await orchestrator.pauseWorkflow(req.params.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to pause workflow',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/workflows/:id/resume', async (req, res) => {
      try {
        const result = await orchestrator.resumeWorkflow(req.params.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to resume workflow',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/workflows/:id/cancel', async (req, res) => {
      try {
        const { reason } = req.body;
        const result = await orchestrator.cancelWorkflow(req.params.id, reason);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to cancel workflow',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Workflow Step Management
    this.app.post('/api/v1/workflows/:id/steps/:step_id/complete', async (req, res) => {
      try {
        const { result } = req.body;
        await orchestrator.completeWorkflowStep(req.params.id, req.params.step_id, result);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to complete workflow step',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/workflows/:id/steps/:step_id/fail', async (req, res) => {
      try {
        const { error } = req.body;
        await orchestrator.failWorkflowStep(req.params.id, req.params.step_id, error);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to fail workflow step',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Analytics and Monitoring
    this.app.get('/api/v1/analytics/workflows', (req, res) => {
      try {
        const analytics = orchestrator.getWorkflowAnalytics();
        res.json(analytics);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get workflow analytics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/analytics/events', (req, res) => {
      try {
        const eventBus = this.workflowIntegration.getEventBus();
        const statistics = eventBus.getEventStatistics();
        res.json(statistics);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get event statistics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/analytics/coordination', (req, res) => {
      try {
        const coordinator = this.workflowIntegration.getCoordinator();
        const metrics = coordinator.getCoordinationMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get coordination metrics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Workflow Events
    this.app.get('/api/v1/workflows/:id/events', (req, res) => {
      try {
        const { event_type, limit = 100 } = req.query;
        const eventBus = this.workflowIntegration.getEventBus();
        const events = eventBus.getWorkflowEvents(
          req.params.id,
          event_type as any,
          parseInt(limit as string)
        );
        res.json(events);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get workflow events',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Batch Operations
    this.app.post('/api/v1/workflows/batch/create', async (req, res) => {
      try {
        const { workflows } = req.body;
        
        if (!Array.isArray(workflows)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'workflows must be an array'
          });
        }

        const results = await Promise.allSettled(
          workflows.map(w => orchestrator.createWorkflow(
            w.requirement_text,
            w.project_context || {},
            w.options || {}
          ))
        );

        const successful = results
          .filter(r => r.status === 'fulfilled')
          .map(r => (r as PromiseFulfilledResult<any>).value);

        const failed = results
          .filter(r => r.status === 'rejected')
          .map(r => (r as PromiseRejectedResult).reason);

        res.json({
          successful: successful.length,
          failed: failed.length,
          results: successful,
          errors: failed
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to create workflows',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // System Information
    this.app.get('/api/v1/system/info', (req, res) => {
      const monitor = this.workflowIntegration.getMonitor();
      const activeWorkflows = monitor.getActiveWorkflows();
      
      res.json({
        system: 'VoltAgent CI/CD Orchestration',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        active_workflows: activeWorkflows.length,
        workflow_ids: activeWorkflows,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        node_version: process.version
      });
    });
  }

  /**
   * Setup WebSocket for real-time updates
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      console.log('WebSocket connection established');

      // Parse workflow ID from URL
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const workflowId = url.pathname.split('/').pop();

      if (!workflowId || workflowId === 'stream') {
        ws.close(1008, 'Workflow ID required');
        return;
      }

      // Subscribe to workflow events
      const eventBus = this.workflowIntegration.getEventBus();
      const unsubscribe = eventBus.subscribeToWorkflow(workflowId, (event) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: event.eventType,
            data: event
          }));
        }
      });

      // Handle WebSocket close
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        unsubscribe();
      });

      // Handle WebSocket errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        unsubscribe();
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        data: {
          workflow_id: workflowId,
          timestamp: new Date().toISOString()
        }
      }));
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🚀 CI/CD API Server running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🔄 Workflow API: http://localhost:${this.port}/api/v1/workflows`);
        console.log(`📈 Analytics: http://localhost:${this.port}/api/v1/analytics`);
        console.log(`🌐 WebSocket: ws://localhost:${this.port}/api/v1/workflows/{id}/stream`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          console.log('CI/CD API Server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Get the Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the workflow integration instance
   */
  getWorkflowIntegration(): VoltAgentWorkflowIntegration {
    return this.workflowIntegration;
  }
}

/**
 * Create and start a CI/CD API server
 */
export async function createCICDServer(options?: {
  port?: number;
  nlpEngine?: any;
  codegenIntegration?: any;
  validationEngine?: any;
  taskStorage?: any;
  autoStart?: boolean;
}): Promise<CICDApiServer> {
  const server = new CICDApiServer(options);
  
  if (options?.autoStart !== false) {
    await server.start();
  }
  
  return server;
}

export default CICDApiServer;

