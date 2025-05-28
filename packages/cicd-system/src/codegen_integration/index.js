/**
 * @fileoverview Codegen Integration - PR #13 Component
 * Database → Codegen Communication Layer
 * 
 * Provides intelligent integration with Codegen API for:
 * - Intelligent prompt generation from database tasks
 * - PR creation and tracking
 * - Context-aware code generation requests
 * - Error handling and retry logic
 * - Performance monitoring and optimization
 */

/**
 * Prompt Generator for creating intelligent Codegen prompts
 */
export class PromptGenerator {
    constructor(options = {}) {
        this.options = {
            includeContext: options.includeContext !== false,
            includeDependencies: options.includeDependencies !== false,
            includeValidationCriteria: options.includeValidationCriteria !== false,
            maxPromptLength: options.maxPromptLength || 8000,
            templateVersion: options.templateVersion || 'v2.0'
        };
        
        this.templates = this.initializeTemplates();
    }
    
    /**
     * Initialize prompt templates
     */
    initializeTemplates() {
        return {
            taskImplementation: `
# Task Implementation Request

## Task Overview
**Title**: {title}
**Priority**: {priority}
**Complexity**: {complexity}/10
**Estimated Effort**: {effort} hours

## Description
{description}

## Requirements
{requirements}

## Acceptance Criteria
{acceptanceCriteria}

## Implementation Guidelines
- **Affected Files**: {affectedFiles}
- **Dependencies**: {dependencies}
- **Tags**: {tags}

{contextSection}
{validationSection}
{errorSection}

## Expected Deliverables
1. Implement the specified functionality
2. Ensure all requirements are met
3. Follow project coding standards
4. Include appropriate error handling
5. Add necessary tests
6. Update documentation as needed

## Additional Context
- Repository: {repositoryUrl}
- Workflow ID: {workflowId}
- Task ID: {taskId}

Please implement this task following best practices and ensure the code is production-ready.
            `,
            
            bugFix: `
# Bug Fix Request

## Issue Overview
**Title**: {title}
**Priority**: {priority} (Bug Fix)
**Severity**: {severity}

## Problem Description
{description}

## Error Details
{errorDetails}

## Requirements for Fix
{requirements}

## Validation Criteria
{acceptanceCriteria}

{contextSection}
{previousAttemptsSection}

## Expected Resolution
1. Identify and fix the root cause
2. Ensure the fix doesn't introduce new issues
3. Add tests to prevent regression
4. Update documentation if necessary

Please provide a comprehensive fix that addresses the underlying issue.
            `,
            
            enhancement: `
# Feature Enhancement Request

## Enhancement Overview
**Title**: {title}
**Type**: Enhancement/Feature
**Complexity**: {complexity}/10

## Enhancement Description
{description}

## Requirements
{requirements}

## Success Criteria
{acceptanceCriteria}

## Implementation Scope
- **Files to Modify**: {affectedFiles}
- **Dependencies**: {dependencies}
- **Integration Points**: {integrationPoints}

{contextSection}
{architectureSection}

## Deliverables
1. Implement the enhancement as specified
2. Maintain backward compatibility
3. Ensure proper integration with existing features
4. Include comprehensive tests
5. Update relevant documentation

Please implement this enhancement following the project's architecture patterns.
            `
        };
    }
    
