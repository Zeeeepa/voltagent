import { Task } from "../../types";
import { SQL_QUERIES } from "../sql";
import { BaseRepository } from "./base";

export class TaskRepository extends BaseRepository {
  /**
   * Create a new task
   */
  async create(data: Omit<Task, "id" | "created_at" | "updated_at">): Promise<Task> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.CREATE_TASK,
      [
        data.pr_id,
        data.name,
        data.description,
        data.task_type,
        data.dependencies || [],
        data.priority,
        JSON.stringify(data.metadata || {}),
      ]
    );
    
    return this.parseRow<Task>(result);
  }

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_TASK_BY_ID,
      [id]
    );
    
    return result ? this.parseRow<Task>(result) : null;
  }

  /**
   * Get tasks by PR
   */
  async getByPR(prId: string): Promise<Task[]> {
    const results = await this.executeQuery(
      SQL_QUERIES.GET_TASKS_BY_PR,
      [prId]
    );
    
    return this.parseRows<Task>(results);
  }

  /**
   * Update task status
   */
  async updateStatus(
    id: string, 
    status: Task["status"], 
    startedAt?: Date, 
    completedAt?: Date
  ): Promise<Task | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.UPDATE_TASK_STATUS,
      [id, status, startedAt, completedAt]
    );
    
    return result ? this.parseRow<Task>(result) : null;
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks(): Promise<Task[]> {
    const results = await this.executeQuery(SQL_QUERIES.GET_PENDING_TASKS);
    return this.parseRows<Task>(results);
  }

  /**
   * Get tasks by status
   */
  async getByStatus(status: Task["status"]): Promise<Task[]> {
    const results = await this.executeQuery(
      "SELECT * FROM tasks WHERE status = $1 ORDER BY priority DESC, created_at ASC",
      [status]
    );
    
    return this.parseRows<Task>(results);
  }

  /**
   * Get tasks by priority
   */
  async getByPriority(priority: Task["priority"]): Promise<Task[]> {
    const results = await this.executeQuery(
      "SELECT * FROM tasks WHERE priority = $1 ORDER BY created_at ASC",
      [priority]
    );
    
    return this.parseRows<Task>(results);
  }

  /**
   * Get tasks by type
   */
  async getByType(taskType: string): Promise<Task[]> {
    const results = await this.executeQuery(
      "SELECT * FROM tasks WHERE task_type = $1 ORDER BY priority DESC, created_at ASC",
      [taskType]
    );
    
    return this.parseRows<Task>(results);
  }

  /**
   * Get runnable tasks (no pending dependencies)
   */
  async getRunnableTasks(): Promise<Task[]> {
    const results = await this.executeQuery(`
      SELECT t.* FROM tasks t
      WHERE t.status = 'pending'
      AND (
        t.dependencies IS NULL 
        OR t.dependencies = '{}'
        OR NOT EXISTS (
          SELECT 1 FROM tasks dep 
          WHERE dep.id = ANY(t.dependencies) 
          AND dep.status NOT IN ('completed', 'cancelled')
        )
      )
      ORDER BY t.priority DESC, t.created_at ASC
    `);
    
    return this.parseRows<Task>(results);
  }

  /**
   * Update task metadata
   */
  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<Task | null> {
    const result = await this.executeQuerySingle(
      "UPDATE tasks SET metadata = $2 WHERE id = $1 RETURNING *",
      [id, JSON.stringify(metadata)]
    );
    
    return result ? this.parseRow<Task>(result) : null;
  }

  /**
   * Get task dependencies
   */
  async getDependencies(id: string): Promise<Task[]> {
    const task = await this.getById(id);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return [];
    }

    const results = await this.executeQuery(
      "SELECT * FROM tasks WHERE id = ANY($1)",
      [task.dependencies]
    );
    
    return this.parseRows<Task>(results);
  }

  /**
   * Get tasks that depend on this task
   */
  async getDependents(id: string): Promise<Task[]> {
    const results = await this.executeQuery(
      "SELECT * FROM tasks WHERE $1 = ANY(dependencies)",
      [id]
    );
    
    return this.parseRows<Task>(results);
  }

  /**
   * Cancel task and all dependents
   */
  async cancelWithDependents(id: string): Promise<Task[]> {
    return await this.db.transaction(async (client) => {
      // Get all dependent tasks recursively
      const dependents = await this.getAllDependents(id);
      const allTaskIds = [id, ...dependents.map(t => t.id)];

      // Cancel all tasks
      const result = await client.query(
        "UPDATE tasks SET status = 'cancelled' WHERE id = ANY($1) RETURNING *",
        [allTaskIds]
      );

      return this.parseRows<Task>(result.rows);
    });
  }

  /**
   * Get all dependent tasks recursively
   */
  private async getAllDependents(id: string): Promise<Task[]> {
    const directDependents = await this.getDependents(id);
    const allDependents = [...directDependents];

    for (const dependent of directDependents) {
      const nestedDependents = await this.getAllDependents(dependent.id);
      allDependents.push(...nestedDependents);
    }

    return allDependents;
  }

  /**
   * Get task statistics for a PR
   */
  async getTaskStats(prId: string): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    by_type: Record<string, number>;
  }> {
    const results = await this.executeQuery(
      `SELECT 
        status,
        priority,
        task_type,
        COUNT(*) as count
      FROM tasks 
      WHERE pr_id = $1 
      GROUP BY status, priority, task_type`,
      [prId]
    );

    const stats = {
      total: 0,
      by_status: {} as Record<string, number>,
      by_priority: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
    };

    for (const row of results) {
      const count = parseInt(row.count) || 0;
      stats.total += count;
      
      stats.by_status[row.status] = (stats.by_status[row.status] || 0) + count;
      stats.by_priority[row.priority] = (stats.by_priority[row.priority] || 0) + count;
      stats.by_type[row.task_type] = (stats.by_type[row.task_type] || 0) + count;
    }

    return stats;
  }
}

