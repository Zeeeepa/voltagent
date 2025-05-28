/**
 * Workflow Orchestrator
 * Coordinates the end-to-end CI/CD pipeline from task to validated PR
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class WorkflowOrchestrator extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            maxConcurrentWorkflows: config.maxConcurrentWorkflows || 5,
            workflowTimeout: config.workflowTimeout || 300000, // 5 minutes
            retryDelay: config.retryDelay || 5000, // 5 seconds
            enableValidation: config.enableValidation !== false,
            enableNotifications: config.enableNotifications !== false,
            ...config
        };

        this.activeWorkflows = new Map();
        this.workflowQueue = [];
        this.workflowHistory = new Map();
        this.initialized = false;
    }

    async initialize() {
        console.log('🔄 Initializing Workflow Orchestrator...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start workflow processor
        this.startWorkflowProcessor();
        
        this.initialized = true;
        console.log('✅ Workflow Orchestrator initialized successfully');
    }

    setupEventListeners() {
        // Listen for workflow events
        this.on('workflow:started', this.handleWorkflowStarted.bind(this));
        this.on('workflow:completed', this.handleWorkflowCompleted.bind(this));
        this.on('workflow:failed', this.handleWorkflowFailed.bind(this));
        this.on('workflow:timeout', this.handleWorkflowTimeout.bind(this));
        
        // Listen for step events
        this.on('step:started', this.handleStepStarted.bind(this));
        this.on('step:completed', this.handleStepCompleted.bind(this));
        this.on('step:failed', this.handleStepFailed.bind(this));
    }

    startWorkflowProcessor() {
        // Process queued workflows every second
        setInterval(() => {
            this.processWorkflowQueue();
        }, 1000);
    }

    /**
     * Trigger complete task-to-PR workflow
     */
    async triggerCompleteWorkflow(taskId, options = {}) {
        const workflowId = uuidv4();
        
        const workflow = {
            id: workflowId,
            type: 'complete_task_to_pr',
            task_id: taskId,
            status: 'queued',
            steps: [
                { name: 'validate_task', status: 'pending' },
                { name: 'generate_prompt', status: 'pending' },
                { name: 'create_pr', status: 'pending' },
                { name: 'validate_pr', status: 'pending' },
                { name: 'notify_completion', status: 'pending' }
            ],
            options,
            created_at: new Date(),
            started_at: null,
            completed_at: null,
            error: null,
            result: null
        };

        this.workflowQueue.push(workflow);
        this.workflowHistory.set(workflowId, workflow);
        
        console.log(`📋 Queued complete workflow ${workflowId} for task ${taskId}`);
        
        return {
            workflow_id: workflowId,
            status: 'queued',
            estimated_duration: '2-5 minutes'
        };
    }

    /**
     * Trigger validation workflow for existing PR
     */
    async triggerValidationWorkflow(taskId, prResult) {
        const workflowId = uuidv4();
        
        const workflow = {
            id: workflowId,
            type: 'pr_validation',
            task_id: taskId,
            pr_url: prResult.pr_url,
            pr_number: prResult.pr_number,
            status: 'queued',
            steps: [
                { name: 'analyze_pr', status: 'pending' },
                { name: 'run_tests', status: 'pending' },
                { name: 'code_review', status: 'pending' },
                { name: 'security_scan', status: 'pending' },
                { name: 'generate_feedback', status: 'pending' }
            ],
            options: { pr_result: prResult },
            created_at: new Date(),
            started_at: null,
            completed_at: null,
            error: null,
            result: null
        };

        this.workflowQueue.push(workflow);
        this.workflowHistory.set(workflowId, workflow);
        
        console.log(`🔍 Queued validation workflow ${workflowId} for PR ${prResult.pr_url}`);
        
        return {
            workflow_id: workflowId,
            status: 'queued',
            pr_url: prResult.pr_url
        };
    }

    async processWorkflowQueue() {
        // Check if we can start new workflows
        if (this.activeWorkflows.size >= this.config.maxConcurrentWorkflows) {
            return;
        }

        // Get next workflow from queue
        const workflow = this.workflowQueue.shift();
        if (!workflow) {
            return;
        }

        // Start the workflow
        await this.startWorkflow(workflow);
    }

    async startWorkflow(workflow) {
        try {
            workflow.status = 'running';
            workflow.started_at = new Date();
            
            this.activeWorkflows.set(workflow.id, workflow);
            this.emit('workflow:started', workflow);
            
            console.log(`🚀 Starting workflow ${workflow.id} (${workflow.type})`);
            
            // Set timeout for workflow
            const timeout = setTimeout(() => {
                this.emit('workflow:timeout', workflow);
            }, this.config.workflowTimeout);
            
            workflow.timeout = timeout;
            
            // Execute workflow based on type
            let result;
            switch (workflow.type) {
                case 'complete_task_to_pr':
                    result = await this.executeCompleteWorkflow(workflow);
                    break;
                case 'pr_validation':
                    result = await this.executeValidationWorkflow(workflow);
                    break;
                default:
                    throw new Error(`Unknown workflow type: ${workflow.type}`);
            }
            
            // Workflow completed successfully
            workflow.status = 'completed';
            workflow.completed_at = new Date();
            workflow.result = result;
            
            clearTimeout(workflow.timeout);
            this.activeWorkflows.delete(workflow.id);
            this.emit('workflow:completed', workflow);
            
        } catch (error) {
            console.error(`❌ Workflow ${workflow.id} failed:`, error);
            
            workflow.status = 'failed';
            workflow.completed_at = new Date();
            workflow.error = error.message;
            
            if (workflow.timeout) {
                clearTimeout(workflow.timeout);
            }
            
            this.activeWorkflows.delete(workflow.id);
            this.emit('workflow:failed', workflow);
        }
    }

    async executeCompleteWorkflow(workflow) {
        const { task_id, options } = workflow;
        const result = {};
        
        // Step 1: Validate Task
        await this.executeStep(workflow, 'validate_task', async () => {
            console.log(`📋 Validating task ${task_id}`);
            
            // Mock validation - in real implementation, this would check task completeness
            await this.delay(1000);
            
            result.task_validation = {
                valid: true,
                task_id,
                validated_at: new Date()
            };
        });

        // Step 2: Generate Prompt
        await this.executeStep(workflow, 'generate_prompt', async () => {
            console.log(`🧠 Generating prompt for task ${task_id}`);
            
            // This would integrate with the actual codegen service
            await this.delay(2000);
            
            result.prompt_generation = {
                success: true,
                prompt_id: uuidv4(),
                generated_at: new Date()
            };
        });

        // Step 3: Create PR
        await this.executeStep(workflow, 'create_pr', async () => {
            console.log(`🔧 Creating PR for task ${task_id}`);
            
            // This would integrate with the actual codegen service
            await this.delay(5000);
            
            result.pr_creation = {
                success: true,
                pr_url: `https://github.com/example/repo/pull/${Math.floor(Math.random() * 1000)}`,
                pr_number: Math.floor(Math.random() * 1000),
                created_at: new Date()
            };
        });

        // Step 4: Validate PR (if enabled)
        if (this.config.enableValidation) {
            await this.executeStep(workflow, 'validate_pr', async () => {
                console.log(`🔍 Validating PR for task ${task_id}`);
                
                await this.delay(3000);
                
                result.pr_validation = {
                    success: true,
                    validation_score: 0.95,
                    issues_found: 0,
                    validated_at: new Date()
                };
            });
        } else {
            this.markStepSkipped(workflow, 'validate_pr');
        }

        // Step 5: Send Notifications (if enabled)
        if (this.config.enableNotifications) {
            await this.executeStep(workflow, 'notify_completion', async () => {
                console.log(`📧 Sending completion notifications for task ${task_id}`);
                
                await this.delay(500);
                
                result.notifications = {
                    sent: true,
                    recipients: ['team@example.com'],
                    sent_at: new Date()
                };
            });
        } else {
            this.markStepSkipped(workflow, 'notify_completion');
        }

        return result;
    }

    async executeValidationWorkflow(workflow) {
        const { task_id, pr_url, pr_number, options } = workflow;
        const result = {};
        
        // Step 1: Analyze PR
        await this.executeStep(workflow, 'analyze_pr', async () => {
            console.log(`🔍 Analyzing PR ${pr_url}`);
            
            await this.delay(2000);
            
            result.pr_analysis = {
                files_changed: Math.floor(Math.random() * 10) + 1,
                lines_added: Math.floor(Math.random() * 500) + 50,
                lines_removed: Math.floor(Math.random() * 100) + 10,
                complexity_score: Math.random() * 0.5 + 0.3, // 0.3-0.8
                analyzed_at: new Date()
            };
        });

        // Step 2: Run Tests
        await this.executeStep(workflow, 'run_tests', async () => {
            console.log(`🧪 Running tests for PR ${pr_number}`);
            
            await this.delay(10000); // Tests take longer
            
            result.test_results = {
                total_tests: Math.floor(Math.random() * 50) + 20,
                passed_tests: Math.floor(Math.random() * 45) + 18,
                failed_tests: Math.floor(Math.random() * 3),
                coverage_percentage: Math.floor(Math.random() * 20) + 75, // 75-95%
                executed_at: new Date()
            };
        });

        // Step 3: Code Review
        await this.executeStep(workflow, 'code_review', async () => {
            console.log(`👀 Performing automated code review for PR ${pr_number}`);
            
            await this.delay(3000);
            
            result.code_review = {
                issues_found: Math.floor(Math.random() * 5),
                suggestions: Math.floor(Math.random() * 8) + 2,
                quality_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
                reviewed_at: new Date()
            };
        });

        // Step 4: Security Scan
        await this.executeStep(workflow, 'security_scan', async () => {
            console.log(`🔒 Running security scan for PR ${pr_number}`);
            
            await this.delay(4000);
            
            result.security_scan = {
                vulnerabilities_found: Math.floor(Math.random() * 2),
                security_score: Math.random() * 0.2 + 0.8, // 0.8-1.0
                scanned_at: new Date()
            };
        });

        // Step 5: Generate Feedback
        await this.executeStep(workflow, 'generate_feedback', async () => {
            console.log(`📝 Generating feedback for PR ${pr_number}`);
            
            await this.delay(1000);
            
            result.feedback = {
                overall_score: (result.code_review.quality_score + result.security_scan.security_score) / 2,
                recommendations: [
                    'Consider adding more unit tests',
                    'Documentation could be improved',
                    'Code looks good overall'
                ],
                generated_at: new Date()
            };
        });

        return result;
    }

    async executeStep(workflow, stepName, stepFunction) {
        const step = workflow.steps.find(s => s.name === stepName);
        if (!step) {
            throw new Error(`Step ${stepName} not found in workflow ${workflow.id}`);
        }

        try {
            step.status = 'running';
            step.started_at = new Date();
            
            this.emit('step:started', { workflow, step });
            
            await stepFunction();
            
            step.status = 'completed';
            step.completed_at = new Date();
            
            this.emit('step:completed', { workflow, step });
            
        } catch (error) {
            step.status = 'failed';
            step.completed_at = new Date();
            step.error = error.message;
            
            this.emit('step:failed', { workflow, step, error });
            throw error;
        }
    }

    markStepSkipped(workflow, stepName) {
        const step = workflow.steps.find(s => s.name === stepName);
        if (step) {
            step.status = 'skipped';
            step.completed_at = new Date();
        }
    }

    // Event Handlers

    handleWorkflowStarted(workflow) {
        console.log(`🚀 Workflow ${workflow.id} started (${workflow.type})`);
    }

    handleWorkflowCompleted(workflow) {
        const duration = workflow.completed_at - workflow.started_at;
        console.log(`✅ Workflow ${workflow.id} completed in ${duration}ms`);
    }

    handleWorkflowFailed(workflow) {
        console.log(`❌ Workflow ${workflow.id} failed: ${workflow.error}`);
    }

    handleWorkflowTimeout(workflow) {
        console.log(`⏰ Workflow ${workflow.id} timed out`);
        
        workflow.status = 'timeout';
        workflow.completed_at = new Date();
        workflow.error = 'Workflow timed out';
        
        this.activeWorkflows.delete(workflow.id);
    }

    handleStepStarted({ workflow, step }) {
        console.log(`  🔄 Step ${step.name} started in workflow ${workflow.id}`);
    }

    handleStepCompleted({ workflow, step }) {
        const duration = step.completed_at - step.started_at;
        console.log(`  ✅ Step ${step.name} completed in ${duration}ms`);
    }

    handleStepFailed({ workflow, step, error }) {
        console.log(`  ❌ Step ${step.name} failed: ${error.message}`);
    }

    // Query Methods

    getWorkflowStatus(workflowId) {
        const workflow = this.workflowHistory.get(workflowId);
        if (!workflow) {
            return null;
        }

        return {
            id: workflow.id,
            type: workflow.type,
            status: workflow.status,
            task_id: workflow.task_id,
            steps: workflow.steps.map(step => ({
                name: step.name,
                status: step.status,
                started_at: step.started_at,
                completed_at: step.completed_at,
                error: step.error
            })),
            created_at: workflow.created_at,
            started_at: workflow.started_at,
            completed_at: workflow.completed_at,
            duration_ms: workflow.completed_at ? workflow.completed_at - workflow.started_at : null,
            error: workflow.error,
            result: workflow.result
        };
    }

    getActiveWorkflows() {
        return Array.from(this.activeWorkflows.values()).map(workflow => ({
            id: workflow.id,
            type: workflow.type,
            task_id: workflow.task_id,
            status: workflow.status,
            started_at: workflow.started_at,
            current_step: workflow.steps.find(s => s.status === 'running')?.name || 'unknown'
        }));
    }

    getWorkflowHistory(limit = 50) {
        return Array.from(this.workflowHistory.values())
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, limit)
            .map(workflow => this.getWorkflowStatus(workflow.id));
    }

    // Utility Methods

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getMetrics() {
        const workflows = Array.from(this.workflowHistory.values());
        const completed = workflows.filter(w => w.status === 'completed');
        const failed = workflows.filter(w => w.status === 'failed');
        
        return {
            total_workflows: workflows.length,
            active_workflows: this.activeWorkflows.size,
            queued_workflows: this.workflowQueue.length,
            completed_workflows: completed.length,
            failed_workflows: failed.length,
            success_rate: workflows.length > 0 ? completed.length / workflows.length : 0,
            average_duration_ms: completed.length > 0 
                ? completed.reduce((sum, w) => sum + (w.completed_at - w.started_at), 0) / completed.length 
                : 0
        };
    }
}

module.exports = WorkflowOrchestrator;

