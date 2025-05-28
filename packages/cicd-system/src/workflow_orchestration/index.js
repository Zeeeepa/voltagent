/**
 * @fileoverview Workflow Orchestration - PR #17 Component
 * End-to-end workflow coordination and state management
 * 
 * Provides comprehensive workflow capabilities:
 * - State machine management
 * - Event handling and processing
 * - Retry logic and error recovery
 * - Maximum concurrency with dependency awareness
 * - Performance monitoring and optimization
 */

/**
 * Workflow Orchestrator for managing end-to-end task execution
 */
export class WorkflowOrchestrator {
    constructor(options = {}) {
        this.taskStorage = options.taskStorage;
        this.requirementAnalyzer = options.requirementAnalyzer;
        this.codegenIntegration = options.codegenIntegration;
        this.claudeCodeEngine = options.claudeCodeEngine;
        
        this.options = {
            maxConcurrentTasks: options.maxConcurrentTasks || 10,
            maxRetryAttempts: options.maxRetryAttempts || 5,
            retryDelay: options.retryDelay || 5000,
            enableDependencyAware: options.enableDependencyAware !== false,
            enableMaxConcurrency: options.enableMaxConcurrency !== false
        };
        
        this.activeWorkflows = new Map();
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.completedTasks = new Map();
        this.failedTasks = new Map();
        
        this.metrics = {
            totalWorkflows: 0,
            completedWorkflows: 0,
            failedWorkflows: 0,
            averageWorkflowTime: 0,
            totalTasksProcessed: 0,
            averageTaskTime: 0
        };
    }
    
    /**
     * Execute workflow with maximum concurrency and dependency awareness
     * @param {Object} workflowConfig - Workflow configuration
     * @returns {Promise<Object>} Workflow execution result
     */
    async executeWorkflow(workflowConfig) {
        const startTime = Date.now();
        const workflowId = workflowConfig.workflowId;
        
        try {
            console.log(`🔄 Starting workflow execution: ${workflowId}`);
            
            // Initialize workflow state
            const workflow = {
                id: workflowId,
                tasks: workflowConfig.tasks,
                context: workflowConfig.context,
                startTime,
                status: 'running',
                completedTasks: [],
                failedTasks: [],
                inProgressTasks: [],
                createdPRs: [],
                validationResults: [],
                errors: []
            };
            
            this.activeWorkflows.set(workflowId, workflow);
            this.metrics.totalWorkflows++;
            
            // Build dependency graph if enabled
            let dependencyGraph = null;
            if (workflowConfig.enableDependencyAwareExecution) {
                dependencyGraph = await this.buildDependencyGraph(workflow.tasks);
                console.log(`📊 Dependency graph built: ${dependencyGraph.edges.length} dependencies`);
            }
            
            // Execute tasks with maximum concurrency
            const executionResult = await this.executeConcurrentTasks(workflow, dependencyGraph);
            
            // Finalize workflow
            const workflowTime = Date.now() - startTime;
            workflow.status = executionResult.success ? 'completed' : 'failed';
            workflow.endTime = Date.now();
            workflow.duration = workflowTime;
            
            // Update metrics
            this.updateWorkflowMetrics(executionResult.success, workflowTime, workflow.tasks.length);
            
            console.log(`${executionResult.success ? '✅' : '❌'} Workflow ${workflowId} ${workflow.status} in ${Math.round(workflowTime / 1000)}s`);
            
            return {
                workflowId,
                status: workflow.status,
                duration: workflowTime,
                completedTasks: workflow.completedTasks.length,
                failedTasks: workflow.failedTasks.length,
                inProgressTasks: workflow.inProgressTasks.length,
                createdPRs: workflow.createdPRs,
                validationResults: workflow.validationResults,
                errors: workflow.errors,
                successRate: workflow.tasks.length > 0 ? (workflow.completedTasks.length / workflow.tasks.length) * 100 : 0
            };
            
        } catch (error) {
            console.error(`❌ Workflow ${workflowId} failed:`, error);
            
            const workflowTime = Date.now() - startTime;
            this.updateWorkflowMetrics(false, workflowTime, workflowConfig.tasks.length);
            
            throw new Error(`Workflow execution failed: ${error.message}`);
        } finally {
            this.activeWorkflows.delete(workflowId);
        }
    }
    
