/**
 * @fileoverview NLP Engine - PR #14 Component
 * Core Task Analysis and NLP Requirements Engine
 * 
 * Provides natural language processing capabilities for:
 * - Requirement analysis and understanding
 * - Atomic task decomposition
 * - Dependency analysis
 * - Complexity estimation
 * - Entity and keyword extraction
 */

/**
 * NLP Processor for analyzing natural language requirements
 */
export class NLPProcessor {
    constructor(options = {}) {
        this.options = {
            enableEntityExtraction: options.enableEntityExtraction || true,
            enableKeywordExtraction: options.enableKeywordExtraction || true,
            enableComplexityAnalysis: options.enableComplexityAnalysis || true,
            enableSentimentAnalysis: options.enableSentimentAnalysis || false,
            language: options.language || 'en'
        };
        
        // Initialize NLP models and patterns
        this.initializePatterns();
    }
    
    /**
     * Initialize NLP patterns and models
     */
    initializePatterns() {
        // Task decomposition patterns
        this.taskPatterns = [
            /create\s+(?:a\s+)?(.+)/gi,
            /implement\s+(.+)/gi,
            /add\s+(.+)/gi,
            /build\s+(.+)/gi,
            /develop\s+(.+)/gi,
            /design\s+(.+)/gi,
            /setup\s+(.+)/gi,
            /configure\s+(.+)/gi,
            /integrate\s+(.+)/gi,
            /fix\s+(.+)/gi,
            /update\s+(.+)/gi,
            /modify\s+(.+)/gi
        ];
        
        // Dependency patterns
        this.dependencyPatterns = [
            /(?:after|once|when)\s+(.+?)(?:,|\.|$)/gi,
            /(?:requires?|needs?|depends?\s+on)\s+(.+?)(?:,|\.|$)/gi,
            /(?:before|prior\s+to)\s+(.+?)(?:,|\.|$)/gi
        ];
        
        // Complexity indicators
        this.complexityIndicators = {
            high: ['complex', 'advanced', 'sophisticated', 'comprehensive', 'enterprise', 'scalable', 'distributed'],
            medium: ['moderate', 'standard', 'typical', 'regular', 'normal'],
            low: ['simple', 'basic', 'minimal', 'quick', 'easy', 'straightforward']
        };
        
        // Technical entities
        this.technicalEntities = [
            'database', 'api', 'frontend', 'backend', 'ui', 'ux', 'authentication',
            'authorization', 'validation', 'testing', 'deployment', 'monitoring',
            'logging', 'caching', 'security', 'performance', 'optimization'
        ];
    }
    
