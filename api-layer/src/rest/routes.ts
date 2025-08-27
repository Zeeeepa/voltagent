import { Application, Request, Response } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authorize } from '../auth/authMiddleware';
import { logger } from '../common/logger';

// Define Swagger options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Workflow Orchestration API',
      version: '1.0.0',
      description: 'API for the Parallel Workflow Orchestration Framework',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/rest/routes.ts', './src/rest/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Setup REST API routes
 */
export const setupRestRoutes = (app: Application) => {
  // API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // API version endpoint
  app.get('/api/version', (req: Request, res: Response) => {
    res.json({
      version: '1.0.0',
      name: 'Workflow Orchestration API',
      description: 'API for the Parallel Workflow Orchestration Framework',
    });
  });

  // API health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Workflow definition routes
  /**
   * @swagger
   * /workflows:
   *   get:
   *     summary: Get all workflow definitions
   *     tags: [Workflows]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Maximum number of workflows to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *         description: Number of workflows to skip
   *     responses:
   *       200:
   *         description: List of workflow definitions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/WorkflowDefinition'
   */
  app.get('/api/workflows', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      logger.info(`Fetching workflow definitions with limit: ${limit}, offset: ${offset}`);
      
      // Placeholder implementation
      res.json([
        {
          id: '1',
          name: 'Sample Workflow',
          description: 'A sample workflow definition',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          tasks: [],
          synchronizationPoints: []
        }
      ]);
    } catch (error) {
      logger.error('Error fetching workflow definitions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /workflows/{id}:
   *   get:
   *     summary: Get a workflow definition by ID
   *     tags: [Workflows]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workflow definition ID
   *     responses:
   *       200:
   *         description: Workflow definition
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkflowDefinition'
   *       404:
   *         description: Workflow definition not found
   */
  app.get('/api/workflows/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      logger.info(`Fetching workflow definition with ID: ${id}`);
      
      // Placeholder implementation
      res.json({
        id,
        name: 'Sample Workflow',
        description: 'A sample workflow definition',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
        synchronizationPoints: []
      });
    } catch (error) {
      logger.error(`Error fetching workflow definition: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /workflows:
   *   post:
   *     summary: Create a new workflow definition
   *     tags: [Workflows]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateWorkflowDefinitionInput'
   *     responses:
   *       201:
   *         description: Workflow definition created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkflowDefinition'
   *       400:
   *         description: Invalid input
   */
  app.post('/api/workflows', authorize(['admin', 'workflow-designer']), (req: Request, res: Response) => {
    try {
      const input = req.body;
      logger.info(`Creating workflow definition: ${input.name}`);
      
      // Placeholder implementation
      res.status(201).json({
        id: '1',
        name: input.name,
        description: input.description,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: input.tasks || [],
        synchronizationPoints: input.synchronizationPoints || []
      });
    } catch (error) {
      logger.error(`Error creating workflow definition: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /workflows/{id}:
   *   put:
   *     summary: Update a workflow definition
   *     tags: [Workflows]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workflow definition ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateWorkflowDefinitionInput'
   *     responses:
   *       200:
   *         description: Workflow definition updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkflowDefinition'
   *       404:
   *         description: Workflow definition not found
   */
  app.put('/api/workflows/:id', authorize(['admin', 'workflow-designer']), (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const input = req.body;
      logger.info(`Updating workflow definition with ID: ${id}`);
      
      // Placeholder implementation
      res.json({
        id,
        name: input.name || 'Updated Workflow',
        description: input.description || 'An updated workflow definition',
        version: '1.0.1',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(),
        tasks: input.tasks || [],
        synchronizationPoints: input.synchronizationPoints || []
      });
    } catch (error) {
      logger.error(`Error updating workflow definition: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /workflows/{id}:
   *   delete:
   *     summary: Delete a workflow definition
   *     tags: [Workflows]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workflow definition ID
   *     responses:
   *       204:
   *         description: Workflow definition deleted
   *       404:
   *         description: Workflow definition not found
   */
  app.delete('/api/workflows/:id', authorize(['admin']), (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      logger.info(`Deleting workflow definition with ID: ${id}`);
      
      // Placeholder implementation
      res.status(204).end();
    } catch (error) {
      logger.error(`Error deleting workflow definition: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Workflow execution routes
  /**
   * @swagger
   * /executions:
   *   post:
   *     summary: Start a new workflow execution
   *     tags: [Executions]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StartWorkflowExecutionInput'
   *     responses:
   *       201:
   *         description: Workflow execution started
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkflowExecution'
   *       400:
   *         description: Invalid input
   */
  app.post('/api/executions', (req: Request, res: Response) => {
    try {
      const input = req.body;
      logger.info(`Starting workflow execution for definition ID: ${input.workflowDefinitionId}`);
      
      // Placeholder implementation
      res.status(201).json({
        id: '1',
        workflowDefinitionId: input.workflowDefinitionId,
        status: 'RUNNING',
        startTime: new Date(),
        endTime: null,
        taskExecutions: [],
        context: {
          id: '1',
          data: input.initialContext || '{}',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error(`Error starting workflow execution: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /executions/{id}:
   *   get:
   *     summary: Get a workflow execution by ID
   *     tags: [Executions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workflow execution ID
   *     responses:
   *       200:
   *         description: Workflow execution
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkflowExecution'
   *       404:
   *         description: Workflow execution not found
   */
  app.get('/api/executions/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      logger.info(`Fetching workflow execution with ID: ${id}`);
      
      // Placeholder implementation
      res.json({
        id,
        workflowDefinitionId: '1',
        status: 'RUNNING',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: null,
        taskExecutions: [],
        context: {
          id: '1',
          data: '{}',
          version: 1,
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 1800000) // 30 minutes ago
        }
      });
    } catch (error) {
      logger.error(`Error fetching workflow execution: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /executions/{id}/cancel:
   *   post:
   *     summary: Cancel a workflow execution
   *     tags: [Executions]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workflow execution ID
   *     responses:
   *       200:
   *         description: Workflow execution cancelled
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkflowExecution'
   *       404:
   *         description: Workflow execution not found
   */
  app.post('/api/executions/:id/cancel', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      logger.info(`Cancelling workflow execution with ID: ${id}`);
      
      // Placeholder implementation
      res.json({
        id,
        workflowDefinitionId: '1',
        status: 'CANCELLED',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(),
        taskExecutions: [],
        context: {
          id: '1',
          data: '{}',
          version: 1,
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error(`Error cancelling workflow execution: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Task execution routes
  /**
   * @swagger
   * /executions/{executionId}/tasks:
   *   get:
   *     summary: Get all task executions for a workflow execution
   *     tags: [Tasks]
   *     parameters:
   *       - in: path
   *         name: executionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Workflow execution ID
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, WAITING]
   *         description: Filter by task status
   *     responses:
   *       200:
   *         description: List of task executions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/TaskExecution'
   *       404:
   *         description: Workflow execution not found
   */
  app.get('/api/executions/:executionId/tasks', (req: Request, res: Response) => {
    try {
      const executionId = req.params.executionId;
      const status = req.query.status as string;
      logger.info(`Fetching task executions for workflow execution ID: ${executionId}, status: ${status}`);
      
      // Placeholder implementation
      res.json([
        {
          id: '1',
          taskDefinitionId: '1',
          status: status || 'RUNNING',
          startTime: new Date(Date.now() - 1800000), // 30 minutes ago
          endTime: null,
          attempts: 1,
          error: null,
          resources: null
        }
      ]);
    } catch (error) {
      logger.error(`Error fetching task executions: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /tasks/{id}/retry:
   *   post:
   *     summary: Retry a failed task execution
   *     tags: [Tasks]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Task execution ID
   *     responses:
   *       200:
   *         description: Task execution retried
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TaskExecution'
   *       404:
   *         description: Task execution not found
   */
  app.post('/api/tasks/:id/retry', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      logger.info(`Retrying task execution with ID: ${id}`);
      
      // Placeholder implementation
      res.json({
        id,
        taskDefinitionId: '1',
        status: 'RUNNING',
        startTime: new Date(),
        endTime: null,
        attempts: 2,
        error: null,
        resources: null
      });
    } catch (error) {
      logger.error(`Error retrying task execution: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Progress tracking routes
  /**
   * @swagger
   * /executions/{id}/progress:
   *   get:
   *     summary: Get progress report for a workflow execution
   *     tags: [Progress]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Workflow execution ID
   *     responses:
   *       200:
   *         description: Progress report
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProgressReport'
   *       404:
   *         description: Workflow execution not found
   */
  app.get('/api/executions/:id/progress', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      logger.info(`Fetching progress report for workflow execution ID: ${id}`);
      
      // Placeholder implementation
      res.json({
        id: '1',
        workflowExecutionId: id,
        completedTasks: 2,
        totalTasks: 5,
        estimatedCompletion: new Date(Date.now() + 3600000), // 1 hour from now
        blockers: [],
        milestones: [
          {
            id: '1',
            name: 'Initialization',
            description: 'Workflow initialization',
            achieved: true,
            achievedAt: new Date(Date.now() - 1800000) // 30 minutes ago
          }
        ]
      });
    } catch (error) {
      logger.error(`Error fetching progress report: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Webhook routes
  /**
   * @swagger
   * /webhooks:
   *   get:
   *     summary: Get all webhook registrations
   *     tags: [Webhooks]
   *     responses:
   *       200:
   *         description: List of webhook registrations
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/WebhookRegistration'
   */
  app.get('/api/webhooks', authorize(['admin', 'integration-manager']), (req: Request, res: Response) => {
    try {
      logger.info('Fetching webhook registrations');
      
      // Placeholder implementation
      res.json([
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['workflow.completed', 'task.failed'],
          secret: null,
          active: true,
          createdAt: new Date(Date.now() - 86400000) // 1 day ago
        }
      ]);
    } catch (error) {
      logger.error(`Error fetching webhook registrations: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /webhooks:
   *   post:
   *     summary: Register a new webhook
   *     tags: [Webhooks]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterWebhookInput'
   *     responses:
   *       201:
   *         description: Webhook registered
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WebhookRegistration'
   *       400:
   *         description: Invalid input
   */
  app.post('/api/webhooks', authorize(['admin', 'integration-manager']), (req: Request, res: Response) => {
    try {
      const input = req.body;
      logger.info(`Registering webhook for URL: ${input.url}`);
      
      // Placeholder implementation
      res.status(201).json({
        id: '1',
        url: input.url,
        events: input.events,
        secret: input.secret,
        active: true,
        createdAt: new Date()
      });
    } catch (error) {
      logger.error(`Error registering webhook: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /webhooks/{id}:
   *   put:
   *     summary: Update a webhook registration
   *     tags: [Webhooks]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Webhook registration ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateWebhookInput'
   *     responses:
   *       200:
   *         description: Webhook updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WebhookRegistration'
   *       404:
   *         description: Webhook registration not found
   */
  app.put('/api/webhooks/:id', authorize(['admin', 'integration-manager']), (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const input = req.body;
      logger.info(`Updating webhook with ID: ${id}`);
      
      // Placeholder implementation
      res.json({
        id,
        url: input.url || 'https://example.com/webhook',
        events: input.events || ['workflow.completed'],
        secret: input.secret,
        active: input.active !== undefined ? input.active : true,
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      });
    } catch (error) {
      logger.error(`Error updating webhook: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /webhooks/{id}:
   *   delete:
   *     summary: Delete a webhook registration
   *     tags: [Webhooks]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Webhook registration ID
   *     responses:
   *       204:
   *         description: Webhook deleted
   *       404:
   *         description: Webhook registration not found
   */
  app.delete('/api/webhooks/:id', authorize(['admin', 'integration-manager']), (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      logger.info(`Deleting webhook with ID: ${id}`);
      
      // Placeholder implementation
      res.status(204).end();
    } catch (error) {
      logger.error(`Error deleting webhook: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
};