    /**
     * Generate intelligent prompt for a task
     * @param {Object} task - Task object from database
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated prompt
     */
    async generatePrompt(task, options = {}) {
        try {
            const promptOptions = { ...this.options, ...options };
            
            // Determine prompt type based on task
            const promptType = this.determinePromptType(task);
            const template = this.templates[promptType] || this.templates.taskImplementation;
            
            // Prepare template variables
            const variables = await this.prepareTemplateVariables(task, promptOptions);
            
            // Generate prompt from template
            let prompt = this.fillTemplate(template, variables);
            
            // Ensure prompt doesn't exceed max length
            if (prompt.length > promptOptions.maxPromptLength) {
                prompt = this.truncatePrompt(prompt, promptOptions.maxPromptLength);
            }
            
            // Add metadata
            const metadata = {
                taskId: task.id,
                promptType,
                templateVersion: this.options.templateVersion,
                generatedAt: new Date().toISOString(),
                promptLength: prompt.length
            };
            
            return {
                prompt,
                metadata,
                estimatedTokens: Math.ceil(prompt.length / 4) // Rough token estimation
            };
            
        } catch (error) {
            console.error('Prompt generation failed:', error);
            throw new Error(`Prompt generation failed: ${error.message}`);
        }
    }
    
    /**
     * Determine the appropriate prompt type for a task
     * @param {Object} task - Task object
     * @returns {string} Prompt type
     */
    determinePromptType(task) {
        const title = task.title.toLowerCase();
        const description = task.description.toLowerCase();
        const tags = task.tags || [];
        
        // Check for bug fix indicators
        if (title.includes('fix') || title.includes('bug') || 
            description.includes('error') || description.includes('issue') ||
            tags.includes('bug') || tags.includes('fix')) {
            return 'bugFix';
        }
        
        // Check for enhancement indicators
        if (title.includes('enhance') || title.includes('improve') || 
            title.includes('optimize') || title.includes('upgrade') ||
            tags.includes('enhancement') || tags.includes('feature')) {
            return 'enhancement';
        }
        
        // Default to task implementation
        return 'taskImplementation';
    }
    
    /**
     * Prepare variables for template filling
     * @param {Object} task - Task object
     * @param {Object} options - Options
     * @returns {Promise<Object>} Template variables
     */
    async prepareTemplateVariables(task, options) {
        const variables = {
            title: task.title,
            description: task.description || 'No description provided',
            priority: task.priority || 'medium',
            complexity: task.complexity_score || 5,
            effort: task.estimated_effort || 8,
            requirements: this.formatList(task.requirements || []),
            acceptanceCriteria: this.formatList(task.acceptance_criteria || []),
            affectedFiles: this.formatList(task.implementation_files || []),
            dependencies: this.formatList(task.dependencies || []),
            tags: (task.tags || []).join(', '),
            repositoryUrl: task.repository_url || 'Not specified',
            workflowId: task.metadata?.workflow_id || 'Not specified',
            taskId: task.id,
            contextSection: '',
            validationSection: '',
            errorSection: '',
            previousAttemptsSection: '',
            architectureSection: '',
            integrationPoints: 'To be determined during implementation'
        };
        
        // Add context section if enabled
        if (options.includeContext && task.metadata) {
            variables.contextSection = this.generateContextSection(task.metadata);
        }
        
        // Add validation section if enabled
        if (options.includeValidationCriteria) {
            variables.validationSection = this.generateValidationSection(task);
        }
        
        // Add error context if this is a retry
        if (options.includeErrorContext && options.previousAttempts) {
            variables.errorSection = this.generateErrorSection(options.previousAttempts);
        }
        
        // Add previous attempts section for bug fixes
        if (task.metadata?.previous_attempts) {
            variables.previousAttemptsSection = this.generatePreviousAttemptsSection(task.metadata.previous_attempts);
        }
        
        return variables;
    }
    