    /**
     * Execute tasks with maximum concurrency and dependency awareness
     * @param {Object} workflow - Workflow object
     * @param {Object} dependencyGraph - Dependency graph
     * @returns {Promise<Object>} Execution result
     */
    async executeConcurrentTasks(workflow, dependencyGraph) {
        const maxConcurrent = this.options.maxConcurrentTasks;
        const tasks = workflow.tasks;
        const completed = new Set();
        const failed = new Set();
        const running = new Set();
        
        // Track task readiness
        const readyTasks = new Set();
        const blockedTasks = new Set();
        
        // Initialize task readiness
        this.initializeTaskReadiness(tasks, dependencyGraph, readyTasks, blockedTasks);
        
        console.log(`🚀 Starting concurrent execution: ${readyTasks.size} ready, ${blockedTasks.size} blocked`);
        
        while (readyTasks.size > 0 || running.size > 0) {
            // Start new tasks up to concurrency limit
            while (readyTasks.size > 0 && running.size < maxConcurrent) {
                const taskId = readyTasks.values().next().value;
                const task = tasks.find(t => t.id === taskId);
                
                readyTasks.delete(taskId);
                running.add(taskId);
                workflow.inProgressTasks.push(taskId);
                
                // Execute task asynchronously
                this.executeTaskAsync(task, workflow)
                    .then(result => {
                        running.delete(taskId);
                        workflow.inProgressTasks = workflow.inProgressTasks.filter(id => id !== taskId);
                        
                        if (result.success) {
                            completed.add(taskId);
                            workflow.completedTasks.push(taskId);
                            if (result.prUrl) {
                                workflow.createdPRs.push(result.prUrl);
                            }
                            if (result.validationResult) {
                                workflow.validationResults.push(result.validationResult);
                            }
                            
                            // Check if any blocked tasks are now ready
                            this.updateTaskReadiness(taskId, dependencyGraph, blockedTasks, readyTasks, completed);
                        } else {
                            failed.add(taskId);
                            workflow.failedTasks.push(taskId);
                            workflow.errors.push({
                                taskId,
                                error: result.error,
                                timestamp: new Date().toISOString()
                            });
                        }
                    })
                    .catch(error => {
                        running.delete(taskId);
                        workflow.inProgressTasks = workflow.inProgressTasks.filter(id => id !== taskId);
                        failed.add(taskId);
                        workflow.failedTasks.push(taskId);
                        workflow.errors.push({
                            taskId,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        });
                    });
            }
            
            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return {
            success: failed.size === 0,
            completed: completed.size,
            failed: failed.size,
            total: tasks.length
        };
    }
    
    /**
     * Execute a single task asynchronously
     * @param {Object} task - Task to execute
     * @param {Object} workflow - Workflow context
     * @returns {Promise<Object>} Task execution result
     */
    async executeTaskAsync(task, workflow) {
        const startTime = Date.now();
        
        try {
            console.log(`🔄 Executing task: ${task.id} - ${task.title}`);
            
            // Generate Codegen prompt
            const promptResult = await this.codegenIntegration.generatePrompt(task, {
                includeContext: true,
                includeDependencies: true,
                includeValidationCriteria: true
            });
            
            // Send to Codegen API
            const codegenResult = await this.codegenIntegration.sendCodegenRequest(
                promptResult.prompt,
                task.id
            );
            
            if (!codegenResult.success) {
                throw new Error(`Codegen failed: ${codegenResult.error}`);
            }
            
            // Update task with PR information
            await this.taskStorage.updateTask(task.id, {
                status: 'pr_created',
                pr_url: codegenResult.pr_info.pr_url,
                pr_number: codegenResult.pr_info.pr_number
            });
            
            // Validate with Claude Code
            const validationResult = await this.claudeCodeEngine.validatePR({
                task,
                prUrl: codegenResult.pr_info.pr_url,
                prBranch: codegenResult.pr_info.branch_name,
                context: workflow.context
            });
            
            if (validationResult.success) {
                // Mark task as completed
                await this.taskStorage.updateTask(task.id, {
                    status: 'completed',
                    validation_result: validationResult,
                    completed_at: new Date().toISOString()
                });
                
                const taskTime = Date.now() - startTime;
                this.updateTaskMetrics(taskTime);
                
                console.log(`✅ Task completed: ${task.id}`);
                
                return {
                    success: true,
                    taskId: task.id,
                    prUrl: codegenResult.pr_info.pr_url,
                    validationResult,
                    duration: taskTime
                };
            } else {
                // Try debugging
                const debugResult = await this.claudeCodeEngine.debugAndFix({
                    task,
                    prUrl: codegenResult.pr_info.pr_url,
                    validationErrors: validationResult.errors
                });
                
                if (debugResult.success) {
                    // Re-validate after debugging
                    const revalidationResult = await this.claudeCodeEngine.validatePR({
                        task,
                        prUrl: codegenResult.pr_info.pr_url,
                        prBranch: codegenResult.pr_info.branch_name,
                        context: workflow.context
                    });
                    
                    if (revalidationResult.success) {
                        await this.taskStorage.updateTask(task.id, {
                            status: 'completed',
                            validation_result: revalidationResult,
                            completed_at: new Date().toISOString()
                        });
                        
                        const taskTime = Date.now() - startTime;
                        this.updateTaskMetrics(taskTime);
                        
                        console.log(`✅ Task completed after debugging: ${task.id}`);
                        
                        return {
                            success: true,
                            taskId: task.id,
                            prUrl: codegenResult.pr_info.pr_url,
                            validationResult: revalidationResult,
                            duration: taskTime
                        };
                    }
                }
                
                // Task failed
                await this.taskStorage.updateTask(task.id, {
                    status: 'failed',
                    failed_at: new Date().toISOString(),
                    failure_reason: 'validation_failed'
                });
                
                console.log(`❌ Task failed: ${task.id}`);
                
                return {
                    success: false,
                    taskId: task.id,
                    error: 'Validation failed after debugging attempts'
                };
            }
            
        } catch (error) {
            console.error(`❌ Task execution failed: ${task.id}`, error);
            
            await this.taskStorage.updateTask(task.id, {
                status: 'failed',
                failed_at: new Date().toISOString(),
                failure_reason: error.message
            });
            
            return {
                success: false,
                taskId: task.id,
                error: error.message
            };
        }
    }
    
    /**
     * Build dependency graph for tasks
     * @param {Array} tasks - Tasks to analyze
     * @returns {Promise<Object>} Dependency graph
     */
    async buildDependencyGraph(tasks) {
        const graph = {
            nodes: tasks.map(task => ({ id: task.id, title: task.title })),
            edges: []
        };
        
        // Simple dependency analysis based on task types and files
        for (let i = 0; i < tasks.length; i++) {
            for (let j = i + 1; j < tasks.length; j++) {
                const taskA = tasks[i];
                const taskB = tasks[j];
                
                // Check if taskA should come before taskB
                if (this.shouldTaskPrecede(taskA, taskB)) {
                    graph.edges.push({
                        from: taskA.id,
                        to: taskB.id,
                        type: 'sequential'
                    });
                }
            }
        }
        
        return graph;
    }
    
    /**
     * Check if one task should precede another
     * @param {Object} taskA - First task
     * @param {Object} taskB - Second task
     * @returns {boolean} True if taskA should precede taskB
     */
    shouldTaskPrecede(taskA, taskB) {
        const precedenceRules = {
            'setup': ['implement', 'test', 'deploy'],
            'create': ['implement', 'test'],
            'implement': ['test', 'deploy'],
            'test': ['deploy']
        };
        
        const actionA = this.extractAction(taskA.title);
        const actionB = this.extractAction(taskB.title);
        
        return precedenceRules[actionA]?.includes(actionB) || false;
    }
    
    /**
     * Extract action from task title
     * @param {string} title - Task title
     * @returns {string} Extracted action
     */
    extractAction(title) {
        const words = title.toLowerCase().split(' ');
        const actions = ['setup', 'create', 'implement', 'test', 'deploy', 'fix', 'update'];
        return actions.find(action => words.includes(action)) || 'implement';
    }
    
    /**
     * Initialize task readiness based on dependencies
     * @param {Array} tasks - All tasks
     * @param {Object} dependencyGraph - Dependency graph
     * @param {Set} readyTasks - Ready tasks set
     * @param {Set} blockedTasks - Blocked tasks set
     */
    initializeTaskReadiness(tasks, dependencyGraph, readyTasks, blockedTasks) {
        if (!dependencyGraph) {
            // No dependencies, all tasks are ready
            tasks.forEach(task => readyTasks.add(task.id));
            return;
        }
        
        const dependencies = new Map();
        
        // Build dependency map
        dependencyGraph.edges.forEach(edge => {
            if (!dependencies.has(edge.to)) {
                dependencies.set(edge.to, new Set());
            }
            dependencies.get(edge.to).add(edge.from);
        });
        
        // Categorize tasks
        tasks.forEach(task => {
            if (dependencies.has(task.id)) {
                blockedTasks.add(task.id);
            } else {
                readyTasks.add(task.id);
            }
        });
    }
    
    /**
     * Update task readiness when a task completes
     * @param {string} completedTaskId - Completed task ID
     * @param {Object} dependencyGraph - Dependency graph
     * @param {Set} blockedTasks - Blocked tasks set
     * @param {Set} readyTasks - Ready tasks set
     * @param {Set} completed - Completed tasks set
     */
    updateTaskReadiness(completedTaskId, dependencyGraph, blockedTasks, readyTasks, completed) {
        if (!dependencyGraph) return;
        
        // Find tasks that were waiting for this task
        const dependentEdges = dependencyGraph.edges.filter(edge => edge.from === completedTaskId);
        
        dependentEdges.forEach(edge => {
            const dependentTaskId = edge.to;
            
            if (blockedTasks.has(dependentTaskId)) {
                // Check if all dependencies are now completed
                const allDependencies = dependencyGraph.edges
                    .filter(e => e.to === dependentTaskId)
                    .map(e => e.from);
                
                const allCompleted = allDependencies.every(depId => completed.has(depId));
                
                if (allCompleted) {
                    blockedTasks.delete(dependentTaskId);
                    readyTasks.add(dependentTaskId);
                    console.log(`🔓 Task ${dependentTaskId} is now ready (dependencies completed)`);
                }
            }
        });
    }
    
    /**
     * Update workflow metrics
     * @param {boolean} success - Whether workflow was successful
     * @param {number} workflowTime - Workflow time in ms
     * @param {number} taskCount - Number of tasks
     */
    updateWorkflowMetrics(success, workflowTime, taskCount) {
        if (success) {
            this.metrics.completedWorkflows++;
        } else {
            this.metrics.failedWorkflows++;
        }
        
        // Update average workflow time
        const totalWorkflows = this.metrics.totalWorkflows;
        this.metrics.averageWorkflowTime = 
            (this.metrics.averageWorkflowTime * (totalWorkflows - 1) + workflowTime) / totalWorkflows;
        
        this.metrics.totalTasksProcessed += taskCount;
    }
    
    /**
     * Update task metrics
     * @param {number} taskTime - Task time in ms
     */
    updateTaskMetrics(taskTime) {
        const totalTasks = this.metrics.totalTasksProcessed;
        this.metrics.averageTaskTime = 
            (this.metrics.averageTaskTime * (totalTasks - 1) + taskTime) / totalTasks;
    }
    
    /**
     * Get orchestrator metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            workflowSuccessRate: this.metrics.totalWorkflows > 0 
                ? (this.metrics.completedWorkflows / this.metrics.totalWorkflows) * 100 
                : 0,
            activeWorkflows: this.activeWorkflows.size,
            runningTasks: this.runningTasks.size
        };
    }
    
    /**
     * Get active workflow status
     * @param {string} workflowId - Workflow ID
     * @returns {Object|null} Workflow status
     */
    getWorkflowStatus(workflowId) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) return null;
        
