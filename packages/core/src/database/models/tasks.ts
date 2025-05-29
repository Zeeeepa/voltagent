import { DatabaseConnection } from '../connection';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tasks model for VoltAgent database
 * Phase 1.3: Setup Database Event Storage System
 */

export interface Task {
  id: string;
  requirement_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigned_agent?: string;
  priority: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export interface CreateTaskInput {
  requirement_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  assigned_agent?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface UpdateTaskInput {
  requirement_id?: string;
  parent_task_id?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigned_agent?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface TaskFilters {
  requirement_id?: string;
  parent_task_id?: string;
  status?: TaskStatus;
  assigned_agent?: string;
  min_priority?: number;
  max_priority?: number;
  limit?: number;
  offset?: number;
}

export interface TaskHierarchy extends Task {
  children: TaskHierarchy[];
  depth: number;
}

export class TasksModel {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new task
   */
  async create(input: CreateTaskInput): Promise<Task> {
    const id = uuidv4();
    
    // Validate parent task doesn't create circular reference
    if (input.parent_task_id) {
      const isCircular = await this.wouldCreateCircularReference(id, input.parent_task_id);
      if (isCircular) {
        throw new Error('Cannot create task: would create circular reference');
      }
    }
    
    const query = `
      INSERT INTO tasks (id, requirement_id, parent_task_id, title, description, status, assigned_agent, priority, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      input.requirement_id || null,
      input.parent_task_id || null,
      input.title,
      input.description || null,
      input.status || 'todo',
      input.assigned_agent || null,
      input.priority || 0,
      JSON.stringify(input.metadata || {})
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Get task by ID
   */
  async findById(id: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Update a task
   */
  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    // Validate parent task doesn't create circular reference
    if (input.parent_task_id) {
      const isCircular = await this.wouldCreateCircularReference(id, input.parent_task_id);
      if (isCircular) {
        throw new Error('Cannot update task: would create circular reference');
      }
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.requirement_id !== undefined) {
      updateFields.push(`requirement_id = $${paramIndex++}`);
      values.push(input.requirement_id);
    }
    
    if (input.parent_task_id !== undefined) {
      updateFields.push(`parent_task_id = $${paramIndex++}`);
      values.push(input.parent_task_id);
    }
    
    if (input.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    
    if (input.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    
    if (input.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    
    if (input.assigned_agent !== undefined) {
      updateFields.push(`assigned_agent = $${paramIndex++}`);
      values.push(input.assigned_agent);
    }
    
    if (input.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      values.push(input.priority);
    }
    
    if (input.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const query = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Delete a task
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Find tasks with filters
   */
  async find(filters: TaskFilters = {}): Promise<Task[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.requirement_id) {
      conditions.push(`requirement_id = $${paramIndex++}`);
      values.push(filters.requirement_id);
    }
    
    if (filters.parent_task_id !== undefined) {
      if (filters.parent_task_id === null) {
        conditions.push(`parent_task_id IS NULL`);
      } else {
        conditions.push(`parent_task_id = $${paramIndex++}`);
        values.push(filters.parent_task_id);
      }
    }
    
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    if (filters.assigned_agent) {
      conditions.push(`assigned_agent = $${paramIndex++}`);
      values.push(filters.assigned_agent);
    }
    
    if (filters.min_priority !== undefined) {
      conditions.push(`priority >= $${paramIndex++}`);
      values.push(filters.min_priority);
    }
    
    if (filters.max_priority !== undefined) {
      conditions.push(`priority <= $${paramIndex++}`);
      values.push(filters.max_priority);
    }

    let query = 'SELECT * FROM tasks';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY priority DESC, created_at ASC';
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Get tasks count with filters
   */
  async count(filters: TaskFilters = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.requirement_id) {
      conditions.push(`requirement_id = $${paramIndex++}`);
      values.push(filters.requirement_id);
    }
    
    if (filters.parent_task_id !== undefined) {
      if (filters.parent_task_id === null) {
        conditions.push(`parent_task_id IS NULL`);
      } else {
        conditions.push(`parent_task_id = $${paramIndex++}`);
        values.push(filters.parent_task_id);
      }
    }
    
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    if (filters.assigned_agent) {
      conditions.push(`assigned_agent = $${paramIndex++}`);
      values.push(filters.assigned_agent);
    }
    
    if (filters.min_priority !== undefined) {
      conditions.push(`priority >= $${paramIndex++}`);
      values.push(filters.min_priority);
    }
    
    if (filters.max_priority !== undefined) {
      conditions.push(`priority <= $${paramIndex++}`);
      values.push(filters.max_priority);
    }

    let query = 'SELECT COUNT(*) as count FROM tasks';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get child tasks of a parent task
   */
  async getChildren(parentId: string): Promise<Task[]> {
    return this.find({ parent_task_id: parentId });
  }

  /**
   * Get root tasks (tasks without parent)
   */
  async getRootTasks(): Promise<Task[]> {
    return this.find({ parent_task_id: null });
  }

  /**
   * Get task hierarchy starting from a root task
   */
  async getTaskHierarchy(rootTaskId?: string): Promise<TaskHierarchy[]> {
    let rootTasks: Task[];
    
    if (rootTaskId) {
      const rootTask = await this.findById(rootTaskId);
      rootTasks = rootTask ? [rootTask] : [];
    } else {
      rootTasks = await this.getRootTasks();
    }

    const hierarchies: TaskHierarchy[] = [];
    
    for (const rootTask of rootTasks) {
      const hierarchy = await this.buildTaskHierarchy(rootTask, 0);
      hierarchies.push(hierarchy);
    }
    
    return hierarchies;
  }

  /**
   * Build task hierarchy recursively
   */
  private async buildTaskHierarchy(task: Task, depth: number): Promise<TaskHierarchy> {
    const children = await this.getChildren(task.id);
    const childHierarchies: TaskHierarchy[] = [];
    
    for (const child of children) {
      const childHierarchy = await this.buildTaskHierarchy(child, depth + 1);
      childHierarchies.push(childHierarchy);
    }
    
    return {
      ...task,
      children: childHierarchies,
      depth
    };
  }

  /**
   * Check if adding a parent would create circular reference
   */
  private async wouldCreateCircularReference(taskId: string, parentId: string): Promise<boolean> {
    if (taskId === parentId) {
      return true;
    }
    
    // Check if parentId is a descendant of taskId
    const descendants = await this.getAllDescendants(taskId);
    return descendants.some(descendant => descendant.id === parentId);
  }

  /**
   * Get all descendants of a task
   */
  async getAllDescendants(taskId: string): Promise<Task[]> {
    const descendants: Task[] = [];
    const children = await this.getChildren(taskId);
    
    for (const child of children) {
      descendants.push(child);
      const childDescendants = await this.getAllDescendants(child.id);
      descendants.push(...childDescendants);
    }
    
    return descendants;
  }

  /**
   * Get all ancestors of a task
   */
  async getAllAncestors(taskId: string): Promise<Task[]> {
    const ancestors: Task[] = [];
    const task = await this.findById(taskId);
    
    if (task && task.parent_task_id) {
      const parent = await this.findById(task.parent_task_id);
      if (parent) {
        ancestors.push(parent);
        const parentAncestors = await this.getAllAncestors(parent.id);
        ancestors.push(...parentAncestors);
      }
    }
    
    return ancestors;
  }

  /**
   * Get tasks by requirement
   */
  async getTasksByRequirement(requirementId: string): Promise<Task[]> {
    return this.find({ requirement_id: requirementId });
  }

  /**
   * Get tasks by agent
   */
  async getTasksByAgent(agentId: string): Promise<Task[]> {
    return this.find({ assigned_agent: agentId });
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.find({ status });
  }

  /**
   * Assign task to agent
   */
  async assignToAgent(taskId: string, agentId: string): Promise<Task | null> {
    return this.update(taskId, { assigned_agent: agentId });
  }

  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: TaskStatus): Promise<Task | null> {
    return this.update(taskId, { status });
  }

  /**
   * Update task priority
   */
  async updatePriority(taskId: string, priority: number): Promise<Task | null> {
    if (priority < 0 || priority > 10) {
      throw new Error('Priority must be between 0 and 10');
    }
    return this.update(taskId, { priority });
  }

  /**
   * Map database row to Task object
   */
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      requirement_id: row.requirement_id,
      parent_task_id: row.parent_task_id,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      assigned_agent: row.assigned_agent,
      priority: row.priority,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

