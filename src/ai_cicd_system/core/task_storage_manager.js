/**
 * TaskStorageManager - Consolidated class for managing task storage operations
 * 
 * This class provides a unified interface for storing, retrieving, and managing
 * tasks within the AI CI/CD system. It supports both database and mock storage
 * modes for testing and development.
 */
export class TaskStorageManager {
    constructor(config = {}) {
        this.config = this._validateAndMergeConfig(config);
        this.isInitialized = false;
        this.connection = null;
        this.mockStorage = new Map();
        this.performanceMetrics = new Map();
    }

    /**
     * Validates and merges the provided configuration with defaults
     * @param {Object} config - Configuration object
     * @returns {Object} Validated and merged configuration
     */
    _validateAndMergeConfig(config) {
        const defaultConfig = {
            storageType: 'database', // 'database' or 'mock'
            connectionString: process.env.DATABASE_URL || '',
            maxRetries: 3,
            retryDelay: 1000,
            enableMetrics: true,
            timeout: 30000
        };

        return { ...defaultConfig, ...config };
    }

    /**
     * Initializes the storage manager and establishes connections
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            if (this.config.storageType === 'database') {
                await this._initializeDatabaseConnection();
            } else {
                this._initializeMockStorage();
            }

            this.isInitialized = true;
            this._logMetric('initialization', { success: true, timestamp: Date.now() });
            return true;
        } catch (error) {
            this._logMetric('initialization', { success: false, error: error.message, timestamp: Date.now() });
            throw new Error(`Failed to initialize TaskStorageManager: ${error.message}`);
        }
    }

    /**
     * Stores a task with its associated requirement
     * @param {Object} task - Task object to store
     * @param {Object} requirement - Associated requirement object
     * @returns {Promise<string>} Task ID
     */
    async storeTask(task, requirement) {
        if (!this.isInitialized) {
            throw new Error('TaskStorageManager not initialized. Call initialize() first.');
        }

        const startTime = Date.now();
        
        try {
            this._validateTaskData(task, requirement);
            
            const taskId = this._generateTaskId();
            const taskData = {
                id: taskId,
                task,
                requirement,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'pending'
            };

            if (this.config.storageType === 'database') {
                await this._storeTaskInDatabase(taskData);
            } else {
                this._storeTaskInMemory(taskData);
            }

            this._logMetric('storeTask', { 
                success: true, 
                taskId, 
                duration: Date.now() - startTime 
            });

            return taskId;
        } catch (error) {
            this._logMetric('storeTask', { 
                success: false, 
                error: error.message, 
                duration: Date.now() - startTime 
            });
            throw error;
        }
    }

    /**
     * Retrieves a task by its ID
     * @param {string} taskId - Task identifier
     * @returns {Promise<Object|null>} Task data or null if not found
     */
    async getTask(taskId) {
        if (!this.isInitialized) {
            throw new Error('TaskStorageManager not initialized. Call initialize() first.');
        }

        const startTime = Date.now();

        try {
            let taskData;
            
            if (this.config.storageType === 'database') {
                taskData = await this._getTaskFromDatabase(taskId);
            } else {
                taskData = this._getTaskFromMemory(taskId);
            }

            this._logMetric('getTask', { 
                success: true, 
                taskId, 
                found: !!taskData,
                duration: Date.now() - startTime 
            });

            return taskData;
        } catch (error) {
            this._logMetric('getTask', { 
                success: false, 
                error: error.message, 
                duration: Date.now() - startTime 
            });
            throw error;
        }
    }

    /**
     * Updates the status of a task
     * @param {string} taskId - Task identifier
     * @param {string} status - New status
     * @returns {Promise<boolean>} Success status
     */
    async updateTaskStatus(taskId, status) {
        if (!this.isInitialized) {
            throw new Error('TaskStorageManager not initialized. Call initialize() first.');
        }

        const startTime = Date.now();

        try {
            const validStatuses = ['pending', 'in-progress', 'completed', 'failed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
            }

            let success;
            
            if (this.config.storageType === 'database') {
                success = await this._updateTaskStatusInDatabase(taskId, status);
            } else {
                success = this._updateTaskStatusInMemory(taskId, status);
            }

            this._logMetric('updateTaskStatus', { 
                success, 
                taskId, 
                status,
                duration: Date.now() - startTime 
            });

            return success;
        } catch (error) {
            this._logMetric('updateTaskStatus', { 
                success: false, 
                error: error.message, 
                duration: Date.now() - startTime 
            });
            throw error;
        }
    }

