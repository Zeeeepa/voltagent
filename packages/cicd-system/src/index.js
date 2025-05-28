/**
 * @fileoverview Complete CI/CD System Integration - PR #18
 * Merges all foundation components into a comprehensive AI-driven CI/CD pipeline
 * 
 * This system provides:
 * - Natural language requirement analysis and atomic task decomposition
 * - PostgreSQL-based task storage and workflow state management
 * - Intelligent Codegen prompt generation and PR creation
 * - WSL2-based Claude Code validation and debugging
 * - Cyclical error handling and continuous improvement
 * - Maximum concurrency with dependency-aware execution
 */
import { NLPProcessor, RequirementAnalyzer } from './nlp_engine/index.js';
import { TaskDataAccess, DatabaseManager } from './database/index.js';
import { CodegenIntegration, PromptGenerator } from './codegen_integration/index.js';
import { ClaudeCodeEngine, WSL2Manager } from './claude_code_engine/index.js';
import { WorkflowOrchestrator, StateManager } from './workflow_orchestration/index.js';
import { AgentAPIClient } from './agentapi_integration/index.js';

/**
 * Complete CI/CD System - Main orchestrator class
 */
export class CompleteCICDSystem {
    constructor(options = {}) {
        this.options = {
            // Database configuration
            database: {
                host: options.database?.host || process.env.DB_HOST || 'localhost',
                port: options.database?.port || process.env.DB_PORT || 5432,
                database: options.database?.database || process.env.DB_NAME || 'codegen-taskmaster-db',
                username: options.database?.username || process.env.DB_USER || 'software_developer',
                password: options.database?.password || process.env.DB_PASSWORD || 'password',
                ssl: options.database?.ssl || process.env.DB_SSL || 'require'
            },
            
            // Codegen API configuration
            codegen: {
                orgId: options.codegen?.orgId || process.env.CODEGEN_ORG_ID || '323',
                token: options.codegen?.token || process.env.CODEGEN_API_TOKEN || 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99',
                timeout: options.codegen?.timeout || 300000,
                maxRetries: options.codegen?.maxRetries || 3
            },
            
            // AgentAPI configuration for Claude Code
            agentapi: {
                baseUrl: options.agentapi?.baseUrl || process.env.AGENTAPI_URL || 'http://localhost:8080',
                timeout: options.agentapi?.timeout || 120000
            },
            
            // WSL2 configuration
            wsl2: {
                maxInstances: options.wsl2?.maxInstances || 5,
                instanceMemory: options.wsl2?.instanceMemory || '4GB',
                instanceCpuCores: options.wsl2?.instanceCpuCores || 2,
                instanceDiskSpace: options.wsl2?.instanceDiskSpace || '20GB'
            },
            
            // Workflow configuration
            workflow: {
                maxConcurrentTasks: options.workflow?.maxConcurrentTasks || 10,
                maxRetryAttempts: options.workflow?.maxRetryAttempts || 5,
                retryDelay: options.workflow?.retryDelay || 5000
            },
            
            // System configuration
            enableMockMode: options.enableMockMode || false,
            enableDetailedLogging: options.enableDetailedLogging || true,
            enablePerformanceMetrics: options.enablePerformanceMetrics || true
        };
        
        this.initialized = false;
        this.components = {};
        this.metrics = {
            totalRequirements: 0,
            totalTasks: 0,
            successfulPRs: 0,
            failedValidations: 0,
            averageProcessingTime: 0,
            systemUptime: Date.now()
        };
    }
    