    /**
     * Analyze requirement text and extract structured information
     * @param {string} text - Requirement text to analyze
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeRequirement(text, options = {}) {
        try {
            const analysis = {
                originalText: text,
                processedText: this.preprocessText(text),
                entities: [],
                keywords: [],
                tasks: [],
                dependencies: [],
                complexity: 'medium',
                sentiment: 'neutral',
                metadata: {
                    wordCount: text.split(/\s+/).length,
                    sentenceCount: text.split(/[.!?]+/).length,
                    analysisTimestamp: new Date().toISOString()
                }
            };
            
            // Extract entities
            if (this.options.enableEntityExtraction) {
                analysis.entities = this.extractEntities(analysis.processedText);
            }
            
            // Extract keywords
            if (this.options.enableKeywordExtraction) {
                analysis.keywords = this.extractKeywords(analysis.processedText);
            }
            
            // Extract tasks
            analysis.tasks = this.extractTasks(analysis.processedText);
            
            // Extract dependencies
            analysis.dependencies = this.extractDependencies(analysis.processedText);
            
            // Analyze complexity
            if (this.options.enableComplexityAnalysis) {
                analysis.complexity = this.analyzeComplexity(analysis.processedText);
            }
            
            // Analyze sentiment
            if (this.options.enableSentimentAnalysis) {
                analysis.sentiment = this.analyzeSentiment(analysis.processedText);
            }
            
            return analysis;
            
        } catch (error) {
            console.error('NLP analysis failed:', error);
            throw new Error(`NLP analysis failed: ${error.message}`);
        }
    }
    
    /**
     * Preprocess text for analysis
     * @param {string} text - Raw text
     * @returns {string} Processed text
     */
    preprocessText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s.,!?-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Extract technical entities from text
     * @param {string} text - Processed text
     * @returns {Array} Extracted entities
     */
    extractEntities(text) {
        const entities = [];
        
        this.technicalEntities.forEach(entity => {
            const regex = new RegExp(`\\b${entity}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) {
                entities.push({
                    entity,
                    count: matches.length,
                    type: 'technical'
                });
            }
        });
        
        return entities;
    }
    
    /**
     * Extract keywords from text
     * @param {string} text - Processed text
     * @returns {Array} Extracted keywords
     */
    extractKeywords(text) {
        const words = text.split(/\s+/);
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        
        const wordFreq = {};
        words.forEach(word => {
            if (word.length > 3 && !stopWords.has(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });
        
        return Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, frequency]) => ({ word, frequency }));
    }
    
    /**
     * Extract tasks from text
     * @param {string} text - Processed text
     * @returns {Array} Extracted tasks
     */
    extractTasks(text) {
        const tasks = [];
        
        this.taskPatterns.forEach(pattern => {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                if (match[1] && match[1].trim().length > 3) {
                    tasks.push({
                        action: match[0].split(/\s+/)[0],
                        target: match[1].trim(),
                        confidence: 0.8
                    });
                }
            });
        });
        
        return tasks;
    }
    
    /**
     * Extract dependencies from text
     * @param {string} text - Processed text
     * @returns {Array} Extracted dependencies
     */
    extractDependencies(text) {
        const dependencies = [];
        
        this.dependencyPatterns.forEach(pattern => {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                if (match[1] && match[1].trim().length > 3) {
                    dependencies.push({
                        type: 'sequential',
                        description: match[1].trim(),
                        confidence: 0.7
                    });
                }
            });
        });
        
        return dependencies;
    }
    
    /**
     * Analyze complexity of requirement
     * @param {string} text - Processed text
     * @returns {string} Complexity level
     */
    analyzeComplexity(text) {
        let score = 0;
        
        // Check for complexity indicators
        Object.entries(this.complexityIndicators).forEach(([level, indicators]) => {
            indicators.forEach(indicator => {
                if (text.includes(indicator)) {
                    switch (level) {
                        case 'high': score += 3; break;
                        case 'medium': score += 2; break;
                        case 'low': score += 1; break;
                    }
                }
            });
        });
        
        // Factor in text length and technical entities
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 100) score += 2;
        else if (wordCount > 50) score += 1;
        
        // Determine final complexity
        if (score >= 6) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }
    
    /**
     * Analyze sentiment of requirement
     * @param {string} text - Processed text
     * @returns {string} Sentiment
     */
    analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'excellent', 'improve', 'enhance', 'optimize'];
        const negativeWords = ['bad', 'poor', 'broken', 'fix', 'problem', 'issue', 'bug'];
        
        let score = 0;
        positiveWords.forEach(word => {
            if (text.includes(word)) score += 1;
        });
        negativeWords.forEach(word => {
            if (text.includes(word)) score -= 1;
        });
        
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }
}

/**
 * Requirement Analyzer for decomposing requirements into atomic tasks
 */
export class RequirementAnalyzer {
    constructor(options = {}) {
        this.nlpProcessor = options.nlpProcessor || new NLPProcessor();
        this.taskStorage = options.taskStorage;
        this.options = {
            enableDependencyAnalysis: options.enableDependencyAnalysis || true,
            enableAtomicDecomposition: options.enableAtomicDecomposition || true,
            maxTasksPerRequirement: options.maxTasksPerRequirement || 15,
            minTaskComplexity: options.minTaskComplexity || 'low'
        };
    }
    
    /**
     * Analyze requirement and decompose into atomic tasks
     * @param {string} requirementText - Natural language requirement
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis result with atomic tasks
     */
    async analyzeRequirement(requirementText, options = {}) {
        try {
            console.log('🔍 Analyzing requirement with NLP...');
            
            // Step 1: NLP Analysis
            const nlpAnalysis = await this.nlpProcessor.analyzeRequirement(requirementText, options);
            
            // Step 2: Decompose into atomic tasks
            console.log('⚛️ Decomposing into atomic tasks...');
            const atomicTasks = await this.decomposeIntoAtomicTasks(nlpAnalysis, options);
            
            // Step 3: Analyze dependencies
            console.log('🔗 Analyzing task dependencies...');
            const dependencyGraph = this.options.enableDependencyAnalysis 
                ? await this.analyzeDependencies(atomicTasks)
                : null;
            
            // Step 4: Estimate complexity and effort
            console.log('📊 Estimating complexity and effort...');
            const enrichedTasks = await this.enrichTasksWithMetadata(atomicTasks, nlpAnalysis);
            
            return {
                requirement: {
                    originalText: requirementText,
                    nlpAnalysis,
                    estimatedComplexity: nlpAnalysis.complexity,
                    extractedEntities: nlpAnalysis.entities,
                    keywords: nlpAnalysis.keywords
                },
                tasks: enrichedTasks,
                dependencyGraph,
                summary: {
                    totalTasks: enrichedTasks.length,
                    averageComplexity: this.calculateAverageComplexity(enrichedTasks),
                    estimatedTotalEffort: this.calculateTotalEffort(enrichedTasks),
                    dependencyCount: dependencyGraph ? dependencyGraph.edges.length : 0
                }
            };
            
        } catch (error) {
            console.error('Requirement analysis failed:', error);
            throw new Error(`Requirement analysis failed: ${error.message}`);
        }
    }
    
    /**
     * Decompose requirement into atomic tasks
     * @param {Object} nlpAnalysis - NLP analysis result
     * @param {Object} options - Decomposition options
     * @returns {Promise<Array>} Atomic tasks
     */
    async decomposeIntoAtomicTasks(nlpAnalysis, options = {}) {
        const tasks = [];
        const maxTasks = options.maxTasksPerRequirement || this.options.maxTasksPerRequirement;
        
        // Extract tasks from NLP analysis
        const extractedTasks = nlpAnalysis.tasks || [];
        
        // If no tasks extracted, create default decomposition
        if (extractedTasks.length === 0) {
            tasks.push(...this.createDefaultDecomposition(nlpAnalysis));
        } else {
            // Process extracted tasks
            for (const extractedTask of extractedTasks) {
                const atomicTask = await this.createAtomicTask(extractedTask, nlpAnalysis);
                tasks.push(atomicTask);
                
                if (tasks.length >= maxTasks) break;
            }
        }
        
        // Ensure we have at least one task
        if (tasks.length === 0) {
            tasks.push(this.createFallbackTask(nlpAnalysis));
        }
        
        return tasks.slice(0, maxTasks);
    }
    
    /**
     * Create atomic task from extracted task
     * @param {Object} extractedTask - Task extracted from NLP
     * @param {Object} nlpAnalysis - Full NLP analysis
     * @returns {Promise<Object>} Atomic task
     */
    async createAtomicTask(extractedTask, nlpAnalysis) {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id: taskId,
            title: this.generateTaskTitle(extractedTask),
            description: this.generateTaskDescription(extractedTask, nlpAnalysis),
            requirements: this.extractTaskRequirements(extractedTask, nlpAnalysis),
            acceptanceCriteria: this.generateAcceptanceCriteria(extractedTask),
            affectedFiles: this.estimateAffectedFiles(extractedTask),
            dependencies: [],
            priority: this.estimatePriority(extractedTask, nlpAnalysis),
            complexityScore: this.estimateComplexityScore(extractedTask),
            estimatedEffort: this.estimateEffort(extractedTask),
            tags: this.generateTags(extractedTask, nlpAnalysis),
            metadata: {
                extractedFrom: extractedTask,
                nlpConfidence: extractedTask.confidence || 0.8,
                createdAt: new Date().toISOString()
            }
        };
    }
    
    /**
     * Generate task title
     * @param {Object} extractedTask - Extracted task
     * @returns {string} Task title
     */
    generateTaskTitle(extractedTask) {
        const action = extractedTask.action || 'Implement';
        const target = extractedTask.target || 'feature';
        return `${action.charAt(0).toUpperCase() + action.slice(1)} ${target}`;
    }
    
    /**
     * Generate task description
     * @param {Object} extractedTask - Extracted task
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {string} Task description
     */
    generateTaskDescription(extractedTask, nlpAnalysis) {
        const baseDescription = `${extractedTask.action} ${extractedTask.target}`;
        const context = nlpAnalysis.keywords.slice(0, 3).map(k => k.word).join(', ');
        
        return `${baseDescription}\n\nContext: ${context}\n\nThis task is part of: ${nlpAnalysis.originalText.substring(0, 100)}...`;
    }
    
    /**
     * Extract task requirements
     * @param {Object} extractedTask - Extracted task
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Array} Requirements
     */
    extractTaskRequirements(extractedTask, nlpAnalysis) {
        const requirements = [
            `Must ${extractedTask.action} ${extractedTask.target}`,
            'Code must be well-documented',
            'Must include appropriate error handling',
            'Must follow project coding standards'
        ];
        
        // Add entity-specific requirements
        nlpAnalysis.entities.forEach(entity => {
            if (entity.type === 'technical') {
                requirements.push(`Must properly integrate with ${entity.entity}`);
            }
        });
        
        return requirements;
    }
    
    /**
     * Generate acceptance criteria
     * @param {Object} extractedTask - Extracted task
     * @returns {Array} Acceptance criteria
     */
    generateAcceptanceCriteria(extractedTask) {
        return [
            `${extractedTask.target} is successfully ${extractedTask.action}ed`,
            'All tests pass',
            'Code review is completed',
            'Documentation is updated',
            'No breaking changes introduced'
        ];
    }
    
    /**
     * Estimate affected files
     * @param {Object} extractedTask - Extracted task
     * @returns {Array} Estimated affected files
     */
    estimateAffectedFiles(extractedTask) {
        const files = [];
        const target = extractedTask.target.toLowerCase();
        
        if (target.includes('api')) {
            files.push('src/api/', 'src/routes/', 'src/controllers/');
        }
        if (target.includes('database') || target.includes('db')) {
            files.push('src/models/', 'migrations/', 'src/database/');
        }
        if (target.includes('frontend') || target.includes('ui')) {
            files.push('src/components/', 'src/pages/', 'src/styles/');
        }
        if (target.includes('test')) {
            files.push('tests/', 'src/__tests__/');
        }
        
        return files.length > 0 ? files : ['src/'];
    }
    
    /**
     * Estimate task priority
     * @param {Object} extractedTask - Extracted task
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {string} Priority level
     */
    estimatePriority(extractedTask, nlpAnalysis) {
        const urgentKeywords = ['urgent', 'critical', 'asap', 'immediately', 'fix', 'bug'];
        const highKeywords = ['important', 'priority', 'required', 'must'];
        
        const text = `${extractedTask.action} ${extractedTask.target}`.toLowerCase();
        
        if (urgentKeywords.some(keyword => text.includes(keyword))) {
            return 'urgent';
        }
        if (highKeywords.some(keyword => text.includes(keyword))) {
            return 'high';
        }
        if (nlpAnalysis.complexity === 'high') {
            return 'high';
        }
        
        return 'medium';
    }
    
    /**
     * Estimate complexity score
     * @param {Object} extractedTask - Extracted task
     * @returns {number} Complexity score (1-10)
     */
    estimateComplexityScore(extractedTask) {
        const complexActions = ['integrate', 'implement', 'develop', 'design'];
        const simpleActions = ['add', 'update', 'fix', 'modify'];
        
        const action = extractedTask.action.toLowerCase();
        
        if (complexActions.includes(action)) {
            return Math.floor(Math.random() * 3) + 7; // 7-9
        }
        if (simpleActions.includes(action)) {
            return Math.floor(Math.random() * 3) + 3; // 3-5
        }
        
        return Math.floor(Math.random() * 3) + 5; // 5-7
    }
    
    /**
     * Estimate effort in hours
     * @param {Object} extractedTask - Extracted task
     * @returns {number} Estimated effort in hours
     */
    estimateEffort(extractedTask) {
        const complexityScore = this.estimateComplexityScore(extractedTask);
        return Math.ceil(complexityScore * 1.5); // 1.5 hours per complexity point
    }
    
    /**
     * Generate tags for task
     * @param {Object} extractedTask - Extracted task
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Array} Tags
     */
    generateTags(extractedTask, nlpAnalysis) {
        const tags = [extractedTask.action];
        
        // Add entity-based tags
        nlpAnalysis.entities.forEach(entity => {
            tags.push(entity.entity);
        });
        
        // Add complexity tag
        tags.push(nlpAnalysis.complexity);
        
        return [...new Set(tags)]; // Remove duplicates
    }
    
    /**
     * Create default decomposition when no tasks extracted
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Array} Default tasks
     */
    createDefaultDecomposition(nlpAnalysis) {
        return [
            {
                action: 'analyze',
                target: 'requirements',
                confidence: 0.9
            },
            {
                action: 'implement',
                target: 'solution',
                confidence: 0.8
            },
            {
                action: 'test',
                target: 'implementation',
                confidence: 0.9
            }
        ];
    }
    
    /**
     * Create fallback task
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Object} Fallback task
     */
    createFallbackTask(nlpAnalysis) {
        return {
            id: `fallback_${Date.now()}`,
            title: 'Implement requirement',
            description: nlpAnalysis.originalText,
            requirements: ['Implement the specified requirement'],
            acceptanceCriteria: ['Requirement is successfully implemented'],
            affectedFiles: ['src/'],
            dependencies: [],
            priority: 'medium',
            complexityScore: 5,
            estimatedEffort: 8,
            tags: ['implementation', nlpAnalysis.complexity],
            metadata: {
                isFallback: true,
                createdAt: new Date().toISOString()
            }
        };
    }
    
    /**
     * Analyze dependencies between tasks
     * @param {Array} tasks - Atomic tasks
     * @returns {Promise<Object>} Dependency graph
     */
    async analyzeDependencies(tasks) {
        const graph = {
            nodes: tasks.map(task => ({ id: task.id, title: task.title })),
            edges: []
        };
        
        // Simple dependency analysis based on task types
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
            'analyze': ['implement', 'test', 'deploy'],
            'design': ['implement', 'test'],
            'setup': ['configure', 'implement'],
            'implement': ['test', 'deploy'],
            'test': ['deploy']
        };
        
        const actionA = taskA.title.toLowerCase().split(' ')[0];
        const actionB = taskB.title.toLowerCase().split(' ')[0];
        
        return precedenceRules[actionA]?.includes(actionB) || false;
    }
    
    /**
     * Enrich tasks with additional metadata
     * @param {Array} tasks - Atomic tasks
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Promise<Array>} Enriched tasks
     */
    async enrichTasksWithMetadata(tasks, nlpAnalysis) {
        return tasks.map(task => ({
            ...task,
            dependencyInfo: {
                canRunInParallel: this.canRunInParallel(task, tasks),
                blockedBy: [],
                blocks: []
            },
            estimatedStartTime: null,
            estimatedEndTime: null,
            resourceRequirements: this.estimateResourceRequirements(task)
        }));
    }
    
    /**
     * Check if task can run in parallel with others
     * @param {Object} task - Task to check
     * @param {Array} allTasks - All tasks
     * @returns {boolean} True if can run in parallel
     */
    canRunInParallel(task, allTasks) {
        // Simple heuristic: tasks with different affected files can run in parallel
        return !task.affectedFiles.some(file => 
            allTasks.some(otherTask => 
                otherTask.id !== task.id && 
                otherTask.affectedFiles.some(otherFile => 
                    file === otherFile
                )
            )
        );
    }
    
    /**
     * Estimate resource requirements for task
     * @param {Object} task - Task
     * @returns {Object} Resource requirements
     */
    estimateResourceRequirements(task) {
        return {
            cpu: task.complexityScore > 7 ? 'high' : 'medium',
            memory: task.affectedFiles.length > 3 ? 'high' : 'medium',
            storage: 'low',
            network: task.tags.includes('api') ? 'high' : 'low'
        };
    }
    
    /**
     * Calculate average complexity of tasks
     * @param {Array} tasks - Tasks
     * @returns {number} Average complexity
     */
    calculateAverageComplexity(tasks) {
        if (tasks.length === 0) return 0;
        const total = tasks.reduce((sum, task) => sum + task.complexityScore, 0);
        return Math.round((total / tasks.length) * 10) / 10;
    }
    
    /**
     * Calculate total estimated effort
     * @param {Array} tasks - Tasks
     * @returns {number} Total effort in hours
     */
    calculateTotalEffort(tasks) {
        return tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
    }
}

export default { NLPProcessor, RequirementAnalyzer };

