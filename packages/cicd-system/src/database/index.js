/**
 * @fileoverview Database Layer - PR #15 Component
 * PostgreSQL Task Storage and Context Engine
 * 
 * Provides comprehensive database functionality for:
 * - Task storage and retrieval
 * - Workflow state management
 * - PR metadata tracking
 * - Error logging and analytics
 * - Context preservation across pipeline stages
 */

import pkg from 'pg';
const { Pool } = pkg;

/**
 * Database Manager for PostgreSQL connections and operations
 */
export class DatabaseManager {
    constructor(config = {}) {
        this.config = {
            host: config.host || process.env.DB_HOST || 'localhost',
            port: config.port || process.env.DB_PORT || 5432,
            database: config.database || process.env.DB_NAME || 'codegen-taskmaster-db',
            user: config.username || process.env.DB_USER || 'software_developer',
            password: config.password || process.env.DB_PASSWORD || 'password',
            ssl: config.ssl || process.env.DB_SSL || 'require',
            max: config.maxConnections || 20,
            idleTimeoutMillis: config.idleTimeout || 30000,
            connectionTimeoutMillis: config.connectionTimeout || 10000
        };
        
        this.pool = null;
        this.initialized = false;
    }
    
    /**
     * Initialize database connection and create tables
     */
    async initialize() {
        try {
            console.log('🔌 Connecting to PostgreSQL database...');
            
            // Create connection pool
            this.pool = new Pool(this.config);
            
            // Test connection
            const client = await this.pool.connect();
            console.log('✅ Database connection established');
            client.release();
            
            // Create tables if they don't exist
            await this.createTables();
            console.log('✅ Database tables verified/created');
            
            this.initialized = true;
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Create all required database tables
     */
    async createTables() {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Tasks table
            await client.query(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    requirements JSONB,
                    acceptance_criteria JSONB,
                    implementation_files JSONB,
                    dependencies JSONB,
                    priority VARCHAR(20) DEFAULT 'medium',
                    complexity_score INTEGER DEFAULT 5,
                    estimated_effort INTEGER DEFAULT 8,
                    tags JSONB,
                    status VARCHAR(50) DEFAULT 'pending',
                    repository_url VARCHAR(500),
                    pr_url VARCHAR(500),
                    pr_number INTEGER,
                    validation_result JSONB,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    failed_at TIMESTAMP,
                    attempts INTEGER DEFAULT 0,
                    failure_reason VARCHAR(255)
                )
            `);
            
            // Workflow states table
            await client.query(`
                CREATE TABLE IF NOT EXISTS workflow_states (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
                    workflow_id VARCHAR(100),
                    state VARCHAR(50) NOT NULL,
                    previous_state VARCHAR(50),
                    triggered_by VARCHAR(100),
                    trigger_reason VARCHAR(255),
                    state_data JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Error logs table
            await client.query(`
                CREATE TABLE IF NOT EXISTS error_logs (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
                    workflow_id VARCHAR(100),
                    workflow_attempt INTEGER,
                    error_message TEXT NOT NULL,
                    error_details JSONB,
                    severity VARCHAR(20) DEFAULT 'medium',
                    resolved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            `);
            
            // PR metadata table
            await client.query(`
                CREATE TABLE IF NOT EXISTS pr_metadata (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
                    pr_url VARCHAR(500) NOT NULL,
                    pr_number INTEGER,
                    branch_name VARCHAR(255),
                    repository_url VARCHAR(500),
                    codegen_request_id VARCHAR(100),
                    validation_attempts INTEGER DEFAULT 0,
                    validation_status VARCHAR(50) DEFAULT 'pending',
                    claude_code_results JSONB,
                    wsl2_instance_id VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // System metrics table
            await client.query(`
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id SERIAL PRIMARY KEY,
                    metric_name VARCHAR(100) NOT NULL,
                    metric_value NUMERIC,
                    metric_data JSONB,
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Requirements analysis table
            await client.query(`
                CREATE TABLE IF NOT EXISTS requirements_analysis (
                    id SERIAL PRIMARY KEY,
                    original_text TEXT NOT NULL,
                    nlp_analysis JSONB,
                    extracted_tasks JSONB,
                    dependency_graph JSONB,
                    complexity_analysis JSONB,
                    workflow_id VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create indexes for better performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
                CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks((metadata->>'workflow_id'));
                CREATE INDEX IF NOT EXISTS idx_workflow_states_task_id ON workflow_states(task_id);
                CREATE INDEX IF NOT EXISTS idx_workflow_states_workflow_id ON workflow_states(workflow_id);
                CREATE INDEX IF NOT EXISTS idx_error_logs_task_id ON error_logs(task_id);
                CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
                CREATE INDEX IF NOT EXISTS idx_pr_metadata_task_id ON pr_metadata(task_id);
                CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at);
            `);
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * Execute a query with parameters
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async query(query, params = []) {
        if (!this.initialized) {
            throw new Error('Database not initialized');
        }
        
        try {
            const result = await this.pool.query(query, params);
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    
    /**
     * Get a client from the pool for transactions
     * @returns {Promise<Object>} Database client
     */
    async getClient() {
        if (!this.initialized) {
            throw new Error('Database not initialized');
        }
        
        return await this.pool.connect();
    }
    
    /**
     * Close database connections
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('✅ Database connections closed');
        }
    }
    
    /**
     * Check database health
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW() as current_time, version() as version');
            return {
                status: 'healthy',
                timestamp: result.rows[0].current_time,
                version: result.rows[0].version,
                connections: {
                    total: this.pool.totalCount,
                    idle: this.pool.idleCount,
                    waiting: this.pool.waitingCount
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

/**
 * Task Data Access Layer for CRUD operations
 */
export class TaskDataAccess {
    constructor(databaseManager) {
        this.db = databaseManager;
    }
    
    /**
     * Initialize the data access layer
     */
    async initialize() {
        if (!this.db.initialized) {
            throw new Error('Database manager must be initialized first');
        }
        console.log('✅ Task data access layer initialized');
    }
    
    /**
     * Create a new task
     * @param {Object} taskData - Task data
     * @returns {Promise<Object>} Created task
     */
    async createTask(taskData) {
        try {
            const query = `
                INSERT INTO tasks (
                    title, description, requirements, acceptance_criteria,
                    implementation_files, dependencies, priority, complexity_score,
                    estimated_effort, tags, repository_url, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;
            
            const values = [
                taskData.title,
                taskData.description,
                JSON.stringify(taskData.requirements || []),
                JSON.stringify(taskData.acceptance_criteria || []),
                JSON.stringify(taskData.implementation_files || []),
                JSON.stringify(taskData.dependencies || []),
                taskData.priority || 'medium',
                taskData.complexity_score || 5,
                taskData.estimated_effort || 8,
                JSON.stringify(taskData.tags || []),
                taskData.repository_url,
                JSON.stringify(taskData.metadata || {})
            ];
            
            const result = await this.db.query(query, values);
            const task = this.parseTask(result.rows[0]);
            
            console.log(`✅ Task created: ${task.id} - ${task.title}`);
            return task;
            
        } catch (error) {
            console.error('Failed to create task:', error);
            throw new Error(`Failed to create task: ${error.message}`);
        }
    }
    
    /**
     * Get task by ID
     * @param {number} taskId - Task ID
     * @returns {Promise<Object|null>} Task or null if not found
     */
    async getTaskById(taskId) {
        try {
            const query = 'SELECT * FROM tasks WHERE id = $1';
            const result = await this.db.query(query, [taskId]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.parseTask(result.rows[0]);
            
        } catch (error) {
            console.error('Failed to get task:', error);
            throw new Error(`Failed to get task: ${error.message}`);
        }
    }
    
    /**
     * Update task
     * @param {number} taskId - Task ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated task
     */
    async updateTask(taskId, updates) {
        try {
            const setClause = [];
            const values = [];
            let paramIndex = 1;
            
            // Build dynamic update query
            Object.entries(updates).forEach(([key, value]) => {
                if (key === 'metadata' && typeof value === 'object') {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else if (['requirements', 'acceptance_criteria', 'implementation_files', 'dependencies', 'tags'].includes(key)) {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            });
            
            setClause.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(taskId);
            
            const query = `
                UPDATE tasks 
                SET ${setClause.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;
            
            const result = await this.db.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error(`Task ${taskId} not found`);
            }
            
            const task = this.parseTask(result.rows[0]);
            console.log(`✅ Task updated: ${task.id} - ${task.title}`);
            return task;
            
        } catch (error) {
            console.error('Failed to update task:', error);
            throw new Error(`Failed to update task: ${error.message}`);
        }
    }
    
    /**
     * Get tasks by status
     * @param {string} status - Task status
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Tasks
     */
    async getTasksByStatus(status, options = {}) {
        try {
            const limit = options.limit || 50;
            const offset = options.offset || 0;
            
            const query = `
                SELECT * FROM tasks 
                WHERE status = $1 
                ORDER BY created_at DESC 
                LIMIT $2 OFFSET $3
            `;
            
            const result = await this.db.query(query, [status, limit, offset]);
            return result.rows.map(row => this.parseTask(row));
            
        } catch (error) {
            console.error('Failed to get tasks by status:', error);
            throw new Error(`Failed to get tasks by status: ${error.message}`);
        }
    }
    
    /**
     * Get tasks by workflow ID
     * @param {string} workflowId - Workflow ID
     * @returns {Promise<Array>} Tasks
     */
    async getTasksByWorkflowId(workflowId) {
        try {
            const query = `
                SELECT * FROM tasks 
                WHERE metadata->>'workflow_id' = $1 
                ORDER BY created_at ASC
            `;
            
            const result = await this.db.query(query, [workflowId]);
            return result.rows.map(row => this.parseTask(row));
            
        } catch (error) {
            console.error('Failed to get tasks by workflow ID:', error);
            throw new Error(`Failed to get tasks by workflow ID: ${error.message}`);
        }
    }
    
    /**
     * Create workflow state entry
     * @param {Object} stateData - State data
     * @returns {Promise<Object>} Created state
     */
    async createWorkflowState(stateData) {
        try {
            const query = `
                INSERT INTO workflow_states (
                    task_id, workflow_id, state, previous_state,
                    triggered_by, trigger_reason, state_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            
            const values = [
                stateData.task_id,
                stateData.workflow_id,
                stateData.state,
                stateData.previous_state,
                stateData.triggered_by,
                stateData.trigger_reason,
                JSON.stringify(stateData.state_data || {})
            ];
            
            const result = await this.db.query(query, values);
            return result.rows[0];
            
        } catch (error) {
            console.error('Failed to create workflow state:', error);
            throw new Error(`Failed to create workflow state: ${error.message}`);
        }
    }
    
    /**
     * Get workflow states for task
     * @param {number} taskId - Task ID
     * @returns {Promise<Array>} Workflow states
     */
    async getWorkflowStates(taskId) {
        try {
            const query = `
                SELECT * FROM workflow_states 
                WHERE task_id = $1 
                ORDER BY created_at ASC
            `;
            
            const result = await this.db.query(query, [taskId]);
            return result.rows.map(row => ({
                ...row,
                state_data: typeof row.state_data === 'string' ? JSON.parse(row.state_data) : row.state_data
            }));
            
        } catch (error) {
            console.error('Failed to get workflow states:', error);
            throw new Error(`Failed to get workflow states: ${error.message}`);
        }
    }
    
    /**
     * Log error
     * @param {Object} errorData - Error data
     * @returns {Promise<Object>} Created error log
     */
    async logError(errorData) {
        try {
            const query = `
                INSERT INTO error_logs (
                    task_id, workflow_id, workflow_attempt, error_message,
                    error_details, severity
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            
            const values = [
                errorData.task_id,
                errorData.workflow_id,
                errorData.workflow_attempt,
                errorData.error_message,
                JSON.stringify(errorData.error_details || {}),
                errorData.severity || 'medium'
            ];
            
            const result = await this.db.query(query, values);
            console.log(`⚠️ Error logged: ${errorData.error_message}`);
            return result.rows[0];
            
        } catch (error) {
            console.error('Failed to log error:', error);
            throw new Error(`Failed to log error: ${error.message}`);
        }
    }
    
    /**
     * Create PR metadata entry
     * @param {Object} prData - PR metadata
     * @returns {Promise<Object>} Created PR metadata
     */
    async createPRMetadata(prData) {
        try {
            const query = `
                INSERT INTO pr_metadata (
                    task_id, pr_url, pr_number, branch_name, repository_url,
                    codegen_request_id, wsl2_instance_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            
            const values = [
                prData.task_id,
                prData.pr_url,
                prData.pr_number,
                prData.branch_name,
                prData.repository_url,
                prData.codegen_request_id,
                prData.wsl2_instance_id
            ];
            
            const result = await this.db.query(query, values);
            return result.rows[0];
            
        } catch (error) {
            console.error('Failed to create PR metadata:', error);
            throw new Error(`Failed to create PR metadata: ${error.message}`);
        }
    }
    
    /**
     * Update PR metadata
     * @param {number} taskId - Task ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated PR metadata
     */
    async updatePRMetadata(taskId, updates) {
        try {
            const setClause = [];
            const values = [];
            let paramIndex = 1;
            
            Object.entries(updates).forEach(([key, value]) => {
                if (key === 'claude_code_results' && typeof value === 'object') {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            });
            
            setClause.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(taskId);
            
            const query = `
                UPDATE pr_metadata 
                SET ${setClause.join(', ')}
                WHERE task_id = $${paramIndex}
                RETURNING *
            `;
            
            const result = await this.db.query(query, values);
            return result.rows[0];
            
        } catch (error) {
            console.error('Failed to update PR metadata:', error);
            throw new Error(`Failed to update PR metadata: ${error.message}`);
        }
    }
    
    /**
     * Record system metric
     * @param {string} metricName - Metric name
     * @param {number} metricValue - Metric value
     * @param {Object} metricData - Additional metric data
     * @returns {Promise<Object>} Created metric
     */
    async recordMetric(metricName, metricValue, metricData = {}) {
        try {
            const query = `
                INSERT INTO system_metrics (metric_name, metric_value, metric_data)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            
            const values = [metricName, metricValue, JSON.stringify(metricData)];
            const result = await this.db.query(query, values);
            return result.rows[0];
            
        } catch (error) {
            console.error('Failed to record metric:', error);
            throw new Error(`Failed to record metric: ${error.message}`);
        }
    }
    
    /**
     * Get system metrics
     * @param {string} metricName - Metric name
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Metrics
     */
    async getMetrics(metricName, options = {}) {
        try {
            const limit = options.limit || 100;
            const since = options.since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
            
            const query = `
                SELECT * FROM system_metrics 
                WHERE metric_name = $1 AND recorded_at >= $2
                ORDER BY recorded_at DESC 
                LIMIT $3
            `;
            
            const result = await this.db.query(query, [metricName, since, limit]);
            return result.rows.map(row => ({
                ...row,
                metric_data: typeof row.metric_data === 'string' ? JSON.parse(row.metric_data) : row.metric_data
            }));
            
        } catch (error) {
            console.error('Failed to get metrics:', error);
            throw new Error(`Failed to get metrics: ${error.message}`);
        }
    }
    
    /**
     * Store requirements analysis
     * @param {Object} analysisData - Analysis data
     * @returns {Promise<Object>} Created analysis
     */
    async storeRequirementsAnalysis(analysisData) {
        try {
            const query = `
                INSERT INTO requirements_analysis (
                    original_text, nlp_analysis, extracted_tasks,
                    dependency_graph, complexity_analysis, workflow_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            
            const values = [
                analysisData.original_text,
                JSON.stringify(analysisData.nlp_analysis || {}),
                JSON.stringify(analysisData.extracted_tasks || []),
                JSON.stringify(analysisData.dependency_graph || {}),
                JSON.stringify(analysisData.complexity_analysis || {}),
                analysisData.workflow_id
            ];
            
            const result = await this.db.query(query, values);
            return result.rows[0];
            
        } catch (error) {
            console.error('Failed to store requirements analysis:', error);
            throw new Error(`Failed to store requirements analysis: ${error.message}`);
        }
    }
    
    /**
     * Parse task row from database
     * @param {Object} row - Database row
     * @returns {Object} Parsed task
     */
    parseTask(row) {
        return {
            ...row,
            requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements) : row.requirements,
            acceptance_criteria: typeof row.acceptance_criteria === 'string' ? JSON.parse(row.acceptance_criteria) : row.acceptance_criteria,
            implementation_files: typeof row.implementation_files === 'string' ? JSON.parse(row.implementation_files) : row.implementation_files,
            dependencies: typeof row.dependencies === 'string' ? JSON.parse(row.dependencies) : row.dependencies,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
            validation_result: typeof row.validation_result === 'string' ? JSON.parse(row.validation_result) : row.validation_result
        };
    }
    
    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    async getStatistics() {
        try {
            const queries = [
                'SELECT COUNT(*) as total_tasks FROM tasks',
                'SELECT status, COUNT(*) as count FROM tasks GROUP BY status',
                'SELECT COUNT(*) as total_workflows FROM workflow_states',
                'SELECT COUNT(*) as total_errors FROM error_logs WHERE resolved = false',
                'SELECT COUNT(*) as total_prs FROM pr_metadata'
            ];
            
            const results = await Promise.all(queries.map(query => this.db.query(query)));
            
            return {
                totalTasks: parseInt(results[0].rows[0].total_tasks),
                tasksByStatus: results[1].rows.reduce((acc, row) => {
                    acc[row.status] = parseInt(row.count);
                    return acc;
                }, {}),
                totalWorkflows: parseInt(results[2].rows[0].total_workflows),
                unresolvedErrors: parseInt(results[3].rows[0].total_errors),
                totalPRs: parseInt(results[4].rows[0].total_prs)
            };
            
        } catch (error) {
            console.error('Failed to get statistics:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }
}

export default { DatabaseManager, TaskDataAccess };

