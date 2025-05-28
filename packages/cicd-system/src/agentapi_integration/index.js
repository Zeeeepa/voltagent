/**
 * @fileoverview AgentAPI Integration Component
 * HTTP API client for Claude Code, Goose, Aider, and Codex
 * 
 * Provides seamless integration with AgentAPI for:
 * - WSL2 instance management
 * - Claude Code validation and debugging
 * - Code execution and testing
 * - Performance monitoring
 */

/**
 * AgentAPI Client for HTTP communication
 */
export class AgentAPIClient {
    constructor(options = {}) {
        this.options = {
            baseUrl: options.baseUrl || process.env.AGENTAPI_URL || 'http://localhost:8080',
            timeout: options.timeout || 120000, // 2 minutes
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 5000,
            enableMockMode: options.enableMockMode || false
        };
        
        this.requestHistory = [];
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            wsl2InstancesCreated: 0,
            validationRequestsProcessed: 0
        };
        
        console.log(`🔌 AgentAPI Client initialized: ${this.options.baseUrl}`);
    }
    
    /**
     * Create WSL2 instance via AgentAPI
     * @param {Object} config - Instance configuration
     * @returns {Promise<Object>} Instance details
     */
    async createWSL2Instance(config) {
        const startTime = Date.now();
        
        try {
            console.log(`🖥️ Creating WSL2 instance via AgentAPI: ${config.instanceId}`);
            
            if (this.options.enableMockMode) {
                return await this.mockCreateWSL2Instance(config);
            }
            
            const response = await this.makeRequest('POST', '/api/v1/wsl2/instances', {
                instanceId: config.instanceId,
                memory: config.memory,
                cpuCores: config.cpuCores,
                diskSpace: config.diskSpace,
                operatingSystem: config.operatingSystem || 'Ubuntu-22.04',
                packages: config.packages || ['nodejs', 'npm', 'git', 'python3', 'pip'],
                environment: config.environment || {}
            });
            
            this.metrics.wsl2InstancesCreated++;
            this.updateMetrics(true, Date.now() - startTime);
            
            console.log(`✅ WSL2 instance created: ${response.instanceId}`);
            
            return {
                instanceId: response.instanceId,
                status: response.status,
                ipAddress: response.ipAddress,
                sshPort: response.sshPort,
                webPort: response.webPort,
                createdAt: response.createdAt,
                config: response.config
            };
            
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            console.error('Failed to create WSL2 instance:', error);
            throw new Error(`Failed to create WSL2 instance: ${error.message}`);
        }
    }
    
    /**
     * Deploy code to WSL2 instance
     * @param {Object} deploymentConfig - Deployment configuration
     * @returns {Promise<Object>} Deployment result
     */
    async deployToWSL2(deploymentConfig) {
        const startTime = Date.now();
        
        try {
            console.log(`🚀 Deploying to WSL2 instance: ${deploymentConfig.instanceId}`);
            
            if (this.options.enableMockMode) {
                return await this.mockDeployToWSL2(deploymentConfig);
            }
            
            const response = await this.makeRequest('POST', `/api/v1/wsl2/instances/${deploymentConfig.instanceId}/deploy`, {
                repositoryUrl: deploymentConfig.repositoryUrl,
                branch: deploymentConfig.branch,
                prNumber: deploymentConfig.prNumber,
                buildCommands: deploymentConfig.buildCommands,
                testCommands: deploymentConfig.testCommands,
                environment: deploymentConfig.environment || {}
            });
            
            this.updateMetrics(true, Date.now() - startTime);
            
            console.log(`✅ Deployment completed: ${response.deploymentId}`);
            
            return {
                deploymentId: response.deploymentId,
                status: response.status,
                buildOutput: response.buildOutput,
                testOutput: response.testOutput,
                artifacts: response.artifacts,
                deployedAt: response.deployedAt
            };
            
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            console.error('Deployment failed:', error);
            throw new Error(`Deployment failed: ${error.message}`);
        }
    }
    
    /**
     * Run Claude Code validation
     * @param {Object} validationRequest - Validation request
     * @returns {Promise<Object>} Validation result
     */
    async runClaudeCodeValidation(validationRequest) {
        const startTime = Date.now();
        
        try {
            console.log(`🔍 Running Claude Code validation: ${validationRequest.task.id}`);
            
            if (this.options.enableMockMode) {
                return await this.mockClaudeCodeValidation(validationRequest);
            }
            
            const response = await this.makeRequest('POST', '/api/v1/claude-code/validate', {
                instanceId: validationRequest.instanceId,
                task: validationRequest.task,
                validation: validationRequest.validation,
                context: validationRequest.context,
                timeout: validationRequest.timeout
            });
            
            this.metrics.validationRequestsProcessed++;
            this.updateMetrics(true, Date.now() - startTime);
            
            console.log(`✅ Claude Code validation completed: ${response.overall_status}`);
            
            return {
                overall_status: response.overall_status,
                summary: response.summary,
                test_results: response.test_results,
                code_quality: response.code_quality,
                requirements_validation: response.requirements_validation,
                security_check: response.security_check,
                performance_check: response.performance_check,
                errors: response.errors,
                warnings: response.warnings,
                suggestions: response.suggestions,
                metrics: response.metrics,
                logs: response.logs,
                completedAt: response.completedAt
            };
            
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            console.error('Claude Code validation failed:', error);
            throw new Error(`Claude Code validation failed: ${error.message}`);
        }
    }
    
    /**
     * Run Claude Code debugging session
     * @param {Object} debugRequest - Debug request
     * @returns {Promise<Object>} Debug result
     */
    async runClaudeCodeDebug(debugRequest) {
        const startTime = Date.now();
        
        try {
            console.log(`🔧 Running Claude Code debug session: ${debugRequest.task.id}`);
            
            if (this.options.enableMockMode) {
                return await this.mockClaudeCodeDebug(debugRequest);
            }
            
            const response = await this.makeRequest('POST', '/api/v1/claude-code/debug', {
                task: debugRequest.task,
                prUrl: debugRequest.prUrl,
                validationErrors: debugRequest.validationErrors,
                attemptNumber: debugRequest.attemptNumber,
                previousAttempts: debugRequest.previousAttempts,
                debug: debugRequest.debug,
                timeout: debugRequest.timeout
            });
            
            this.updateMetrics(true, Date.now() - startTime);
            
            console.log(`✅ Claude Code debug completed: ${response.status}`);
            
            return {
                status: response.status,
                summary: response.summary,
                error_analysis: response.error_analysis,
                implemented_fixes: response.implemented_fixes,
                fix_validation: response.fix_validation,
                additional_suggestions: response.additional_suggestions,
                debug_logs: response.debug_logs,
                completedAt: response.completedAt
            };
            
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            console.error('Claude Code debug failed:', error);
            throw new Error(`Claude Code debug failed: ${error.message}`);
        }
    }
    
    /**
     * Destroy WSL2 instance
     * @param {string} instanceId - Instance ID
     * @returns {Promise<void>}
     */
    async destroyWSL2Instance(instanceId) {
        const startTime = Date.now();
        
        try {
            console.log(`🗑️ Destroying WSL2 instance: ${instanceId}`);
            
            if (this.options.enableMockMode) {
                await this.mockDestroyWSL2Instance(instanceId);
                return;
            }
            
            await this.makeRequest('DELETE', `/api/v1/wsl2/instances/${instanceId}`);
            
            this.updateMetrics(true, Date.now() - startTime);
            
            console.log(`✅ WSL2 instance destroyed: ${instanceId}`);
            
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            console.error('Failed to destroy WSL2 instance:', error);
            throw new Error(`Failed to destroy WSL2 instance: ${error.message}`);
        }
    }
    
    /**
     * Make HTTP request to AgentAPI
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<Object>} Response data
     */
    async makeRequest(method, endpoint, data = null) {
        const url = `${this.options.baseUrl}${endpoint}`;
        let attempts = 0;
        const maxAttempts = this.options.maxRetries;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
                
                const requestOptions = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'CICD-System/1.0'
                    },
                    signal: controller.signal
                };
                
                if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                    requestOptions.body = JSON.stringify(data);
                }
                
                const response = await fetch(url, requestOptions);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const responseData = await response.json();
                
                // Store request history
                this.requestHistory.push({
                    method,
                    endpoint,
                    timestamp: new Date().toISOString(),
                    success: true,
                    attempts,
                    responseTime: Date.now() - Date.now() // This would be calculated properly in real implementation
                });
                
                return responseData;
                
            } catch (error) {
                console.error(`AgentAPI request attempt ${attempts} failed:`, error);
                
                if (attempts >= maxAttempts) {
                    this.requestHistory.push({
                        method,
                        endpoint,
                        timestamp: new Date().toISOString(),
                        success: false,
                        attempts,
                        error: error.message
                    });
                    
                    throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
            }
        }
    }
    
    /**
     * Mock WSL2 instance creation for testing
     * @param {Object} config - Instance configuration
     * @returns {Promise<Object>} Mock instance
     */
    async mockCreateWSL2Instance(config) {
        console.log('🎭 Mock: Creating WSL2 instance...');
        
        // Simulate creation delay
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        return {
            instanceId: config.instanceId,
            status: 'running',
            ipAddress: '192.168.1.100',
            sshPort: 22,
            webPort: 3000,
            createdAt: new Date().toISOString(),
            config: config
        };
    }
    
    /**
     * Mock deployment for testing
     * @param {Object} deploymentConfig - Deployment configuration
     * @returns {Promise<Object>} Mock deployment result
     */
    async mockDeployToWSL2(deploymentConfig) {
        console.log('🎭 Mock: Deploying to WSL2...');
        
        // Simulate deployment delay
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000));
        
        return {
            deploymentId: `deploy_${Date.now()}`,
            status: 'success',
            buildOutput: 'Build completed successfully\nnpm install completed\nnpm run build completed',
            testOutput: 'All tests passed\n✓ 15 tests completed',
            artifacts: ['dist/', 'build/'],
            deployedAt: new Date().toISOString()
        };
    }
    
    /**
     * Mock Claude Code validation for testing
     * @param {Object} validationRequest - Validation request
     * @returns {Promise<Object>} Mock validation result
     */
    async mockClaudeCodeValidation(validationRequest) {
        console.log('🎭 Mock: Running Claude Code validation...');
        
        // Simulate validation delay
        await new Promise(resolve => setTimeout(resolve, 10000 + Math.random() * 20000));
        
        // Randomly determine success/failure for testing
        const success = Math.random() > 0.3; // 70% success rate
        
        return {
            overall_status: success ? 'passed' : 'failed',
            summary: success 
                ? 'All validation checks passed successfully'
                : 'Some validation checks failed',
            test_results: {
                total: 15,
                passed: success ? 15 : 12,
                failed: success ? 0 : 3,
                coverage: success ? 95 : 78
            },
            code_quality: {
                score: success ? 9.2 : 7.1,
                issues: success ? [] : ['Unused variable in line 42', 'Missing error handling']
            },
            requirements_validation: {
                met: success ? 5 : 3,
                total: 5,
                details: success ? 'All requirements satisfied' : 'Some requirements not fully met'
            },
            security_check: {
                vulnerabilities: success ? 0 : 1,
                severity: success ? 'none' : 'low'
            },
            performance_check: {
                score: success ? 8.5 : 6.2,
                issues: success ? [] : ['Potential memory leak detected']
            },
            errors: success ? [] : ['Test failure in authentication module'],
            warnings: success ? [] : ['Deprecated API usage detected'],
            suggestions: ['Consider adding more unit tests', 'Update documentation'],
            metrics: {
                executionTime: Math.floor(Math.random() * 30000) + 10000,
                memoryUsage: Math.floor(Math.random() * 500) + 100,
                cpuUsage: Math.floor(Math.random() * 50) + 20
            },
            logs: 'Validation completed with detailed analysis',
            completedAt: new Date().toISOString()
        };
    }
    
    /**
     * Mock Claude Code debugging for testing
     * @param {Object} debugRequest - Debug request
     * @returns {Promise<Object>} Mock debug result
     */
    async mockClaudeCodeDebug(debugRequest) {
        console.log('🎭 Mock: Running Claude Code debug...');
        
        // Simulate debug delay
        await new Promise(resolve => setTimeout(resolve, 15000 + Math.random() * 25000));
        
        // Randomly determine debug success
        const success = Math.random() > 0.4; // 60% success rate
        
        return {
            status: success ? 'resolved' : 'partial',
            summary: success 
                ? 'All issues successfully resolved'
                : 'Some issues resolved, manual intervention may be required',
            error_analysis: {
                rootCause: 'Authentication token validation failure',
                affectedComponents: ['auth.js', 'middleware/auth.js'],
                severity: 'medium'
            },
            implemented_fixes: success ? [
                'Updated token validation logic',
                'Added proper error handling',
                'Fixed async/await usage'
            ] : [
                'Partially updated token validation',
                'Added basic error handling'
            ],
            fix_validation: {
                testsRun: 8,
                testsPassed: success ? 8 : 6,
                validationStatus: success ? 'passed' : 'partial'
            },
            additional_suggestions: [
                'Consider implementing token refresh mechanism',
                'Add comprehensive logging for debugging'
            ],
            debug_logs: 'Debug session completed with automated fixes applied',
            completedAt: new Date().toISOString()
        };
    }
    
    /**
     * Mock WSL2 instance destruction for testing
     * @param {string} instanceId - Instance ID
     * @returns {Promise<void>}
     */
    async mockDestroyWSL2Instance(instanceId) {
        console.log(`🎭 Mock: Destroying WSL2 instance ${instanceId}...`);
        
        // Simulate destruction delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
    
    /**
     * Update client metrics
     * @param {boolean} success - Whether request was successful
     * @param {number} responseTime - Response time in ms
     */
    updateMetrics(success, responseTime) {
        this.metrics.totalRequests++;
        
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        // Update average response time
        const total = this.metrics.totalRequests;
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime * (total - 1) + responseTime) / total;
    }
    
    /**
     * Get client metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalRequests > 0 
                ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
                : 0,
            requestHistory: this.requestHistory.slice(-10) // Last 10 requests
        };
    }
    
    /**
     * Health check for AgentAPI
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            if (this.options.enableMockMode) {
                return {
                    status: 'healthy',
                    mode: 'mock',
                    message: 'Running in mock mode'
                };
            }
            
            const response = await this.makeRequest('GET', '/api/v1/health');
            
            return {
                status: 'healthy',
                mode: 'real',
                version: response.version,
                uptime: response.uptime,
                services: response.services
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                mode: 'real',
                error: error.message
            };
        }
    }
    
    /**
     * Get request history
     * @param {Object} options - Query options
     * @returns {Array} Request history
     */
    getRequestHistory(options = {}) {
        const limit = options.limit || 50;
        const endpoint = options.endpoint;
        
        let history = this.requestHistory;
        
        if (endpoint) {
            history = history.filter(req => req.endpoint.includes(endpoint));
        }
        
        return history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
}

export default { AgentAPIClient };
