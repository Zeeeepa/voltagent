/**
 * @fileoverview Claude Code Engine - PR #16 Component
 * AgentAPI → Claude Code Integration
 * 
 * Provides WSL2-based validation and debugging capabilities:
 * - WSL2 instance management and deployment
 * - Claude Code validation and testing
 * - Automated debugging and error resolution
 * - Performance monitoring and optimization
 * - Integration with AgentAPI for seamless operation
 */

/**
 * WSL2 Manager for instance lifecycle management
 */
export class WSL2Manager {
    constructor(options = {}) {
        this.options = {
            maxInstances: options.maxInstances || 5,
            instanceConfig: {
                memory: options.instanceConfig?.memory || '4GB',
                cpuCores: options.instanceConfig?.cpuCores || 2,
                diskSpace: options.instanceConfig?.diskSpace || '20GB',
                ...options.instanceConfig
            },
            agentApiClient: options.agentApiClient,
            instanceTimeout: options.instanceTimeout || 3600000, // 1 hour
            cleanupInterval: options.cleanupInterval || 300000 // 5 minutes
        };
        
        this.instances = new Map();
        this.instanceQueue = [];
        this.metrics = {
            totalInstances: 0,
            activeInstances: 0,
            instancesCreated: 0,
            instancesDestroyed: 0,
            averageLifetime: 0
        };
        
        // Start cleanup interval
        this.cleanupIntervalId = setInterval(() => this.cleanupInstances(), this.options.cleanupInterval);
    }
    
