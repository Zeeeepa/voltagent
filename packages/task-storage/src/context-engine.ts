import { v4 as uuidv4 } from 'uuid';
import { TaskStorageManager } from './task-storage-manager';
import type {
  TaskContext,
  ContextType,
  ContextEngineOptions,
} from './types';

export class ContextEngine {
  private taskStorage: TaskStorageManager;
  private options: ContextEngineOptions;
  private contextCache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(taskStorage: TaskStorageManager, options: ContextEngineOptions = {}) {
    this.taskStorage = taskStorage;
    this.options = {
      enableCaching: options.enableCaching ?? true,
      cacheTtlSeconds: options.cacheTtlSeconds ?? 3600, // 1 hour
      enableCompression: options.enableCompression ?? false,
      maxContextSizeMb: options.maxContextSizeMb ?? 10,
    };

    // Clean up cache periodically
    if (this.options.enableCaching) {
      setInterval(() => this.cleanupCache(), 300000); // 5 minutes
    }
  }

  /**
   * Store task context
   */
  async storeTaskContext(
    taskId: string,
    contextType: ContextType,
    contextData: Record<string, any>,
    version?: number
  ): Promise<TaskContext> {
    // Validate context size
    const contextSize = this.calculateContextSize(contextData);
    if (contextSize > (this.options.maxContextSizeMb! * 1024 * 1024)) {
      throw new Error(`Context data too large: ${contextSize} bytes exceeds limit of ${this.options.maxContextSizeMb}MB`);
    }

    // Get current version if not provided
    if (!version) {
      const currentVersion = await this.getCurrentContextVersion(taskId, contextType);
      version = currentVersion + 1;
    }

    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO task_context (id, task_id, context_type, context_data, version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      id,
      taskId,
      contextType,
      JSON.stringify(contextData),
      version,
      now,
      now,
    ];

    const result = await this.taskStorage['db'].queryOne<any>(query, params);
    if (!result) {
      throw new Error('Failed to store task context');
    }

    const context: TaskContext = {
      id: result.id,
      task_id: result.task_id,
      context_type: result.context_type,
      context_data: result.context_data,
      created_at: result.created_at,
      updated_at: result.updated_at,
      version: result.version,
    };

    // Update cache
    if (this.options.enableCaching) {
      const cacheKey = `${taskId}:${contextType}:${version}`;
      this.contextCache.set(cacheKey, {
        data: context,
        timestamp: Date.now(),
      });
    }

    return context;
  }