    /**
     * Retrieves all tasks with optional filtering
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Array of task data
     */
    async getAllTasks(filters = {}) {
        if (!this.isInitialized) {
            throw new Error('TaskStorageManager not initialized. Call initialize() first.');
        }

        const startTime = Date.now();

        try {
            let tasks;
            
            if (this.config.storageType === 'database') {
                tasks = await this._getAllTasksFromDatabase(filters);
            } else {
                tasks = this._getAllTasksFromMemory(filters);
            }

            this._logMetric('getAllTasks', { 
                success: true, 
                count: tasks.length,
                filters,
                duration: Date.now() - startTime 
            });

            return tasks;
        } catch (error) {
            this._logMetric('getAllTasks', { 
                success: false, 
                error: error.message, 
                duration: Date.now() - startTime 
            });
            throw error;
        }
    }

    /**
     * Deletes a task by its ID
     * @param {string} taskId - Task identifier
     * @returns {Promise<boolean>} Success status
     */
    async deleteTask(taskId) {
        if (!this.isInitialized) {
            throw new Error('TaskStorageManager not initialized. Call initialize() first.');
        }

        const startTime = Date.now();

        try {
            let success;
            
            if (this.config.storageType === 'database') {
                success = await this._deleteTaskFromDatabase(taskId);
            } else {
                success = this._deleteTaskFromMemory(taskId);
            }

            this._logMetric('deleteTask', { 
                success, 
                taskId,
                duration: Date.now() - startTime 
            });

            return success;
        } catch (error) {
            this._logMetric('deleteTask', { 
                success: false, 
                error: error.message, 
                duration: Date.now() - startTime 
            });
            throw error;
        }
    }

    /**
     * Gets performance metrics
     * @returns {Object} Performance metrics data
     */
    getMetrics() {
        return Object.fromEntries(this.performanceMetrics);
    }

    /**
     * Closes connections and cleans up resources
     * @returns {Promise<void>}
     */
    async close() {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
        
        this.mockStorage.clear();
        this.performanceMetrics.clear();
        this.isInitialized = false;
    }

    // Private helper methods

    async _initializeDatabaseConnection() {
        // Database connection logic would go here
        // This is a placeholder for actual database implementation
        if (!this.config.connectionString) {
            throw new Error('Database connection string is required');
        }
        
        // Simulate connection establishment
        this.connection = {
            connected: true,
            close: async () => { this.connected = false; }
        };
    }

    _initializeMockStorage() {
        this.mockStorage.clear();
    }

    _validateTaskData(task, requirement) {
        if (!task || typeof task !== 'object') {
            throw new Error('Task must be a valid object');
        }
        
        if (!requirement || typeof requirement !== 'object') {
            throw new Error('Requirement must be a valid object');
        }

        if (!task.name || typeof task.name !== 'string') {
            throw new Error('Task must have a valid name');
        }
    }

    _generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async _storeTaskInDatabase(taskData) {
        // Database storage logic would go here
        // This is a placeholder for actual database implementation
        return true;
    }

    _storeTaskInMemory(taskData) {
        this.mockStorage.set(taskData.id, taskData);
    }

    async _getTaskFromDatabase(taskId) {
        // Database retrieval logic would go here
        // This is a placeholder for actual database implementation
        return null;
    }

    _getTaskFromMemory(taskId) {
        return this.mockStorage.get(taskId) || null;
    }

    async _updateTaskStatusInDatabase(taskId, status) {
        // Database update logic would go here
        // This is a placeholder for actual database implementation
        return true;
    }

    _updateTaskStatusInMemory(taskId, status) {
        const task = this.mockStorage.get(taskId);
        if (task) {
            task.status = status;
            task.updatedAt = new Date().toISOString();
            this.mockStorage.set(taskId, task);
            return true;
        }
        return false;
    }

    async _getAllTasksFromDatabase(filters) {
        // Database query logic would go here
        // This is a placeholder for actual database implementation
        return [];
    }

    _getAllTasksFromMemory(filters) {
        const tasks = Array.from(this.mockStorage.values());
        
        if (Object.keys(filters).length === 0) {
            return tasks;
        }

        return tasks.filter(task => {
            return Object.entries(filters).every(([key, value]) => {
                return task[key] === value;
            });
        });
    }

    async _deleteTaskFromDatabase(taskId) {
        // Database deletion logic would go here
        // This is a placeholder for actual database implementation
        return true;
    }

    _deleteTaskFromMemory(taskId) {
        return this.mockStorage.delete(taskId);
    }

    _logMetric(operation, data) {
        if (!this.config.enableMetrics) {
            return;
        }

        const metrics = this.performanceMetrics.get(operation) || [];
        metrics.push(data);
        this.performanceMetrics.set(operation, metrics);
    }
}