        return {
            id: workflow.id,
            status: workflow.status,
            startTime: workflow.startTime,
            duration: Date.now() - workflow.startTime,
            totalTasks: workflow.tasks.length,
            completedTasks: workflow.completedTasks.length,
            failedTasks: workflow.failedTasks.length,
            inProgressTasks: workflow.inProgressTasks.length,
            createdPRs: workflow.createdPRs.length,
            errors: workflow.errors.length
        };
    }
}

/**
 * State Manager for workflow state tracking
 */
export class StateManager {
    constructor(options = {}) {
        this.taskStorage = options.taskStorage;
        this.options = {
            enableEventLogging: options.enableEventLogging !== false,
            enableMetrics: options.enableMetrics !== false,
            maxStateHistory: options.maxStateHistory || 1000
        };
        
        this.stateHistory = [];
        this.eventListeners = new Map();
        this.metrics = {
            totalStateChanges: 0,
            stateChangesByType: {},
            averageStateChangeTime: 0
        };
    }
    
    /**
     * Record state change
     * @param {Object} stateChange - State change details
     * @returns {Promise<void>}
     */
    async recordStateChange(stateChange) {
        try {
            const timestamp = new Date().toISOString();
            const stateRecord = {
                ...stateChange,
                timestamp,
                id: `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            // Store in database if enabled
            if (this.options.enableEventLogging && this.taskStorage) {
                await this.taskStorage.createWorkflowState(stateRecord);
            }
            
            // Store in memory
            this.stateHistory.push(stateRecord);
            
            // Maintain history limit
            if (this.stateHistory.length > this.options.maxStateHistory) {
                this.stateHistory.shift();
            }
            
            // Update metrics
            if (this.options.enableMetrics) {
                this.updateStateMetrics(stateChange);
            }
            
            // Emit event to listeners
            this.emitStateChange(stateRecord);
            
        } catch (error) {
            console.error('Failed to record state change:', error);
        }
    }
    
    /**
     * Add event listener for state changes
     * @param {string} eventType - Event type to listen for
     * @param {Function} listener - Listener function
     */
    addEventListener(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(listener);
    }
    
    /**
     * Remove event listener
     * @param {string} eventType - Event type
     * @param {Function} listener - Listener function
     */
    removeEventListener(eventType, listener) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit state change event
     * @param {Object} stateRecord - State record
     */
    emitStateChange(stateRecord) {
        const listeners = this.eventListeners.get(stateRecord.state) || [];
        const allListeners = this.eventListeners.get('*') || [];
        
        [...listeners, ...allListeners].forEach(listener => {
            try {
                listener(stateRecord);
            } catch (error) {
                console.error('State change listener error:', error);
            }
        });
    }
    
    /**
     * Update state metrics
     * @param {Object} stateChange - State change
     */
    updateStateMetrics(stateChange) {
        this.metrics.totalStateChanges++;
        
        const stateType = stateChange.state;
        this.metrics.stateChangesByType[stateType] = 
            (this.metrics.stateChangesByType[stateType] || 0) + 1;
    }
    
    /**
     * Get state history
     * @param {Object} options - Query options
     * @returns {Array} State history
     */
    getStateHistory(options = {}) {
        const limit = options.limit || 100;
        const taskId = options.taskId;
        const workflowId = options.workflowId;
        const state = options.state;
        
        let history = this.stateHistory;
        
        if (taskId) {
            history = history.filter(record => record.task_id === taskId);
        }
        
        if (workflowId) {
            history = history.filter(record => record.workflow_id === workflowId);
        }
        
        if (state) {
            history = history.filter(record => record.state === state);
        }
        
        return history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    /**
     * Get state manager metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            stateHistorySize: this.stateHistory.length,
            eventListenerCount: Array.from(this.eventListeners.values())
                .reduce((total, listeners) => total + listeners.length, 0)
        };
    }
}

export default { WorkflowOrchestrator, StateManager };