  /**
   * Get task context by type and version
   */
  async getTaskContext(
    taskId: string,
    contextType: ContextType,
    version?: number
  ): Promise<TaskContext | null> {
    const cacheKey = `${taskId}:${contextType}:${version || 'latest'}`;

    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.contextCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }
    }

    let query: string;
    let params: any[];

    if (version) {
      query = `
        SELECT * FROM task_context 
        WHERE task_id = $1 AND context_type = $2 AND version = $3
      `;
      params = [taskId, contextType, version];
    } else {
      query = `
        SELECT * FROM task_context 
        WHERE task_id = $1 AND context_type = $2 
        ORDER BY version DESC 
        LIMIT 1
      `;
      params = [taskId, contextType];
    }

    const result = await this.taskStorage['db'].queryOne<any>(query, params);
    if (!result) {
      return null;
    }

    const context: TaskContext = {
      id: result.id,
      task_id: result.task_id,
      context_type: result.context_type,
      context_data: result.context_data,
      created_at: result.created_at,
      updated_at: result.updated_at,
      version: result.version,
    };

    // Update cache
    if (this.options.enableCaching) {
      this.contextCache.set(cacheKey, {
        data: context,
        timestamp: Date.now(),
      });
    }

    return context;
  }

  /**
   * Get all context for a task
   */
  async getTaskFullContext(taskId: string): Promise<Record<string, TaskContext[]>> {
    const cacheKey = `${taskId}:full_context`;

    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.contextCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }
    }

    const query = `
      SELECT * FROM task_context 
      WHERE task_id = $1 
      ORDER BY context_type, version DESC
    `;

    const results = await this.taskStorage['db'].query<any>(query, [taskId]);
    
    const contextByType: Record<string, TaskContext[]> = {};
    
    results.forEach(row => {
      const context: TaskContext = {
        id: row.id,
        task_id: row.task_id,
        context_type: row.context_type,
        context_data: row.context_data,
        created_at: row.created_at,
        updated_at: row.updated_at,
        version: row.version,
      };

      if (!contextByType[context.context_type]) {
        contextByType[context.context_type] = [];
      }
      contextByType[context.context_type].push(context);
    });

    // Update cache
    if (this.options.enableCaching) {
      this.contextCache.set(cacheKey, {
        data: contextByType,
        timestamp: Date.now(),
      });
    }

    return contextByType;
  }

  /**
   * Get latest context for each type
   */
  async getTaskLatestContext(taskId: string): Promise<Record<string, TaskContext>> {
    const query = `
      SELECT DISTINCT ON (context_type) *
      FROM task_context 
      WHERE task_id = $1 
      ORDER BY context_type, version DESC
    `;

    const results = await this.taskStorage['db'].query<any>(query, [taskId]);
    
    const latestContext: Record<string, TaskContext> = {};
    
    results.forEach(row => {
      const context: TaskContext = {
        id: row.id,
        task_id: row.task_id,
        context_type: row.context_type,
        context_data: row.context_data,
        created_at: row.created_at,
        updated_at: row.updated_at,
        version: row.version,
      };

      latestContext[context.context_type] = context;
    });

    return latestContext;
  }

  /**
   * Update task context (creates new version)
   */
  async updateTaskContext(
    taskId: string,
    contextType: ContextType,
    contextData: Record<string, any>
  ): Promise<TaskContext> {
    return this.storeTaskContext(taskId, contextType, contextData);
  }

  /**
   * Delete task context
   */
  async deleteTaskContext(
    taskId: string,
    contextType?: ContextType,
    version?: number
  ): Promise<void> {
    let query: string;
    let params: any[];

    if (contextType && version) {
      query = 'DELETE FROM task_context WHERE task_id = $1 AND context_type = $2 AND version = $3';
      params = [taskId, contextType, version];
    } else if (contextType) {
      query = 'DELETE FROM task_context WHERE task_id = $1 AND context_type = $2';
      params = [taskId, contextType];
    } else {
      query = 'DELETE FROM task_context WHERE task_id = $1';
      params = [taskId];
    }

    await this.taskStorage['db'].query(query, params);

    // Clear related cache entries
    if (this.options.enableCaching) {
      this.clearTaskCache(taskId, contextType);
    }
  }

  /**
   * Get context history for a specific type
   */
  async getContextHistory(
    taskId: string,
    contextType: ContextType,
    limit = 10
  ): Promise<TaskContext[]> {
    const query = `
      SELECT * FROM task_context 
      WHERE task_id = $1 AND context_type = $2 
      ORDER BY version DESC 
      LIMIT $3
    `;

    const results = await this.taskStorage['db'].query<any>(query, [taskId, contextType, limit]);
    
    return results.map(row => ({
      id: row.id,
      task_id: row.task_id,
      context_type: row.context_type,
      context_data: row.context_data,
      created_at: row.created_at,
      updated_at: row.updated_at,
      version: row.version,
    }));
  }

  /**
   * Search context by content
   */
  async searchContext(
    searchTerm: string,
    contextType?: ContextType,
    limit = 50
  ): Promise<TaskContext[]> {
    let query: string;
    let params: any[];

    if (contextType) {
      query = `
        SELECT * FROM task_context 
        WHERE context_type = $1 AND context_data::text ILIKE $2
        ORDER BY updated_at DESC 
        LIMIT $3
      `;
      params = [contextType, `%${searchTerm}%`, limit];
    } else {
      query = `
        SELECT * FROM task_context 
        WHERE context_data::text ILIKE $1
        ORDER BY updated_at DESC 
        LIMIT $2
      `;
      params = [`%${searchTerm}%`, limit];
    }

    const results = await this.taskStorage['db'].query<any>(query, params);
    
    return results.map(row => ({
      id: row.id,
      task_id: row.task_id,
      context_type: row.context_type,
      context_data: row.context_data,
      created_at: row.created_at,
      updated_at: row.updated_at,
      version: row.version,
    }));
  }

  /**
   * Get context statistics
   */
  async getContextStats(taskId?: string): Promise<{
    total_contexts: number;
    contexts_by_type: Record<string, number>;
    average_size_bytes: number;
    latest_update: Date | null;
  }> {
    let baseQuery = 'FROM task_context';
    let params: any[] = [];
    
    if (taskId) {
      baseQuery += ' WHERE task_id = $1';
      params = [taskId];
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await this.taskStorage['db'].queryOne<any>(countQuery, params);

    // Get counts by type
    const typeQuery = `
      SELECT context_type, COUNT(*) as count 
      ${baseQuery}
      GROUP BY context_type
    `;
    const typeResults = await this.taskStorage['db'].query<any>(typeQuery, params);
    const contextsByType = typeResults.reduce((acc, row) => {
      acc[row.context_type] = parseInt(row.count);
      return acc;
    }, {});

    // Get average size and latest update
    const statsQuery = `
      SELECT 
        AVG(LENGTH(context_data::text)) as avg_size,
        MAX(updated_at) as latest_update
      ${baseQuery}
    `;
    const statsResult = await this.taskStorage['db'].queryOne<any>(statsQuery, params);

    return {
      total_contexts: parseInt(countResult?.total || 0),
      contexts_by_type: contextsByType,
      average_size_bytes: parseFloat(statsResult?.avg_size || 0),
      latest_update: statsResult?.latest_update || null,
    };
  }

  /**
   * Clear cache for a task
   */
  private clearTaskCache(taskId: string, contextType?: ContextType): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.contextCache.keys()) {
      if (key.startsWith(`${taskId}:`)) {
        if (!contextType || key.includes(`:${contextType}:`)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => this.contextCache.delete(key));
  }

  /**
   * Get current context version
   */
  private async getCurrentContextVersion(taskId: string, contextType: ContextType): Promise<number> {
    const query = `
      SELECT MAX(version) as max_version 
      FROM task_context 
      WHERE task_id = $1 AND context_type = $2
    `;
    
    const result = await this.taskStorage['db'].queryOne<any>(query, [taskId, contextType]);
    return result?.max_version || 0;
  }

  /**
   * Calculate context data size in bytes
   */
  private calculateContextSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const ttlMs = this.options.cacheTtlSeconds! * 1000;
    return (Date.now() - timestamp) < ttlMs;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const ttlMs = this.options.cacheTtlSeconds! * 1000;

    for (const [key, entry] of this.contextCache.entries()) {
      if ((now - entry.timestamp) > ttlMs) {
        this.contextCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.contextCache.size,
      enabled: this.options.enableCaching,
      ttlSeconds: this.options.cacheTtlSeconds,
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.contextCache.clear();
  }
}