    /**
     * Create a new WSL2 instance
     * @param {Object} config - Instance configuration
     * @returns {Promise<Object>} Instance details
     */
    async createInstance(config = {}) {
        try {
            // Check if we've reached max instances
            if (this.instances.size >= this.options.maxInstances) {
                await this.waitForAvailableSlot();
            }
            
            const instanceId = `wsl2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log(`🖥️ Creating WSL2 instance: ${instanceId}`);
            
            const instanceConfig = {
                ...this.options.instanceConfig,
                ...config,
                instanceId,
                createdAt: new Date().toISOString()
            };
            
            // Create instance via AgentAPI
            const instance = await this.options.agentApiClient.createWSL2Instance(instanceConfig);
            
            // Store instance details
            this.instances.set(instanceId, {
                ...instance,
                config: instanceConfig,
                createdAt: new Date(),
                lastUsed: new Date(),
                status: 'active'
            });
            
            this.metrics.instancesCreated++;
            this.metrics.activeInstances++;
            
            console.log(`✅ WSL2 instance created: ${instanceId}`);
            return instance;
            
        } catch (error) {
            console.error('Failed to create WSL2 instance:', error);
            throw new Error(`Failed to create WSL2 instance: ${error.message}`);
        }
    }
    
    /**
     * Get an available WSL2 instance
     * @param {Object} requirements - Instance requirements
     * @returns {Promise<Object>} Available instance
     */
    async getAvailableInstance(requirements = {}) {
        try {
            // Look for existing available instance
            for (const [instanceId, instance] of this.instances) {
                if (instance.status === 'active' && this.meetsRequirements(instance, requirements)) {
                    instance.lastUsed = new Date();
                    console.log(`♻️ Reusing WSL2 instance: ${instanceId}`);
                    return instance;
                }
            }
            
            // Create new instance if none available
            return await this.createInstance(requirements);
            
        } catch (error) {
            console.error('Failed to get available instance:', error);
            throw error;
        }
    }
    
    /**
     * Deploy code to WSL2 instance
     * @param {string} instanceId - Instance ID
     * @param {Object} deploymentConfig - Deployment configuration
     * @returns {Promise<Object>} Deployment result
     */
    async deployToInstance(instanceId, deploymentConfig) {
        try {
            const instance = this.instances.get(instanceId);
            if (!instance) {
                throw new Error(`Instance ${instanceId} not found`);
            }
            
            console.log(`🚀 Deploying to WSL2 instance: ${instanceId}`);
            
            const deployment = await this.options.agentApiClient.deployToWSL2({
                instanceId,
                repositoryUrl: deploymentConfig.repositoryUrl,
                branch: deploymentConfig.branch,
                prNumber: deploymentConfig.prNumber,
                buildCommands: deploymentConfig.buildCommands || ['npm install', 'npm run build'],
                testCommands: deploymentConfig.testCommands || ['npm test']
            });
            
            instance.lastUsed = new Date();
            instance.deployments = instance.deployments || [];
            instance.deployments.push({
                ...deployment,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Deployment completed: ${instanceId}`);
            return deployment;
            
        } catch (error) {
            console.error('Deployment failed:', error);
            throw new Error(`Deployment failed: ${error.message}`);
        }
    }
    
    /**
     * Destroy WSL2 instance
     * @param {string} instanceId - Instance ID
     * @returns {Promise<void>}
     */
    async destroyInstance(instanceId) {
        try {
            const instance = this.instances.get(instanceId);
            if (!instance) {
                console.warn(`Instance ${instanceId} not found for destruction`);
                return;
            }
            
            console.log(`🗑️ Destroying WSL2 instance: ${instanceId}`);
            
            // Destroy via AgentAPI
            await this.options.agentApiClient.destroyWSL2Instance(instanceId);
            
            // Update metrics
            const lifetime = Date.now() - instance.createdAt.getTime();
            this.updateLifetimeMetrics(lifetime);
            
            // Remove from tracking
            this.instances.delete(instanceId);
            this.metrics.instancesDestroyed++;
            this.metrics.activeInstances--;
            
            console.log(`✅ WSL2 instance destroyed: ${instanceId}`);
            
        } catch (error) {
            console.error('Failed to destroy instance:', error);
            throw error;
        }
    }
    
    /**
     * Check if instance meets requirements
     * @param {Object} instance - Instance details
     * @param {Object} requirements - Requirements
     * @returns {boolean} Whether instance meets requirements
     */
    meetsRequirements(instance, requirements) {
        if (requirements.memory && this.parseMemory(instance.config.memory) < this.parseMemory(requirements.memory)) {
            return false;
        }
        if (requirements.cpuCores && instance.config.cpuCores < requirements.cpuCores) {
            return false;
        }
        if (requirements.diskSpace && this.parseDiskSpace(instance.config.diskSpace) < this.parseDiskSpace(requirements.diskSpace)) {
            return false;
        }
        return true;
    }
    
    /**
     * Parse memory string to MB
     * @param {string} memory - Memory string (e.g., "4GB")
     * @returns {number} Memory in MB
     */
    parseMemory(memory) {
        const match = memory.match(/(\d+)(GB|MB)/i);
        if (!match) return 0;
        const value = parseInt(match[1]);
        const unit = match[2].toUpperCase();
        return unit === 'GB' ? value * 1024 : value;
    }
    
    /**
     * Parse disk space string to GB
     * @param {string} diskSpace - Disk space string (e.g., "20GB")
     * @returns {number} Disk space in GB
     */
    parseDiskSpace(diskSpace) {
        const match = diskSpace.match(/(\d+)(GB|TB)/i);
        if (!match) return 0;
        const value = parseInt(match[1]);
        const unit = match[2].toUpperCase();
        return unit === 'TB' ? value * 1024 : value;
    }
    
    /**
     * Wait for an available instance slot
     * @returns {Promise<void>}
     */
    async waitForAvailableSlot() {
        return new Promise((resolve) => {
            const checkSlot = () => {
                if (this.instances.size < this.options.maxInstances) {
                    resolve();
                } else {
                    setTimeout(checkSlot, 1000);
                }
            };
            checkSlot();
        });
    }
    
    /**
     * Cleanup old instances
     */
    async cleanupInstances() {
        const now = Date.now();
        const timeout = this.options.instanceTimeout;
        
        for (const [instanceId, instance] of this.instances) {
            const age = now - instance.lastUsed.getTime();
            if (age > timeout) {
                console.log(`🧹 Cleaning up old instance: ${instanceId} (age: ${Math.round(age / 60000)}m)`);
                await this.destroyInstance(instanceId);
            }
        }
    }
    
    /**
     * Update lifetime metrics
     * @param {number} lifetime - Instance lifetime in ms
     */
    updateLifetimeMetrics(lifetime) {
        const currentAvg = this.metrics.averageLifetime;
        const totalDestroyed = this.metrics.instancesDestroyed;
        this.metrics.averageLifetime = (currentAvg * (totalDestroyed - 1) + lifetime) / totalDestroyed;
    }
    
    /**
     * Get WSL2 manager metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            instanceDetails: Array.from(this.instances.values()).map(instance => ({
                instanceId: instance.instanceId,
                status: instance.status,
                age: Date.now() - instance.createdAt.getTime(),
                lastUsed: instance.lastUsed.toISOString(),
                deployments: instance.deployments?.length || 0
            }))
        };
    }
    
    /**
     * Cleanup all instances and stop manager
     */
    async cleanup() {
        console.log('🧹 Cleaning up WSL2 Manager...');
        
        // Clear cleanup interval
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
        }
        
        // Destroy all instances
        const destroyPromises = Array.from(this.instances.keys()).map(instanceId => 
            this.destroyInstance(instanceId)
        );
        
        await Promise.all(destroyPromises);
        
        console.log('✅ WSL2 Manager cleanup completed');
    }
}

/**
 * Claude Code Engine for validation and debugging
 */
