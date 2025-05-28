/**
 * Codegen Integration Service
 * Handles intelligent prompt generation and API communication with Codegen
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class CodegenIntegration {
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || process.env.CODEGEN_API_KEY,
            orgId: config.orgId || process.env.CODEGEN_ORG_ID,
            apiUrl: config.apiUrl || process.env.CODEGEN_API_URL || 'https://api.codegen.sh',
            timeout: config.timeout || parseInt(process.env.CODEGEN_TIMEOUT) || 60000,
            maxRetries: config.maxRetries || parseInt(process.env.CODEGEN_MAX_RETRIES) || 3,
            enableMockMode: config.enableMockMode || process.env.CODEGEN_ENABLE_MOCK_MODE === 'true',
            ...config
        };

        this.retryAttempts = new Map();
        this.requestHistory = new Map();
        
        if (!this.config.apiKey && !this.config.enableMockMode) {
            console.warn('⚠️  CODEGEN_API_KEY not provided. Running in mock mode.');
            this.config.enableMockMode = true;
        }
    }

    async initialize() {
        console.log('🔧 Initializing Codegen Integration Service...');
        
        if (this.config.enableMockMode) {
            console.log('🎭 Running in mock mode - no real API calls will be made');
        } else {
            // Validate API connection
            try {
                await this.validateConnection();
                console.log('✅ Codegen API connection validated');
            } catch (error) {
                console.error('❌ Failed to validate Codegen API connection:', error.message);
                throw error;
            }
        }
    }

    async validateConnection() {
        if (this.config.enableMockMode) {
            return { status: 'mock_mode', connected: true };
        }

        try {
            const response = await axios.get(`${this.config.apiUrl}/health`, {
                headers: this.getHeaders(),
                timeout: 5000
            });
            
            return response.data;
        } catch (error) {
            throw new Error(`Codegen API connection failed: ${error.message}`);
        }
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Org-ID': this.config.orgId,
            'User-Agent': 'comprehensive-cicd/1.0.0'
        };
    }

    /**
     * Generate intelligent prompt from task context
     */
    async generatePrompt(taskContext, contextOptions = {}) {
        const startTime = Date.now();
        const requestId = uuidv4();

        try {
            console.log(`[${requestId}] Generating prompt for task: ${taskContext.id}`);

            if (this.config.enableMockMode) {
                return this.generateMockPrompt(taskContext, contextOptions);
            }

            // Build comprehensive prompt context
            const promptContext = this.buildPromptContext(taskContext, contextOptions);
            
            // Call Codegen API for prompt generation
            const response = await axios.post(
                `${this.config.apiUrl}/v1/prompts/generate`,
                {
                    task_context: promptContext,
                    options: {
                        include_codebase_context: contextOptions.includeCodebaseContext !== false,
                        include_dependencies: contextOptions.includeDependencies !== false,
                        include_validation_criteria: contextOptions.includeValidationCriteria !== false,
                        prompt_style: contextOptions.promptStyle || 'comprehensive',
                        ...contextOptions
                    }
                },
                {
                    headers: this.getHeaders(),
                    timeout: this.config.timeout
                }
            );

            const promptResult = {
                id: requestId,
                task_id: taskContext.id,
                prompt: response.data.prompt,
                context_used: promptContext,
                generation_time_ms: Date.now() - startTime,
                api_response: response.data,
                created_at: new Date().toISOString()
            };

            this.requestHistory.set(requestId, promptResult);
            
            console.log(`[${requestId}] Prompt generated successfully in ${promptResult.generation_time_ms}ms`);
            return promptResult;

        } catch (error) {
            console.error(`[${requestId}] Error generating prompt:`, error.message);
            
            const errorResult = {
                id: requestId,
                task_id: taskContext.id,
                error: error.message,
                generation_time_ms: Date.now() - startTime,
                created_at: new Date().toISOString()
            };

            this.requestHistory.set(requestId, errorResult);
            throw error;
        }
    }

    /**
     * Create PR using Codegen API
     */
    async createPR(taskId, promptData, options = {}) {
        const startTime = Date.now();
        const requestId = uuidv4();

        try {
            console.log(`[${requestId}] Creating PR for task: ${taskId}`);

            if (this.config.enableMockMode) {
                return this.createMockPR(taskId, promptData, options);
            }

            const response = await axios.post(
                `${this.config.apiUrl}/v1/prs/create`,
                {
                    task_id: taskId,
                    prompt: promptData.prompt,
                    context: promptData.context_used,
                    options: {
                        branch_name: options.branchName || `codegen/task-${taskId}`,
                        commit_message: options.commitMessage || `Implement task ${taskId}`,
                        pr_title: options.prTitle || `[Codegen] Implement ${promptData.context_used?.title || taskId}`,
                        pr_description: options.prDescription || this.generatePRDescription(promptData),
                        auto_merge: options.autoMerge || false,
                        ...options
                    }
                },
                {
                    headers: this.getHeaders(),
                    timeout: this.config.timeout
                }
            );

            const prResult = {
                id: requestId,
                task_id: taskId,
                pr_url: response.data.pr_url,
                pr_number: response.data.pr_number,
                branch_name: response.data.branch_name,
                commit_sha: response.data.commit_sha,
                creation_time_ms: Date.now() - startTime,
                api_response: response.data,
                created_at: new Date().toISOString()
            };

            this.requestHistory.set(requestId, prResult);
            
            console.log(`[${requestId}] PR created successfully: ${prResult.pr_url} in ${prResult.creation_time_ms}ms`);
            return prResult;

        } catch (error) {
            console.error(`[${requestId}] Error creating PR:`, error.message);
            
            const errorResult = {
                id: requestId,
                task_id: taskId,
                error: error.message,
                creation_time_ms: Date.now() - startTime,
                created_at: new Date().toISOString()
            };

            this.requestHistory.set(requestId, errorResult);
            throw error;
        }
    }

    /**
     * Retry failed request with exponential backoff
     */
    async retryRequest(taskId, retryOptions = {}) {
        const currentAttempts = this.retryAttempts.get(taskId) || 0;
        
        if (currentAttempts >= this.config.maxRetries) {
            throw new Error(`Maximum retry attempts (${this.config.maxRetries}) exceeded for task ${taskId}`);
        }

        // Exponential backoff delay
        const delay = Math.pow(2, currentAttempts) * 1000; // 1s, 2s, 4s, 8s...
        
        console.log(`Retrying task ${taskId} (attempt ${currentAttempts + 1}/${this.config.maxRetries}) after ${delay}ms delay`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.retryAttempts.set(taskId, currentAttempts + 1);

        try {
            // Implement retry logic based on the type of failure
            const result = await this.executeRetryStrategy(taskId, retryOptions);
            
            // Reset retry count on success
            this.retryAttempts.delete(taskId);
            
            return {
                success: true,
                attempt: currentAttempts + 1,
                result
            };
        } catch (error) {
            console.error(`Retry attempt ${currentAttempts + 1} failed for task ${taskId}:`, error.message);
            
            if (currentAttempts + 1 >= this.config.maxRetries) {
                this.retryAttempts.delete(taskId);
            }
            
            return {
                success: false,
                attempt: currentAttempts + 1,
                error: error.message,
                will_retry: currentAttempts + 1 < this.config.maxRetries
            };
        }
    }

    async executeRetryStrategy(taskId, retryOptions) {
        // Implement different retry strategies based on failure type
        const strategy = retryOptions.strategy || 'regenerate_prompt';
        
        switch (strategy) {
            case 'regenerate_prompt':
                // Regenerate prompt with different parameters
                return await this.retryWithNewPrompt(taskId, retryOptions);
            
            case 'different_approach':
                // Try a different implementation approach
                return await this.retryWithDifferentApproach(taskId, retryOptions);
            
            case 'simplified_scope':
                // Retry with simplified scope
                return await this.retryWithSimplifiedScope(taskId, retryOptions);
            
            default:
                throw new Error(`Unknown retry strategy: ${strategy}`);
        }
    }

    async retryWithNewPrompt(taskId, options) {
        // Implementation for regenerating prompt with different parameters
        console.log(`Retrying task ${taskId} with new prompt generation`);
        
        // This would integrate with the task storage to get context and regenerate
        throw new Error('Retry with new prompt not yet implemented');
    }

    async retryWithDifferentApproach(taskId, options) {
        // Implementation for trying different approach
        console.log(`Retrying task ${taskId} with different approach`);
        
        throw new Error('Retry with different approach not yet implemented');
    }

    async retryWithSimplifiedScope(taskId, options) {
        // Implementation for simplified scope retry
        console.log(`Retrying task ${taskId} with simplified scope`);
        
        throw new Error('Retry with simplified scope not yet implemented');
    }

    buildPromptContext(taskContext, contextOptions) {
        return {
            id: taskContext.id,
            title: taskContext.title,
            description: taskContext.description,
            requirements: taskContext.requirements || [],
            acceptance_criteria: taskContext.acceptance_criteria || [],
            dependencies: taskContext.dependencies || [],
            codebase_context: contextOptions.includeCodebaseContext ? taskContext.codebase_context : null,
            validation_requirements: contextOptions.includeValidationCriteria ? taskContext.validation_requirements : null,
            priority: taskContext.priority || 'medium',
            estimated_complexity: taskContext.estimated_complexity || 'medium',
            tags: taskContext.tags || [],
            created_at: taskContext.created_at,
            updated_at: taskContext.updated_at
        };
    }

    generatePRDescription(promptData) {
        const context = promptData.context_used;
        
        return `## Automated Implementation

This PR was generated automatically by the Comprehensive CI/CD system.

### Task Details
- **Task ID**: ${context.id}
- **Title**: ${context.title}
- **Priority**: ${context.priority}

### Implementation Summary
${context.description}

### Acceptance Criteria
${context.acceptance_criteria?.map(criteria => `- ${criteria}`).join('\n') || 'No specific criteria provided'}

### Dependencies
${context.dependencies?.map(dep => `- ${dep}`).join('\n') || 'No dependencies'}

---
*Generated by Codegen Integration v1.0.0*`;
    }

    // Mock implementations for development and testing

    generateMockPrompt(taskContext, contextOptions) {
        console.log('🎭 Generating mock prompt');
        
        return {
            id: uuidv4(),
            task_id: taskContext.id,
            prompt: `Implement the following task: ${taskContext.title}\n\nDescription: ${taskContext.description}\n\nRequirements:\n${taskContext.requirements?.map(req => `- ${req}`).join('\n') || 'No specific requirements'}`,
            context_used: this.buildPromptContext(taskContext, contextOptions),
            generation_time_ms: Math.floor(Math.random() * 1000) + 500, // 500-1500ms
            api_response: { mock: true },
            created_at: new Date().toISOString()
        };
    }

    createMockPR(taskId, promptData, options) {
        console.log('🎭 Creating mock PR');
        
        const prNumber = Math.floor(Math.random() * 1000) + 1;
        
        return {
            id: uuidv4(),
            task_id: taskId,
            pr_url: `https://github.com/mock-org/mock-repo/pull/${prNumber}`,
            pr_number: prNumber,
            branch_name: options.branchName || `codegen/task-${taskId}`,
            commit_sha: Math.random().toString(36).substring(2, 15),
            creation_time_ms: Math.floor(Math.random() * 5000) + 2000, // 2-7 seconds
            api_response: { mock: true },
            created_at: new Date().toISOString()
        };
    }

    // Utility methods

    getRequestHistory(taskId = null) {
        if (taskId) {
            return Array.from(this.requestHistory.values()).filter(req => req.task_id === taskId);
        }
        return Array.from(this.requestHistory.values());
    }

    getRetryStatus(taskId) {
        return {
            attempts: this.retryAttempts.get(taskId) || 0,
            max_retries: this.config.maxRetries,
            can_retry: (this.retryAttempts.get(taskId) || 0) < this.config.maxRetries
        };
    }

    clearHistory() {
        this.requestHistory.clear();
        this.retryAttempts.clear();
    }
}

module.exports = CodegenIntegration;