    /**
     * Initialize all system components
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        
        try {
            console.log('🚀 Initializing Complete CI/CD System...');
            
            // Initialize database connection
            this.components.database = new DatabaseManager(this.options.database);
            await this.components.database.initialize();
            console.log('✅ Database connection established');
            
            // Initialize task data access layer
            this.components.taskStorage = new TaskDataAccess(this.components.database);
            await this.components.taskStorage.initialize();
            console.log('✅ Task storage layer initialized');
            
            // Initialize NLP engine
            this.components.nlpProcessor = new NLPProcessor({
                enableEntityExtraction: true,
                enableKeywordExtraction: true,
                enableComplexityAnalysis: true
            });
            console.log('✅ NLP processor initialized');
            
            // Initialize requirement analyzer
            this.components.requirementAnalyzer = new RequirementAnalyzer({
                nlpProcessor: this.components.nlpProcessor,
                taskStorage: this.components.taskStorage,
                enableDependencyAnalysis: true,
                enableAtomicDecomposition: true
            });
            console.log('✅ Requirement analyzer initialized');
            
            // Initialize Codegen integration
            this.components.codegenIntegration = new CodegenIntegration({
                orgId: this.options.codegen.orgId,
                token: this.options.codegen.token,
                timeout: this.options.codegen.timeout,
                maxRetries: this.options.codegen.maxRetries,
                enableMockMode: this.options.enableMockMode
            });
            console.log('✅ Codegen integration initialized');
            
            // Initialize AgentAPI client
            this.components.agentApiClient = new AgentAPIClient({
                baseUrl: this.options.agentapi.baseUrl,
                timeout: this.options.agentapi.timeout
            });
            console.log('✅ AgentAPI client initialized');
            
            // Initialize WSL2 manager
            this.components.wsl2Manager = new WSL2Manager({
                maxInstances: this.options.wsl2.maxInstances,
                instanceConfig: {
                    memory: this.options.wsl2.instanceMemory,
                    cpuCores: this.options.wsl2.instanceCpuCores,
                    diskSpace: this.options.wsl2.instanceDiskSpace
                },
                agentApiClient: this.components.agentApiClient
            });
            console.log('✅ WSL2 manager initialized');
            
            // Initialize Claude Code engine
            this.components.claudeCodeEngine = new ClaudeCodeEngine({
                wsl2Manager: this.components.wsl2Manager,
                agentApiClient: this.components.agentApiClient,
                taskStorage: this.components.taskStorage
            });
            console.log('✅ Claude Code engine initialized');
            
            // Initialize workflow orchestrator
            this.components.workflowOrchestrator = new WorkflowOrchestrator({
                taskStorage: this.components.taskStorage,
                requirementAnalyzer: this.components.requirementAnalyzer,
                codegenIntegration: this.components.codegenIntegration,
                claudeCodeEngine: this.components.claudeCodeEngine,
                maxConcurrentTasks: this.options.workflow.maxConcurrentTasks,
                maxRetryAttempts: this.options.workflow.maxRetryAttempts,
                retryDelay: this.options.workflow.retryDelay
            });
            console.log('✅ Workflow orchestrator initialized');
            
            // Initialize state manager
            this.components.stateManager = new StateManager({
                taskStorage: this.components.taskStorage,
                enableEventLogging: true,
                enableMetrics: this.options.enablePerformanceMetrics
            });
            console.log('✅ State manager initialized');
            
            this.initialized = true;
            console.log('🎉 Complete CI/CD System initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize CI/CD system:', error);
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Process a natural language requirement through the complete CI/CD pipeline
     * @param {string} requirementText - Natural language requirement
     * @param {Object} context - Additional context for processing
     * @returns {Promise<Object>} Complete processing result
     */
    async processRequirement(requirementText, context = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        const startTime = Date.now();
        const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            console.log(`🔄 Starting requirement processing: ${workflowId}`);
            
            // Phase 1: Natural Language Analysis & Task Decomposition
            console.log('📝 Phase 1: Analyzing requirement and decomposing into atomic tasks...');
            const analysisResult = await this.components.requirementAnalyzer.analyzeRequirement(
                requirementText, 
                {
                    enableDependencyAnalysis: true,
                    enableComplexityEstimation: true,
                    enableAtomicDecomposition: true,
                    maxTasksPerRequirement: 15,
                    ...context.analysisOptions
                }
            );
            
            console.log(`✅ Generated ${analysisResult.tasks.length} atomic tasks`);
            
            // Phase 2: Store tasks in PostgreSQL with full context
            console.log('💾 Phase 2: Storing tasks in PostgreSQL database...');
            const storedTasks = [];
            for (const task of analysisResult.tasks) {
                const storedTask = await this.components.taskStorage.createTask({
                    title: task.title,
                    description: task.description,
                    requirements: task.requirements,
                    acceptance_criteria: task.acceptanceCriteria,
                    implementation_files: task.affectedFiles,
                    dependencies: task.dependencies,
                    priority: task.priority,
                    complexity_score: task.complexityScore,
                    estimated_effort: task.estimatedEffort,
                    tags: task.tags,
                    repository_url: context.repositoryUrl || 'https://github.com/zeeeepa/claude-task-master',
                    metadata: {
                        workflow_id: workflowId,
                        requirement_text: requirementText,
                        nlp_analysis: analysisResult.requirement,
                        dependency_graph: task.dependencyInfo,
                        created_by: 'complete_cicd_system',
                        processing_phase: 'stored'
                    }
                });
                storedTasks.push(storedTask);
            }
            
            console.log(`✅ Stored ${storedTasks.length} tasks in database`);
            
            // Phase 3: Execute workflow with maximum concurrency
            console.log('🔄 Phase 3: Executing workflow with maximum concurrency...');
            const workflowResult = await this.components.workflowOrchestrator.executeWorkflow({
                workflowId,
                tasks: storedTasks,
                enableMaxConcurrency: true,
                enableDependencyAwareExecution: true,
                context: {
                    ...context,
                    originalRequirement: requirementText,
                    analysisResult
                }
            });
            
            console.log(`✅ Workflow execution completed: ${workflowResult.status}`);
            
            // Calculate metrics
            const processingTime = Date.now() - startTime;
            this.updateMetrics({
                totalRequirements: 1,
                totalTasks: storedTasks.length,
                processingTime,
                workflowResult
            });
            
            return {
                workflowId,
                status: workflowResult.status,
                processingTime,
                requirement: {
                    originalText: requirementText,
                    analysis: analysisResult.requirement,
                    complexity: analysisResult.requirement.estimatedComplexity
                },
                tasks: {
                    total: storedTasks.length,
                    completed: workflowResult.completedTasks,
                    failed: workflowResult.failedTasks,
                    inProgress: workflowResult.inProgressTasks
                },
                prs: workflowResult.createdPRs,
                validations: workflowResult.validationResults,
                errors: workflowResult.errors,
                metrics: {
                    averageTaskComplexity: analysisResult.summary.averageComplexity,
                    dependencyCount: analysisResult.summary.dependencyCount,
                    successRate: workflowResult.successRate,
                    totalProcessingTime: processingTime
                }
            };
            
        } catch (error) {
            console.error(`❌ Requirement processing failed: ${error.message}`);
            
            // Log error to database
            await this.components.taskStorage.logError({
                workflow_id: workflowId,
                error_message: error.message,
                error_details: {
                    requirement_text: requirementText,
                    context,
                    stack_trace: error.stack
                },
                severity: 'high'
            });
            
            throw new Error(`Requirement processing failed: ${error.message}`);
        }
    }
    
    /**
     * Process a single task through the complete pipeline
     * @param {string} taskId - Task ID to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Task processing result
     */
    async processTask(taskId, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            console.log(`🔄 Processing task: ${taskId}`);
            
            // Get task from database
            const task = await this.components.taskStorage.getTaskById(taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }
            
            // Execute cyclical workflow for this task
            const result = await this.executeCyclicalWorkflow(task, options);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Task processing failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Execute cyclical workflow for a task (Database → Codegen → Claude Code → Validation)
     * @param {Object} task - Task to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Cyclical workflow result
     */
    async executeCyclicalWorkflow(task, options = {}) {
        const maxAttempts = options.maxAttempts || this.options.workflow.maxRetryAttempts;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                console.log(`🔄 Cyclical workflow attempt ${attempts} for task: ${task.id}`);
                
                // Step 1: Generate Codegen prompt from database task
                console.log('📝 Step 1: Generating Codegen prompt...');
                const prompt = await this.components.codegenIntegration.generatePrompt(task, {
                    includeContext: true,
                    includeDependencies: true,
                    includeValidationCriteria: true,
                    includeErrorContext: attempts > 1,
                    previousAttempts: task.metadata?.previous_attempts || []
                });
                
                // Step 2: Send to Codegen API for PR creation
                console.log('🚀 Step 2: Sending to Codegen API...');
                const codegenResult = await this.components.codegenIntegration.sendCodegenRequest(
                    prompt, 
                    task.id
                );
                
                if (!codegenResult.success) {
                    throw new Error(`Codegen failed: ${codegenResult.error}`);
                }
                
                console.log(`✅ PR created: ${codegenResult.pr_info.pr_url}`);
                
                // Update task with PR information
                await this.components.taskStorage.updateTask(task.id, {
                    status: 'pr_created',
                    pr_url: codegenResult.pr_info.pr_url,
                    pr_number: codegenResult.pr_info.pr_number,
                    metadata: {
                        ...task.metadata,
                        codegen_result: codegenResult,
                        current_attempt: attempts
                    }
                });
                
                // Step 3: Deploy to WSL2 instance and validate with Claude Code
                console.log('🖥️ Step 3: Deploying to WSL2 and validating with Claude Code...');
                const validationResult = await this.components.claudeCodeEngine.validatePR({
                    task,
                    prUrl: codegenResult.pr_info.pr_url,
                    prBranch: codegenResult.pr_info.branch_name,
                    attemptNumber: attempts,
                    context: {
                        requirements: task.requirements,
                        acceptanceCriteria: task.acceptance_criteria,
                        implementationFiles: task.implementation_files
                    }
                });
                
                if (validationResult.success) {
                    // Success! Mark task as completed
                    console.log('✅ Validation successful - task completed!');
                    
                    await this.components.taskStorage.updateTask(task.id, {
                        status: 'completed',
                        validation_result: validationResult,
                        completed_at: new Date().toISOString(),
                        attempts: attempts
                    });
                    
                    await this.components.taskStorage.createWorkflowState({
                        task_id: task.id,
                        state: 'completed',
                        triggered_by: 'claude_code_validation',
                        trigger_reason: 'validation_successful',
                        state_data: {
                            pr_url: codegenResult.pr_info.pr_url,
                            validation_result: validationResult,
                            attempts: attempts
                        }
                    });
                    
                    return {
                        success: true,
                        taskId: task.id,
                        attempts,
                        prUrl: codegenResult.pr_info.pr_url,
                        validationResult,
                        status: 'completed'
                    };
                }
                
                // Step 4: Try debugging with Claude Code
                console.log('🔧 Step 4: Attempting debugging with Claude Code...');
                const debugResult = await this.components.claudeCodeEngine.debugAndFix({
                    task,
                    prUrl: codegenResult.pr_info.pr_url,
                    validationErrors: validationResult.errors,
                    attemptNumber: attempts
                });
                
                if (debugResult.success) {
                    console.log('🔧 Debug successful - retrying validation...');
                    // Continue to next iteration for re-validation
                    continue;
                }
                
                // Step 5: If debugging failed, prepare for next iteration
                console.log(`⚠️ Attempt ${attempts} failed - preparing for retry...`);
                
                // Update task with failure information
                await this.components.taskStorage.updateTask(task.id, {
                    metadata: {
                        ...task.metadata,
                        previous_attempts: [
                            ...(task.metadata?.previous_attempts || []),
                            {
                                attempt: attempts,
                                codegen_result: codegenResult,
                                validation_result: validationResult,
                                debug_result: debugResult,
                                timestamp: new Date().toISOString()
                            }
                        ]
                    }
                });
                
                // Wait before next attempt
                if (attempts < maxAttempts) {
                    console.log(`⏳ Waiting ${this.options.workflow.retryDelay}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, this.options.workflow.retryDelay));
                }
                
            } catch (error) {
                console.error(`❌ Cyclical workflow attempt ${attempts} failed:`, error);
                
                // Log error to database
                await this.components.taskStorage.logError({
                    task_id: task.id,
                    workflow_attempt: attempts,
                    error_message: error.message,
                    error_details: {
                        task,
                        options,
                        stack_trace: error.stack
                    },
                    severity: 'medium'
                });
                
                if (attempts >= maxAttempts) {
                    throw error;
                }
                
                // Wait before next attempt
                console.log(`⏳ Waiting ${this.options.workflow.retryDelay}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, this.options.workflow.retryDelay));
            }
        }
        
        // All attempts failed
        console.error(`❌ All ${maxAttempts} attempts failed for task: ${task.id}`);
        
        await this.components.taskStorage.updateTask(task.id, {
            status: 'failed',
            failed_at: new Date().toISOString(),
            attempts: maxAttempts,
            failure_reason: 'max_attempts_exceeded'
        });
        
        return {
            success: false,
            taskId: task.id,
            attempts: maxAttempts,
            status: 'failed',
            reason: 'max_attempts_exceeded'
        };
    }
    
    /**
     * Get system metrics and status
     * @returns {Object} System metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.systemUptime,
            initialized: this.initialized,
            components: Object.keys(this.components).length
        };
    }
    
    /**
     * Update system metrics
     * @param {Object} updates - Metric updates
     */
    updateMetrics(updates) {
        if (updates.totalRequirements) {
            this.metrics.totalRequirements += updates.totalRequirements;
        }
        if (updates.totalTasks) {
            this.metrics.totalTasks += updates.totalTasks;
        }
        if (updates.workflowResult) {
            this.metrics.successfulPRs += updates.workflowResult.createdPRs?.length || 0;
            this.metrics.failedValidations += updates.workflowResult.failedTasks || 0;
        }
        if (updates.processingTime) {
            const currentAvg = this.metrics.averageProcessingTime;
            const totalRequirements = this.metrics.totalRequirements;
            this.metrics.averageProcessingTime = 
                (currentAvg * (totalRequirements - 1) + updates.processingTime) / totalRequirements;
        }
    }
    
    /**
     * Shutdown the system gracefully
     */
    async shutdown() {
        console.log('🔄 Shutting down Complete CI/CD System...');
        
        try {
            // Close database connections
            if (this.components.database) {
                await this.components.database.close();
            }
            
            // Cleanup WSL2 instances
            if (this.components.wsl2Manager) {
                await this.components.wsl2Manager.cleanup();
            }
            
            // Reset state
            this.initialized = false;
            this.components = {};
            
            console.log('✅ System shutdown completed');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            throw error;
        }
    }
}

// Export additional utilities
export { NLPProcessor, RequirementAnalyzer } from './nlp_engine/index.js';
export { TaskDataAccess, DatabaseManager } from './database/index.js';
export { CodegenIntegration, PromptGenerator } from './codegen_integration/index.js';
export { ClaudeCodeEngine, WSL2Manager } from './claude_code_engine/index.js';
export { WorkflowOrchestrator, StateManager } from './workflow_orchestration/index.js';
export { AgentAPIClient } from './agentapi_integration/index.js';

// Default export
export default CompleteCICDSystem;

