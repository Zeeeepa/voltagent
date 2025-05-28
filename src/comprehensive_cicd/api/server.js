/**
 * Comprehensive CI/CD API Server
 * Integrates codegen functionality with intelligent prompt generation and PR tracking
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const CodegenIntegration = require('../services/codegen-integration');
const TaskStorage = require('../database/task-storage');
const WorkflowOrchestrator = require('../workflows/orchestrator');
const MetricsCollector = require('../monitoring/metrics');

class ComprehensiveCICDServer {
    constructor(config = {}) {
        this.app = express();
        this.config = {
            port: config.port || process.env.PORT || 3000,
            corsOrigin: config.corsOrigin || process.env.CORS_ORIGIN || '*',
            rateLimit: config.rateLimit || {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100 // limit each IP to 100 requests per windowMs
            },
            ...config
        };

        this.codegenIntegration = new CodegenIntegration();
        this.taskStorage = new TaskStorage();
        this.workflowOrchestrator = new WorkflowOrchestrator();
        this.metricsCollector = new MetricsCollector();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS configuration
        this.app.use(cors({
            origin: this.config.corsOrigin,
            credentials: true
        }));

        // Rate limiting
        this.app.use(rateLimit(this.config.rateLimit));

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging and metrics
        this.app.use((req, res, next) => {
            req.requestId = uuidv4();
            req.startTime = Date.now();
            
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${req.requestId}`);
            
            res.on('finish', () => {
                const duration = Date.now() - req.startTime;
                this.metricsCollector.recordRequest(req.method, req.path, res.statusCode, duration);
            });
            
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // API v1 routes
        this.setupV1Routes();

        // Metrics endpoint
        this.app.get('/metrics', async (req, res) => {
            try {
                const metrics = await this.metricsCollector.getMetrics();
                res.json(metrics);
            } catch (error) {
                console.error('Error fetching metrics:', error);
                res.status(500).json({ error: 'Failed to fetch metrics' });
            }
        });
    }

    setupV1Routes() {
        const router = express.Router();

        // Codegen Integration Endpoints
        
        /**
         * Generate intelligent prompt from task context
         * POST /api/v1/codegen/generate-prompt
         */
        router.post('/codegen/generate-prompt', async (req, res) => {
            try {
                const { task_id, context_options = {} } = req.body;
                
                if (!task_id) {
                    return res.status(400).json({
                        error: 'task_id is required',
                        requestId: req.requestId
                    });
                }

                console.log(`[${req.requestId}] Generating prompt for task: ${task_id}`);
                
                // Retrieve task context from storage
                const taskContext = await this.taskStorage.getTaskContext(task_id);
                if (!taskContext) {
                    return res.status(404).json({
                        error: 'Task not found',
                        requestId: req.requestId
                    });
                }

                // Generate intelligent prompt
                const promptResult = await this.codegenIntegration.generatePrompt(
                    taskContext, 
                    context_options
                );

                // Store prompt generation request
                await this.taskStorage.storeCodegenRequest({
                    task_id,
                    prompt_data: promptResult,
                    status: 'prompt_generated',
                    request_id: req.requestId
                });

                this.metricsCollector.recordPromptGeneration(true, Date.now() - req.startTime);

                res.json({
                    success: true,
                    requestId: req.requestId,
                    prompt: promptResult,
                    task_id
                });

            } catch (error) {
                console.error(`[${req.requestId}] Error generating prompt:`, error);
                this.metricsCollector.recordPromptGeneration(false, Date.now() - req.startTime);
                
                res.status(500).json({
                    error: 'Failed to generate prompt',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });

        /**
         * Create PR using codegen API
         * POST /api/v1/codegen/create-pr
         */
        router.post('/codegen/create-pr', async (req, res) => {
            try {
                const { task_id, prompt_data, options = {} } = req.body;
                
                if (!task_id || !prompt_data) {
                    return res.status(400).json({
                        error: 'task_id and prompt_data are required',
                        requestId: req.requestId
                    });
                }

                console.log(`[${req.requestId}] Creating PR for task: ${task_id}`);

                // Create PR through codegen integration
                const prResult = await this.codegenIntegration.createPR(
                    task_id,
                    prompt_data,
                    options
                );

                // Update codegen request with PR information
                await this.taskStorage.updateCodegenRequest(task_id, {
                    response_data: prResult,
                    pr_url: prResult.pr_url,
                    pr_number: prResult.pr_number,
                    status: 'pr_created',
                    completed_at: new Date()
                });

                // Trigger workflow orchestration for validation
                await this.workflowOrchestrator.triggerValidationWorkflow(task_id, prResult);

                this.metricsCollector.recordPRCreation(true, Date.now() - req.startTime);

                res.json({
                    success: true,
                    requestId: req.requestId,
                    pr_result: prResult,
                    task_id
                });

            } catch (error) {
                console.error(`[${req.requestId}] Error creating PR:`, error);
                this.metricsCollector.recordPRCreation(false, Date.now() - req.startTime);

                // Update request status to failed
                try {
                    await this.taskStorage.updateCodegenRequest(task_id, {
                        status: 'failed',
                        error_message: error.message,
                        completed_at: new Date()
                    });
                } catch (updateError) {
                    console.error('Failed to update request status:', updateError);
                }
                
                res.status(500).json({
                    error: 'Failed to create PR',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });

        /**
         * Get codegen request status
         * GET /api/v1/codegen/status/:task_id
         */
        router.get('/codegen/status/:task_id', async (req, res) => {
            try {
                const { task_id } = req.params;
                
                const status = await this.taskStorage.getCodegenRequestStatus(task_id);
                if (!status) {
                    return res.status(404).json({
                        error: 'Codegen request not found',
                        requestId: req.requestId
                    });
                }

                res.json({
                    success: true,
                    requestId: req.requestId,
                    status
                });

            } catch (error) {
                console.error(`[${req.requestId}] Error fetching status:`, error);
                res.status(500).json({
                    error: 'Failed to fetch status',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });

        /**
         * Retry failed codegen request
         * POST /api/v1/codegen/retry/:task_id
         */
        router.post('/codegen/retry/:task_id', async (req, res) => {
            try {
                const { task_id } = req.params;
                const { retry_options = {} } = req.body;

                console.log(`[${req.requestId}] Retrying codegen for task: ${task_id}`);

                const retryResult = await this.codegenIntegration.retryRequest(
                    task_id,
                    retry_options
                );

                this.metricsCollector.recordRetry(task_id, retryResult.success);

                res.json({
                    success: true,
                    requestId: req.requestId,
                    retry_result: retryResult,
                    task_id
                });

            } catch (error) {
                console.error(`[${req.requestId}] Error retrying request:`, error);
                this.metricsCollector.recordRetry(req.params.task_id, false);
                
                res.status(500).json({
                    error: 'Failed to retry request',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });

        // Task Management Endpoints

        /**
         * Create new task
         * POST /api/v1/tasks
         */
        router.post('/tasks', async (req, res) => {
            try {
                const taskData = req.body;
                const task = await this.taskStorage.createTask(taskData);

                res.status(201).json({
                    success: true,
                    requestId: req.requestId,
                    task
                });

            } catch (error) {
                console.error(`[${req.requestId}] Error creating task:`, error);
                res.status(500).json({
                    error: 'Failed to create task',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });

        /**
         * Get task by ID
         * GET /api/v1/tasks/:task_id
         */
        router.get('/tasks/:task_id', async (req, res) => {
            try {
                const { task_id } = req.params;
                const task = await this.taskStorage.getTask(task_id);

                if (!task) {
                    return res.status(404).json({
                        error: 'Task not found',
                        requestId: req.requestId
                    });
                }

                res.json({
                    success: true,
                    requestId: req.requestId,
                    task
                });

            } catch (error) {
                console.error(`[${req.requestId}] Error fetching task:`, error);
                res.status(500).json({
                    error: 'Failed to fetch task',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });

        this.app.use('/api/v1', router);
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.path,
                method: req.method
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            
            res.status(500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
                requestId: req.requestId
            });
        });
    }

    async start() {
        try {
            // Initialize services
            await this.taskStorage.initialize();
            await this.codegenIntegration.initialize();
            await this.workflowOrchestrator.initialize();
            await this.metricsCollector.initialize();

            // Start server
            this.server = this.app.listen(this.config.port, () => {
                console.log(`🚀 Comprehensive CI/CD Server running on port ${this.config.port}`);
                console.log(`📊 Metrics available at http://localhost:${this.config.port}/metrics`);
                console.log(`🏥 Health check at http://localhost:${this.config.port}/health`);
            });

            return this.server;
        } catch (error) {
            console.error('Failed to start server:', error);
            throw error;
        }
    }

    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(resolve);
            });
        }
    }
}

module.exports = ComprehensiveCICDServer;