    /**
     * Fill template with variables
     * @param {string} template - Template string
     * @param {Object} variables - Variables to fill
     * @returns {string} Filled template
     */
    fillTemplate(template, variables) {
        let filled = template;
        
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            filled = filled.replace(new RegExp(placeholder, 'g'), value || '');
        });
        
        // Clean up empty sections
        filled = filled.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        return filled.trim();
    }
    
    /**
     * Format array as numbered list
     * @param {Array} items - Items to format
     * @returns {string} Formatted list
     */
    formatList(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return 'None specified';
        }
        
        return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    }
    
    /**
     * Generate context section
     * @param {Object} metadata - Task metadata
     * @returns {string} Context section
     */
    generateContextSection(metadata) {
        const contextItems = [];
        
        if (metadata.requirement_text) {
            contextItems.push(`**Original Requirement**: ${metadata.requirement_text}`);
        }
        
        if (metadata.nlp_analysis) {
            contextItems.push(`**NLP Analysis**: Complexity: ${metadata.nlp_analysis.complexity}, Keywords: ${metadata.nlp_analysis.keywords?.slice(0, 5).map(k => k.word).join(', ')}`);
        }
        
        if (metadata.dependency_graph) {
            contextItems.push(`**Dependencies**: This task has ${metadata.dependency_graph.edges?.length || 0} dependencies`);
        }
        
        if (contextItems.length === 0) {
            return '';
        }
        
        return `\n## Context Information\n${contextItems.join('\n')}\n`;
    }
    
    /**
     * Generate validation section
     * @param {Object} task - Task object
     * @returns {string} Validation section
     */
    generateValidationSection(task) {
        return `
## Validation Requirements
- All acceptance criteria must be met
- Code must pass existing tests
- New functionality must include tests
- Code must follow project style guidelines
- Performance impact should be minimal
- Security considerations must be addressed
`;
    }
    
    /**
     * Generate error section for retries
     * @param {Array} previousAttempts - Previous attempts
     * @returns {string} Error section
     */
    generateErrorSection(previousAttempts) {
        if (!previousAttempts || previousAttempts.length === 0) {
            return '';
        }
        
        const lastAttempt = previousAttempts[previousAttempts.length - 1];
        
        return `
## Previous Attempt Analysis
**Attempt**: ${lastAttempt.attempt}
**Issues Found**: ${lastAttempt.validation_result?.errors?.join(', ') || 'Validation failed'}
**Debug Result**: ${lastAttempt.debug_result?.summary || 'Debug information not available'}

Please address these specific issues in your implementation.
`;
    }
    
    /**
     * Generate previous attempts section
     * @param {Array} attempts - Previous attempts
     * @returns {string} Previous attempts section
     */
    generatePreviousAttemptsSection(attempts) {
        if (!attempts || attempts.length === 0) {
            return '';
        }
        
        const attemptSummaries = attempts.map(attempt => 
            `- Attempt ${attempt.attempt}: ${attempt.validation_result?.status || 'Failed'} - ${attempt.validation_result?.summary || 'No summary'}`
        ).join('\n');
        
        return `
## Previous Attempts
${attemptSummaries}

Please learn from these previous attempts and avoid the same issues.
`;
    }
    
    /**
     * Truncate prompt to fit within length limit
     * @param {string} prompt - Original prompt
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated prompt
     */
    truncatePrompt(prompt, maxLength) {
        if (prompt.length <= maxLength) {
            return prompt;
        }
        
        // Try to truncate at a section boundary
        const sections = prompt.split('\n## ');
        let truncated = sections[0];
        
        for (let i = 1; i < sections.length; i++) {
            const nextSection = '\n## ' + sections[i];
            if (truncated.length + nextSection.length <= maxLength - 100) { // Leave some buffer
                truncated += nextSection;
            } else {
                break;
            }
        }
        
        // Add truncation notice
        truncated += '\n\n[Note: Prompt was truncated to fit length limits]';
        
        return truncated;
    }
}

/**
 * Codegen Integration for API communication
 */
export class CodegenIntegration {
    constructor(options = {}) {
        this.options = {
            orgId: options.orgId || process.env.CODEGEN_ORG_ID,
            token: options.token || process.env.CODEGEN_API_TOKEN,
            baseUrl: options.baseUrl || 'https://api.codegen.com',
            timeout: options.timeout || 300000, // 5 minutes
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 5000,
            enableMockMode: options.enableMockMode || false
        };
        
        this.promptGenerator = new PromptGenerator(options.promptGenerator || {});
        this.requestHistory = [];
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalTokensUsed: 0
        };
        
