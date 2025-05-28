/**
 * Task Storage Service
 * Handles PostgreSQL integration for task context and codegen request tracking
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class TaskStorage {
    constructor(config = {}) {
        this.config = {
            host: config.host || process.env.DATABASE_HOST || 'localhost',
            port: config.port || process.env.DATABASE_PORT || 5432,
            database: config.database || process.env.DATABASE_NAME || 'codegen_db',
            user: config.user || process.env.DATABASE_USER || 'codegen_user',
            password: config.password || process.env.DATABASE_PASSWORD,
            ssl: config.ssl || process.env.DATABASE_SSL === 'true',
            max: config.maxConnections || 20,
            idleTimeoutMillis: config.idleTimeout || 30000,
            connectionTimeoutMillis: config.connectionTimeout || 2000,
            ...config
        };

        this.pool = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('🗄️  Initializing Task Storage Service...');
            
            this.pool = new Pool(this.config);
            
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            // Initialize database schema
            await this.initializeSchema();
            
            this.initialized = true;
            console.log('✅ Task Storage Service initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Task Storage Service:', error);
            throw error;
        }
    }

    async initializeSchema() {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Enable UUID extension
            await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
            
            // Create tasks table
            await client.query(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    requirements JSONB DEFAULT '[]',
                    acceptance_criteria JSONB DEFAULT '[]',
                    dependencies JSONB DEFAULT '[]',
                    codebase_context JSONB,
                    validation_requirements JSONB,
                    priority VARCHAR(20) DEFAULT 'medium',
                    estimated_complexity VARCHAR(20) DEFAULT 'medium',
                    status VARCHAR(50) DEFAULT 'pending',
                    tags JSONB DEFAULT '[]',
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    created_by VARCHAR(255),
                    assigned_to VARCHAR(255)
                )
            `);

            // Create codegen_requests table
            await client.query(`
                CREATE TABLE IF NOT EXISTS codegen_requests (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
                    request_id VARCHAR(255),
                    prompt_data JSONB NOT NULL,
                    response_data JSONB,
                    pr_url VARCHAR(255),
                    pr_number INTEGER,
                    branch_name VARCHAR(255),
                    commit_sha VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'pending',
                    error_message TEXT,
                    retry_count INTEGER DEFAULT 0,
                    generation_time_ms INTEGER,
                    creation_time_ms INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    completed_at TIMESTAMP WITH TIME ZONE,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);

            // Create workflow_executions table
            await client.query(`
                CREATE TABLE IF NOT EXISTS workflow_executions (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
                    codegen_request_id UUID REFERENCES codegen_requests(id) ON DELETE CASCADE,
                    workflow_type VARCHAR(100) NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    input_data JSONB,
                    output_data JSONB,
                    error_message TEXT,
                    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    completed_at TIMESTAMP WITH TIME ZONE,
                    duration_ms INTEGER
                )
            `);

            // Create indexes for better performance
            await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)');
            
            await client.query('CREATE INDEX IF NOT EXISTS idx_codegen_requests_task_id ON codegen_requests(task_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_codegen_requests_status ON codegen_requests(status)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_codegen_requests_created_at ON codegen_requests(created_at)');
            
            await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_executions_task_id ON workflow_executions(task_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status)');

            // Create updated_at trigger function
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql'
            `);

            // Create triggers for updated_at
            await client.query(`
                DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
                CREATE TRIGGER update_tasks_updated_at 
                    BEFORE UPDATE ON tasks 
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
            `);

            await client.query(`
                DROP TRIGGER IF EXISTS update_codegen_requests_updated_at ON codegen_requests;
                CREATE TRIGGER update_codegen_requests_updated_at 
                    BEFORE UPDATE ON codegen_requests 
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
            `);

            await client.query('COMMIT');
            console.log('✅ Database schema initialized successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Failed to initialize database schema:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Task Management Methods

    async createTask(taskData) {
        const client = await this.pool.connect();
        
        try {
            const {
                title,
                description,
                requirements = [],
                acceptance_criteria = [],
                dependencies = [],
                codebase_context = null,
                validation_requirements = null,
                priority = 'medium',
                estimated_complexity = 'medium',
                tags = [],
                metadata = {},
                created_by = null,
                assigned_to = null
            } = taskData;

            const query = `
                INSERT INTO tasks (
                    title, description, requirements, acceptance_criteria, dependencies,
                    codebase_context, validation_requirements, priority, estimated_complexity,
                    tags, metadata, created_by, assigned_to
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const values = [
                title, description, JSON.stringify(requirements), JSON.stringify(acceptance_criteria),
                JSON.stringify(dependencies), codebase_context ? JSON.stringify(codebase_context) : null,
                validation_requirements ? JSON.stringify(validation_requirements) : null,
                priority, estimated_complexity, JSON.stringify(tags), JSON.stringify(metadata),
                created_by, assigned_to
            ];

            const result = await client.query(query, values);
            const task = this.parseTaskRow(result.rows[0]);
            
            console.log(`✅ Created task: ${task.id} - ${task.title}`);
            return task;
            
        } catch (error) {
            console.error('❌ Error creating task:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getTask(taskId) {
        const client = await this.pool.connect();
        
        try {
            const query = 'SELECT * FROM tasks WHERE id = $1';
            const result = await client.query(query, [taskId]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.parseTaskRow(result.rows[0]);
            
        } catch (error) {
            console.error('❌ Error fetching task:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getTaskContext(taskId) {
        const task = await this.getTask(taskId);
        if (!task) {
            return null;
        }

        // Include additional context like related codegen requests
        const codegenRequests = await this.getCodegenRequestsByTask(taskId);
        
        return {
            ...task,
            codegen_history: codegenRequests
        };
    }

    async updateTask(taskId, updates) {
        const client = await this.pool.connect();
        
        try {
            const setClause = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                if (['requirements', 'acceptance_criteria', 'dependencies', 'tags', 'metadata', 'codebase_context', 'validation_requirements'].includes(key)) {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }

            values.push(taskId);

            const query = `
                UPDATE tasks 
                SET ${setClause.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error(`Task ${taskId} not found`);
            }
            
            return this.parseTaskRow(result.rows[0]);
            
        } catch (error) {
            console.error('❌ Error updating task:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Codegen Request Management Methods

    async storeCodegenRequest(requestData) {
        const client = await this.pool.connect();
        
        try {
            const {
                task_id,
                request_id,
                prompt_data,
                response_data = null,
                pr_url = null,
                pr_number = null,
                branch_name = null,
                commit_sha = null,
                status = 'pending',
                generation_time_ms = null,
                creation_time_ms = null
            } = requestData;

            const query = `
                INSERT INTO codegen_requests (
                    task_id, request_id, prompt_data, response_data, pr_url, pr_number,
                    branch_name, commit_sha, status, generation_time_ms, creation_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;

            const values = [
                task_id, request_id, JSON.stringify(prompt_data),
                response_data ? JSON.stringify(response_data) : null,
                pr_url, pr_number, branch_name, commit_sha, status,
                generation_time_ms, creation_time_ms
            ];

            const result = await client.query(query, values);
            const request = this.parseCodegenRequestRow(result.rows[0]);
            
            console.log(`✅ Stored codegen request: ${request.id} for task ${task_id}`);
            return request;
            
        } catch (error) {
            console.error('❌ Error storing codegen request:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async updateCodegenRequest(taskId, updates) {
        const client = await this.pool.connect();
        
        try {
            const setClause = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                if (['prompt_data', 'response_data'].includes(key)) {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }

            values.push(taskId);

            const query = `
                UPDATE codegen_requests 
                SET ${setClause.join(', ')}
                WHERE task_id = $${paramIndex}
                RETURNING *
            `;

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error(`Codegen request for task ${taskId} not found`);
            }
            
            return this.parseCodegenRequestRow(result.rows[0]);
            
        } catch (error) {
            console.error('❌ Error updating codegen request:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getCodegenRequestStatus(taskId) {
        const client = await this.pool.connect();
        
        try {
            const query = `
                SELECT status, pr_url, pr_number, error_message, retry_count,
                       created_at, completed_at, generation_time_ms, creation_time_ms
                FROM codegen_requests 
                WHERE task_id = $1 
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            
            const result = await client.query(query, [taskId]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return result.rows[0];
            
        } catch (error) {
            console.error('❌ Error fetching codegen request status:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getCodegenRequestsByTask(taskId) {
        const client = await this.pool.connect();
        
        try {
            const query = `
                SELECT * FROM codegen_requests 
                WHERE task_id = $1 
                ORDER BY created_at DESC
            `;
            
            const result = await client.query(query, [taskId]);
            return result.rows.map(row => this.parseCodegenRequestRow(row));
            
        } catch (error) {
            console.error('❌ Error fetching codegen requests:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Workflow Execution Methods

    async createWorkflowExecution(executionData) {
        const client = await this.pool.connect();
        
        try {
            const {
                task_id,
                codegen_request_id,
                workflow_type,
                input_data = null,
                status = 'pending'
            } = executionData;

            const query = `
                INSERT INTO workflow_executions (
                    task_id, codegen_request_id, workflow_type, input_data, status
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;

            const values = [
                task_id, codegen_request_id, workflow_type,
                input_data ? JSON.stringify(input_data) : null, status
            ];

            const result = await client.query(query, values);
            return this.parseWorkflowExecutionRow(result.rows[0]);
            
        } catch (error) {
            console.error('❌ Error creating workflow execution:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async updateWorkflowExecution(executionId, updates) {
        const client = await this.pool.connect();
        
        try {
            const setClause = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                if (['input_data', 'output_data'].includes(key)) {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }

            values.push(executionId);

            const query = `
                UPDATE workflow_executions 
                SET ${setClause.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error(`Workflow execution ${executionId} not found`);
            }
            
            return this.parseWorkflowExecutionRow(result.rows[0]);
            
        } catch (error) {
            console.error('❌ Error updating workflow execution:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Utility Methods

    parseTaskRow(row) {
        return {
            ...row,
            requirements: JSON.parse(row.requirements || '[]'),
            acceptance_criteria: JSON.parse(row.acceptance_criteria || '[]'),
            dependencies: JSON.parse(row.dependencies || '[]'),
            tags: JSON.parse(row.tags || '[]'),
            metadata: JSON.parse(row.metadata || '{}'),
            codebase_context: row.codebase_context ? JSON.parse(row.codebase_context) : null,
            validation_requirements: row.validation_requirements ? JSON.parse(row.validation_requirements) : null
        };
    }

    parseCodegenRequestRow(row) {
        return {
            ...row,
            prompt_data: JSON.parse(row.prompt_data || '{}'),
            response_data: row.response_data ? JSON.parse(row.response_data) : null
        };
    }

    parseWorkflowExecutionRow(row) {
        return {
            ...row,
            input_data: row.input_data ? JSON.parse(row.input_data) : null,
            output_data: row.output_data ? JSON.parse(row.output_data) : null
        };
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🗄️  Task Storage Service connection closed');
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }
}

module.exports = TaskStorage;

