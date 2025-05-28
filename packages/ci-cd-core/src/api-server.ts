import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { TaskStorageManager, ContextEngine } from '@voltagent/task-storage';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  ContextType,
  InteractionType,
  ValidationType,
  MetricType,
} from '@voltagent/task-storage';

export interface ApiServerOptions {
  port?: number;
  host?: string;
  enableCors?: boolean;
  enableCompression?: boolean;
  enableWebSocket?: boolean;
  taskStorage: TaskStorageManager;
  contextEngine: ContextEngine;
}

export class ApiServer {
  private app: express.Application;
  private server: any;
  private wss?: WebSocketServer;
  private taskStorage: TaskStorageManager;
  private contextEngine: ContextEngine;
  private options: Required<ApiServerOptions>;

  constructor(options: ApiServerOptions) {
    this.options = {
      port: 3000,
      host: '0.0.0.0',
      enableCors: true,
      enableCompression: true,
      enableWebSocket: true,
      ...options,
    };

    this.taskStorage = options.taskStorage;
    this.contextEngine = options.contextEngine;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    if (this.options.enableCors) {
      this.app.use(cors());
    }

    // Compression
    if (this.options.enableCompression) {
      this.app.use(compression());
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[CI/CD API] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const isHealthy = await this.taskStorage.healthCheck();
        const poolStats = this.taskStorage.getPoolStats();
        const cacheStats = this.contextEngine.getCacheStats();

        res.json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          database: {
            healthy: isHealthy,
            pool: poolStats,
          },
          cache: cacheStats,
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Task Management Endpoints
    this.setupTaskRoutes();
    
    // Context Management Endpoints
    this.setupContextRoutes();
    
    // AI Interaction Endpoints
    this.setupInteractionRoutes();
    
    // Validation Endpoints
    this.setupValidationRoutes();
    
    // Analytics Endpoints
    this.setupAnalyticsRoutes();

    // Error handling
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[CI/CD API] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
      });
    });
  }

  private setupTaskRoutes(): void {
    const router = express.Router();

    // Create task
    router.post('/', async (req: Request, res: Response) => {
      try {
        const task = await this.taskStorage.createTask(req.body as CreateTaskInput);
        res.status(201).json(task);
        this.broadcastUpdate('task_created', task);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to create task',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get task by ID
    router.get('/:id', async (req: Request, res: Response) => {
      try {
        const task = await this.taskStorage.getTask(req.params.id);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get task',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Update task
    router.put('/:id', async (req: Request, res: Response) => {
      try {
        const task = await this.taskStorage.updateTask(req.params.id, req.body as UpdateTaskInput);
        res.json(task);
        this.broadcastUpdate('task_updated', task);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to update task',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Update task status
    router.put('/:id/status', async (req: Request, res: Response) => {
      try {
        const { status, context } = req.body;
        const task = await this.taskStorage.updateTaskStatus(req.params.id, status, context);
        res.json(task);
        this.broadcastUpdate('task_status_updated', { task, status, context });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to update task status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Delete task
    router.delete('/:id', async (req: Request, res: Response) => {
      try {
        await this.taskStorage.deleteTask(req.params.id);
        res.status(204).send();
        this.broadcastUpdate('task_deleted', { id: req.params.id });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to delete task',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get tasks with filtering
    router.get('/', async (req: Request, res: Response) => {
      try {
        const filter: TaskFilter = {};
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;

        // Build filter from query parameters
        if (req.query.status) filter.status = req.query.status as any;
        if (req.query.priority) filter.priority = req.query.priority as any;
        if (req.query.assigned_to) filter.assigned_to = req.query.assigned_to as string;
        if (req.query.project_id) filter.project_id = req.query.project_id as string;
        if (req.query.workflow_id) filter.workflow_id = req.query.workflow_id as string;
        if (req.query.parent_task_id) filter.parent_task_id = req.query.parent_task_id as string;
        if (req.query.tags) {
          filter.tags = Array.isArray(req.query.tags) 
            ? req.query.tags as string[]
            : [req.query.tags as string];
        }

        const tasks = await this.taskStorage.getTasks(filter, limit, offset);
        res.json({
          tasks,
          pagination: {
            limit,
            offset,
            count: tasks.length,
          },
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get tasks',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Create task dependency
    router.post('/:id/dependencies', async (req: Request, res: Response) => {
      try {
        const { child_task_id, dependency_type, metadata } = req.body;
        const dependency = await this.taskStorage.createTaskDependency(
          req.params.id,
          child_task_id,
          dependency_type,
          metadata
        );
        res.status(201).json(dependency);
        this.broadcastUpdate('dependency_created', dependency);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to create task dependency',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.use('/api/v1/tasks', router);
  }

  private setupContextRoutes(): void {
    const router = express.Router();

    // Store task context
    router.post('/:id/context', async (req: Request, res: Response) => {
      try {
        const { context_type, context_data, version } = req.body;
        const context = await this.contextEngine.storeTaskContext(
          req.params.id,
          context_type as ContextType,
          context_data,
          version
        );
        res.status(201).json(context);
        this.broadcastUpdate('context_stored', context);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to store context',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get task context
    router.get('/:id/context/:type', async (req: Request, res: Response) => {
      try {
        const version = req.query.version ? parseInt(req.query.version as string) : undefined;
        const context = await this.contextEngine.getTaskContext(
          req.params.id,
          req.params.type as ContextType,
          version
        );
        if (!context) {
          return res.status(404).json({ error: 'Context not found' });
        }
        res.json(context);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get context',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get full task context
    router.get('/:id/context/full', async (req: Request, res: Response) => {
      try {
        const context = await this.contextEngine.getTaskFullContext(req.params.id);
        res.json(context);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get full context',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get latest context
    router.get('/:id/context/latest', async (req: Request, res: Response) => {
      try {
        const context = await this.contextEngine.getTaskLatestContext(req.params.id);
        res.json(context);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get latest context',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get context history
    router.get('/:id/context/:type/history', async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const history = await this.contextEngine.getContextHistory(
          req.params.id,
          req.params.type as ContextType,
          limit
        );
        res.json(history);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get context history',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Search context
    router.get('/search', async (req: Request, res: Response) => {
      try {
        const { q, type, limit } = req.query;
        const results = await this.contextEngine.searchContext(
          q as string,
          type as ContextType,
          limit ? parseInt(limit as string) : undefined
        );
        res.json(results);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to search context',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Delete task context
    router.delete('/:id/context/:type', async (req: Request, res: Response) => {
      try {
        const version = req.query.version ? parseInt(req.query.version as string) : undefined;
        await this.contextEngine.deleteTaskContext(
          req.params.id,
          req.params.type as ContextType,
          version
        );
        res.status(204).send();
        this.broadcastUpdate('context_deleted', {
          task_id: req.params.id,
          context_type: req.params.type,
          version,
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to delete context',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.use('/api/v1/tasks', router);
  }

  private setupInteractionRoutes(): void {
    const router = express.Router();

    // Store AI interaction
    router.post('/:id/interactions', async (req: Request, res: Response) => {
      try {
        const {
          agent_name,
          interaction_type,
          request_data,
          response_data,
          execution_time_ms,
          success,
          session_id,
          workflow_step,
        } = req.body;

        const interaction = await this.taskStorage.storeAIInteraction(
          req.params.id,
          agent_name,
          interaction_type as InteractionType,
          request_data,
          response_data,
          execution_time_ms,
          success,
          session_id,
          workflow_step
        );

        res.status(201).json(interaction);
        this.broadcastUpdate('interaction_stored', interaction);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to store AI interaction',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.use('/api/v1/tasks', router);
  }

  private setupValidationRoutes(): void {
    const router = express.Router();

    // Store validation result
    router.post('/:id/validation', async (req: Request, res: Response) => {
      try {
        const {
          validation_type,
          validator_name,
          status,
          score,
          details,
          suggestions,
        } = req.body;

        const result = await this.taskStorage.storeValidationResult(
          req.params.id,
          validation_type as ValidationType,
          validator_name,
          status,
          score,
          details,
          suggestions
        );

        res.status(201).json(result);
        this.broadcastUpdate('validation_completed', result);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to store validation result',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Store performance metric
    router.post('/:id/metrics', async (req: Request, res: Response) => {
      try {
        const {
          metric_type,
          metric_name,
          metric_value,
          unit,
          metadata,
        } = req.body;

        const metric = await this.taskStorage.storePerformanceMetric(
          req.params.id,
          metric_type as MetricType,
          metric_name,
          metric_value,
          unit,
          metadata
        );

        res.status(201).json(metric);
        this.broadcastUpdate('metric_recorded', metric);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to store performance metric',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.use('/api/v1/tasks', router);
  }

  private setupAnalyticsRoutes(): void {
    const router = express.Router();

    // Get task analytics
    router.get('/tasks', async (req: Request, res: Response) => {
      try {
        const filter: TaskFilter = {};
        // Build filter from query parameters (similar to task routes)
        if (req.query.status) filter.status = req.query.status as any;
        if (req.query.priority) filter.priority = req.query.priority as any;
        if (req.query.project_id) filter.project_id = req.query.project_id as string;

        const analytics = await this.taskStorage.getTaskAnalytics(filter);
        res.json(analytics);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get task analytics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Get context statistics
    router.get('/context/:taskId?', async (req: Request, res: Response) => {
      try {
        const stats = await this.contextEngine.getContextStats(req.params.taskId);
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get context statistics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.use('/api/v1/analytics', router);
  }

  private broadcastUpdate(event: string, data: any): void {
    if (!this.wss) return;

    const message = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);

        // Setup WebSocket if enabled
        if (this.options.enableWebSocket) {
          this.wss = new WebSocketServer({ server: this.server });
          
          this.wss.on('connection', (ws) => {
            console.log('[CI/CD API] WebSocket client connected');
            
            ws.on('close', () => {
              console.log('[CI/CD API] WebSocket client disconnected');
            });

            ws.on('error', (error) => {
              console.error('[CI/CD API] WebSocket error:', error);
            });

            // Send welcome message
            ws.send(JSON.stringify({
              event: 'connected',
              data: { message: 'Connected to CI/CD API WebSocket' },
              timestamp: new Date().toISOString(),
            }));
          });
        }

        this.server.listen(this.options.port, this.options.host, () => {
          console.log(`[CI/CD API] Server running on http://${this.options.host}:${this.options.port}`);
          if (this.options.enableWebSocket) {
            console.log(`[CI/CD API] WebSocket server enabled`);
          }
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('[CI/CD API] Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
      }

      if (this.server) {
        this.server.close(() => {
          console.log('[CI/CD API] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