        if (!this.options.orgId || !this.options.token) {
            console.warn('⚠️ Codegen API credentials not provided - running in mock mode');
            this.options.enableMockMode = true;
        }
    }
    
    /**
     * Generate prompt for a task
     * @param {Object} task - Task object
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generated prompt
     */
    async generatePrompt(task, options = {}) {
        try {
            console.log(`📝 Generating prompt for task: ${task.id}`);
            
            const promptResult = await this.promptGenerator.generatePrompt(task, options);
            
            console.log(`✅ Prompt generated: ${promptResult.metadata.promptLength} characters, ~${promptResult.estimatedTokens} tokens`);
            
            return promptResult;
            
        } catch (error) {
            console.error('Prompt generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Send request to Codegen API
     * @param {string|Object} prompt - Prompt string or prompt object
     * @param {string} taskId - Task ID for tracking
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Codegen response
     */
    async sendCodegenRequest(prompt, taskId, options = {}) {
        const startTime = Date.now();
        let attempts = 0;
        const maxAttempts = options.maxRetries || this.options.maxRetries;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                console.log(`🚀 Sending Codegen request (attempt ${attempts}/${maxAttempts}) for task: ${taskId}`);
                
                // Prepare request
                const requestData = this.prepareRequest(prompt, taskId, options);
                
                // Send request (mock or real)
                const response = this.options.enableMockMode 
                    ? await this.sendMockRequest(requestData)
                    : await this.sendRealRequest(requestData);
                
                // Process response
                const result = await this.processResponse(response, taskId, startTime);
                
                // Update metrics
                this.updateMetrics(true, Date.now() - startTime, result.estimatedTokens);
                
                console.log(`✅ Codegen request successful: ${result.pr_info?.pr_url}`);
                return result;
                
            } catch (error) {
                console.error(`❌ Codegen request attempt ${attempts} failed:`, error);
                
                if (attempts >= maxAttempts) {
                    this.updateMetrics(false, Date.now() - startTime, 0);
                    throw new Error(`Codegen request failed after ${maxAttempts} attempts: ${error.message}`);
                }
                
                // Wait before retry
                console.log(`⏳ Waiting ${this.options.retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
            }
        }
    }
    
    /**
     * Prepare request data for Codegen API
     * @param {string|Object} prompt - Prompt
     * @param {string} taskId - Task ID
     * @param {Object} options - Options
     * @returns {Object} Request data
     */
    prepareRequest(prompt, taskId, options) {
        const promptText = typeof prompt === 'string' ? prompt : prompt.prompt;
        const promptMetadata = typeof prompt === 'object' ? prompt.metadata : {};
        
        return {
            message: promptText,
            metadata: {
                taskId,
                requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                promptMetadata,
                ...options.metadata
            },
            options: {
                timeout: options.timeout || this.options.timeout,
                priority: options.priority || 'normal',
                ...options.requestOptions
            }
        };
    }
    
    /**
     * Send real request to Codegen API
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} API response
     */
    async sendRealRequest(requestData) {
        const url = `${this.options.baseUrl}/v1/chat/completions`;
        
        const headers = {
            'Authorization': `Bearer ${this.options.token}`,
            'Content-Type': 'application/json',
            'X-Org-ID': this.options.orgId
        };
        
        const body = {
            model: 'codegen-v2',
            messages: [
                {
                    role: 'user',
                    content: requestData.message
                }
            ],
            metadata: requestData.metadata,
            stream: false
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestData.options.timeout);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Codegen API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    /**
     * Send mock request for testing
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} Mock response
     */
    async sendMockRequest(requestData) {
        console.log('🎭 Sending mock Codegen request...');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        // Generate mock response
        const mockPRNumber = Math.floor(Math.random() * 1000) + 1;
        const mockBranch = `codegen-bot/task-${requestData.metadata.taskId}-${Date.now()}`;
        
        return {
            id: `mock_${Date.now()}`,
            choices: [
                {
                    message: {
                        content: 'Mock implementation completed successfully',
                        metadata: {
                            pr_created: true,
                            pr_url: `https://github.com/mock-org/mock-repo/pull/${mockPRNumber}`,
                            pr_number: mockPRNumber,
                            branch_name: mockBranch,
                            files_modified: ['src/mock.js', 'tests/mock.test.js'],
                            lines_added: 150,
                            lines_removed: 25
                        }
                    }
                }
            ],
            usage: {
                prompt_tokens: Math.floor(requestData.message.length / 4),
                completion_tokens: 500,
                total_tokens: Math.floor(requestData.message.length / 4) + 500
            },
            metadata: requestData.metadata
        };
    }
    
    /**
     * Process Codegen API response
     * @param {Object} response - API response
     * @param {string} taskId - Task ID
     * @param {number} startTime - Request start time
     * @returns {Promise<Object>} Processed result
     */
    async processResponse(response, taskId, startTime) {
        try {
            const choice = response.choices?.[0];
            if (!choice) {
                throw new Error('No response choice available');
            }
            
            const message = choice.message;
            const prMetadata = message.metadata || {};
            
            // Extract PR information
            const prInfo = {
                pr_url: prMetadata.pr_url,
                pr_number: prMetadata.pr_number,
                branch_name: prMetadata.branch_name,
                files_modified: prMetadata.files_modified || [],
                lines_added: prMetadata.lines_added || 0,
                lines_removed: prMetadata.lines_removed || 0
            };
            
            // Store request history
            this.requestHistory.push({
                taskId,
                requestId: response.metadata?.requestId,
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - startTime,
                tokensUsed: response.usage?.total_tokens || 0,
                success: true,
                prInfo
            });
            
            return {
                success: true,
                taskId,
                requestId: response.metadata?.requestId,
                pr_info: prInfo,
                response_content: message.content,
                tokens_used: response.usage?.total_tokens || 0,
                response_time: Date.now() - startTime,
                estimatedTokens: response.usage?.total_tokens || 0
            };
            
        } catch (error) {
            console.error('Response processing failed:', error);
            throw new Error(`Response processing failed: ${error.message}`);
        }
    }
    
    /**
     * Update metrics
     * @param {boolean} success - Whether request was successful
     * @param {number} responseTime - Response time in ms
     * @param {number} tokensUsed - Tokens used
     */
    updateMetrics(success, responseTime, tokensUsed) {
        this.metrics.totalRequests++;
        
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        // Update average response time
        const totalRequests = this.metrics.totalRequests;
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
        
        this.metrics.totalTokensUsed += tokensUsed;
    }
    
    /**
     * Get integration metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalRequests > 0 
                ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
                : 0,
            averageTokensPerRequest: this.metrics.totalRequests > 0
                ? this.metrics.totalTokensUsed / this.metrics.totalRequests
                : 0
        };
    }
    
    /**
     * Get request history
     * @param {Object} options - Query options
     * @returns {Array} Request history
     */
    getRequestHistory(options = {}) {
        const limit = options.limit || 50;
        const taskId = options.taskId;
        
        let history = this.requestHistory;
        
        if (taskId) {
            history = history.filter(req => req.taskId === taskId);
        }
        
        return history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    /**
     * Health check for Codegen integration
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
            
            // Simple ping to check API availability
            const response = await fetch(`${this.options.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.options.token}`
                },
                timeout: 5000
            });
            
            return {
                status: response.ok ? 'healthy' : 'unhealthy',
                mode: 'real',
                statusCode: response.status,
                message: response.ok ? 'API is accessible' : 'API is not accessible'
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                mode: 'real',
                error: error.message
            };
        }
    }
}

export default { PromptGenerator, CodegenIntegration };