export class ClaudeCodeEngine {
    constructor(options = {}) {
        this.wsl2Manager = options.wsl2Manager;
        this.agentApiClient = options.agentApiClient;
        this.taskStorage = options.taskStorage;
        
        this.options = {
            validationTimeout: options.validationTimeout || 600000, // 10 minutes
            debugTimeout: options.debugTimeout || 900000, // 15 minutes
            maxDebugAttempts: options.maxDebugAttempts || 3,
            enableDetailedLogging: options.enableDetailedLogging !== false
        };
        
        this.validationHistory = [];
        this.metrics = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0,
            totalDebugSessions: 0,
            successfulDebugSessions: 0,
            averageValidationTime: 0,
            averageDebugTime: 0
        };
    }
    
    /**
     * Validate PR using Claude Code
     * @param {Object} validationConfig - Validation configuration
     * @returns {Promise<Object>} Validation result
     */
    async validatePR(validationConfig) {
        const startTime = Date.now();
        
        try {
            console.log(`🔍 Starting Claude Code validation for task: ${validationConfig.task.id}`);
            
            // Get or create WSL2 instance
            const instance = await this.wsl2Manager.getAvailableInstance({
                memory: '4GB',
                cpuCores: 2
            });
            
            // Deploy PR to instance
            const deployment = await this.wsl2Manager.deployToInstance(instance.instanceId, {
                repositoryUrl: validationConfig.task.repository_url,
                branch: validationConfig.prBranch,
                prNumber: validationConfig.task.pr_number
            });
            
            // Run Claude Code validation
            const validationResult = await this.runClaudeCodeValidation({
                instanceId: instance.instanceId,
                task: validationConfig.task,
                deployment,
                context: validationConfig.context,
                attemptNumber: validationConfig.attemptNumber
            });
            
            // Update metrics
            const validationTime = Date.now() - startTime;
            this.updateValidationMetrics(validationResult.success, validationTime);
            
            // Store validation history
            this.validationHistory.push({
                taskId: validationConfig.task.id,
                instanceId: instance.instanceId,
                timestamp: new Date().toISOString(),
                validationTime,
                success: validationResult.success,
                result: validationResult
            });
            
            console.log(`${validationResult.success ? '✅' : '❌'} Claude Code validation completed: ${validationResult.success ? 'PASSED' : 'FAILED'}`);
            
            return validationResult;
            
        } catch (error) {
            const validationTime = Date.now() - startTime;
            this.updateValidationMetrics(false, validationTime);
            
            console.error('Claude Code validation failed:', error);
            throw new Error(`Claude Code validation failed: ${error.message}`);
        }
    }
    
    /**
     * Run Claude Code validation on WSL2 instance
     * @param {Object} config - Validation configuration
     * @returns {Promise<Object>} Validation result
     */
    async runClaudeCodeValidation(config) {
        try {
            const validationRequest = {
                instanceId: config.instanceId,
                task: {
                    id: config.task.id,
                    title: config.task.title,
                    requirements: config.task.requirements,
                    acceptanceCriteria: config.task.acceptance_criteria,
                    implementationFiles: config.task.implementation_files
                },
                validation: {
                    runTests: true,
                    checkCodeQuality: true,
                    validateRequirements: true,
                    checkSecurity: true,
                    checkPerformance: true
                },
                context: config.context,
                timeout: this.options.validationTimeout
            };
            
            const result = await this.agentApiClient.runClaudeCodeValidation(validationRequest);
            
            return {
                success: result.overall_status === 'passed',
                status: result.overall_status,
                summary: result.summary,
                details: {
                    tests: result.test_results,
                    codeQuality: result.code_quality,
                    requirements: result.requirements_validation,
                    security: result.security_check,
                    performance: result.performance_check
                },
                errors: result.errors || [],
                warnings: result.warnings || [],
                suggestions: result.suggestions || [],
                metrics: result.metrics,
                logs: result.logs,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Claude Code validation execution failed:', error);
            throw error;
        }
    }
    
    /**
     * Debug and fix issues using Claude Code
     * @param {Object} debugConfig - Debug configuration
     * @returns {Promise<Object>} Debug result
     */
    async debugAndFix(debugConfig) {
        const startTime = Date.now();
        let attempts = 0;
        const maxAttempts = this.options.maxDebugAttempts;
        
        try {
            console.log(`🔧 Starting Claude Code debugging for task: ${debugConfig.task.id}`);
            
            while (attempts < maxAttempts) {
                attempts++;
                
                console.log(`🔧 Debug attempt ${attempts}/${maxAttempts}`);
                
                const debugResult = await this.runClaudeCodeDebug({
                    ...debugConfig,
                    attemptNumber: attempts,
                    previousAttempts: attempts > 1 ? this.getDebugHistory(debugConfig.task.id) : []
                });
                
                if (debugResult.success) {
                    const debugTime = Date.now() - startTime;
                    this.updateDebugMetrics(true, debugTime);
                    
                    console.log(`✅ Claude Code debugging successful after ${attempts} attempts`);
                    return debugResult;
                }
                
                // If not successful and not the last attempt, wait before retry
                if (attempts < maxAttempts) {
                    console.log(`⏳ Debug attempt ${attempts} failed, waiting before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            
            // All attempts failed
            const debugTime = Date.now() - startTime;
            this.updateDebugMetrics(false, debugTime);
            
            console.log(`❌ Claude Code debugging failed after ${maxAttempts} attempts`);
            return {
                success: false,
                attempts: maxAttempts,
                reason: 'max_attempts_exceeded',
                summary: 'Unable to resolve issues after maximum debug attempts'
            };
            
        } catch (error) {
            const debugTime = Date.now() - startTime;
            this.updateDebugMetrics(false, debugTime);
            
            console.error('Claude Code debugging failed:', error);
            throw new Error(`Claude Code debugging failed: ${error.message}`);
        }
    }
    
    /**
     * Run Claude Code debugging session
     * @param {Object} config - Debug configuration
     * @returns {Promise<Object>} Debug result
     */
    async runClaudeCodeDebug(config) {
        try {
            const debugRequest = {
                task: config.task,
                prUrl: config.prUrl,
                validationErrors: config.validationErrors,
                attemptNumber: config.attemptNumber,
                previousAttempts: config.previousAttempts,
                debug: {
                    analyzeErrors: true,
                    suggestFixes: true,
                    implementFixes: true,
                    validateFixes: true
                },
                timeout: this.options.debugTimeout
            };
            
            const result = await this.agentApiClient.runClaudeCodeDebug(debugRequest);
            
            return {
                success: result.status === 'resolved',
                status: result.status,
                summary: result.summary,
                analysis: result.error_analysis,
                fixes: result.implemented_fixes,
                validation: result.fix_validation,
                suggestions: result.additional_suggestions,
                logs: result.debug_logs,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Claude Code debug execution failed:', error);
            throw error;
        }
    }
    
    /**
     * Get debug history for a task
     * @param {string} taskId - Task ID
     * @returns {Array} Debug history
     */
    getDebugHistory(taskId) {
        return this.validationHistory
            .filter(entry => entry.taskId === taskId && !entry.success)
            .map(entry => ({
                timestamp: entry.timestamp,
                errors: entry.result.errors,
                suggestions: entry.result.suggestions
            }));
    }
    
    /**
     * Update validation metrics
     * @param {boolean} success - Whether validation was successful
     * @param {number} validationTime - Validation time in ms
     */
    updateValidationMetrics(success, validationTime) {
        this.metrics.totalValidations++;
        
        if (success) {
            this.metrics.successfulValidations++;
        } else {
            this.metrics.failedValidations++;
        }
        
        // Update average validation time
        const total = this.metrics.totalValidations;
        this.metrics.averageValidationTime = 
            (this.metrics.averageValidationTime * (total - 1) + validationTime) / total;
    }
    
    /**
     * Update debug metrics
     * @param {boolean} success - Whether debug was successful
     * @param {number} debugTime - Debug time in ms
     */
    updateDebugMetrics(success, debugTime) {
        this.metrics.totalDebugSessions++;
        
        if (success) {
            this.metrics.successfulDebugSessions++;
        }
        
        // Update average debug time
        const total = this.metrics.totalDebugSessions;
        this.metrics.averageDebugTime = 
            (this.metrics.averageDebugTime * (total - 1) + debugTime) / total;
    }
    
    /**
     * Get Claude Code engine metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            validationSuccessRate: this.metrics.totalValidations > 0 
                ? (this.metrics.successfulValidations / this.metrics.totalValidations) * 100 
                : 0,
            debugSuccessRate: this.metrics.totalDebugSessions > 0 
                ? (this.metrics.successfulDebugSessions / this.metrics.totalDebugSessions) * 100 
                : 0,
            wsl2Metrics: this.wsl2Manager.getMetrics()
        };
    }
    
    /**
     * Get validation history
     * @param {Object} options - Query options
     * @returns {Array} Validation history
     */
    getValidationHistory(options = {}) {
        const limit = options.limit || 50;
        const taskId = options.taskId;
        
        let history = this.validationHistory;
        
        if (taskId) {
            history = history.filter(entry => entry.taskId === taskId);
        }
        
        return history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    /**
     * Health check for Claude Code engine
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const agentApiHealth = await this.agentApiClient.healthCheck();
            const wsl2Health = this.wsl2Manager.getMetrics();
            
            return {
                status: agentApiHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
                agentApi: agentApiHealth,
                wsl2Manager: {
                    status: 'healthy',
                    activeInstances: wsl2Health.activeInstances,
                    totalInstances: wsl2Health.totalInstances
                },
                metrics: this.getMetrics()
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

export default { WSL2Manager, ClaudeCodeEngine };
