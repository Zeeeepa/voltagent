import Redis from "redis";
import { RedisConfig } from "../types";

export interface QueuedTask {
  id: string;
  prId: string;
  taskId: string;
  priority: number;
  payload: Record<string, unknown>;
  createdAt: Date;
  retryCount?: number;
}

export class TaskQueue {
  private redis: Redis.RedisClientType;
  private readonly queueKey = "voltagent:task_queue";
  private readonly processingKey = "voltagent:processing";
  private readonly deadLetterKey = "voltagent:dead_letter";

  constructor(config: RedisConfig) {
    this.redis = Redis.createClient({
      socket: {
        host: config.host,
        port: config.port,
      },
      password: config.password,
      database: config.db || 0,
    });
  }

  /**
   * Initialize the task queue
   */
  async initialize(): Promise<void> {
    await this.redis.connect();
    console.log("Task queue initialized");
  }

  /**
   * Add a task to the queue
   */
  async enqueue(task: Omit<QueuedTask, "createdAt">): Promise<void> {
    const queuedTask: QueuedTask = {
      ...task,
      createdAt: new Date(),
      retryCount: 0,
    };

    // Use priority as score for sorted set
    await this.redis.zAdd(this.queueKey, {
      score: task.priority,
      value: JSON.stringify(queuedTask),
    });

    console.log(`Task ${task.id} enqueued with priority ${task.priority}`);
  }

  /**
   * Dequeue the highest priority task
   */
  async dequeue(): Promise<QueuedTask | null> {
    // Get highest priority task (highest score)
    const result = await this.redis.zPopMax(this.queueKey);
    
    if (!result) {
      return null;
    }

    const task: QueuedTask = JSON.parse(result.value);
    
    // Move to processing set with expiration
    await this.redis.setEx(
      `${this.processingKey}:${task.id}`,
      300, // 5 minutes timeout
      JSON.stringify(task)
    );

    return task;
  }

  /**
   * Mark task as completed
   */
  async complete(taskId: string): Promise<void> {
    await this.redis.del(`${this.processingKey}:${taskId}`);
    console.log(`Task ${taskId} completed`);
  }

  /**
   * Mark task as failed and handle retry logic
   */
  async fail(taskId: string, error: string, maxRetries: number = 3): Promise<void> {
    const processingKey = `${this.processingKey}:${taskId}`;
    const taskData = await this.redis.get(processingKey);
    
    if (!taskData) {
      console.warn(`Task ${taskId} not found in processing queue`);
      return;
    }

    const task: QueuedTask = JSON.parse(taskData);
    task.retryCount = (task.retryCount || 0) + 1;

    // Remove from processing
    await this.redis.del(processingKey);

    if (task.retryCount <= maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, task.retryCount) * 1000; // 2^n seconds
      
      setTimeout(async () => {
        await this.enqueue(task);
        console.log(`Task ${taskId} requeued for retry ${task.retryCount}/${maxRetries}`);
      }, delay);
    } else {
      // Move to dead letter queue
      await this.redis.lPush(this.deadLetterKey, JSON.stringify({
        ...task,
        failedAt: new Date(),
        error,
      }));
      
      console.log(`Task ${taskId} moved to dead letter queue after ${maxRetries} retries`);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    deadLetter: number;
  }> {
    const [pending, processingKeys, deadLetter] = await Promise.all([
      this.redis.zCard(this.queueKey),
      this.redis.keys(`${this.processingKey}:*`),
      this.redis.lLen(this.deadLetterKey),
    ]);

    return {
      pending,
      processing: processingKeys.length,
      deadLetter,
    };
  }

  /**
   * Get pending tasks count by priority
   */
  async getPendingByPriority(): Promise<Record<string, number>> {
    const tasks = await this.redis.zRangeWithScores(this.queueKey, 0, -1);
    const priorityCounts: Record<string, number> = {};

    for (const task of tasks) {
      const priority = task.score.toString();
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    }

    return priorityCounts;
  }

  /**
   * Clear all queues (for testing)
   */
  async clear(): Promise<void> {
    await Promise.all([
      this.redis.del(this.queueKey),
      this.redis.del(this.deadLetterKey),
    ]);

    // Clear processing keys
    const processingKeys = await this.redis.keys(`${this.processingKey}:*`);
    if (processingKeys.length > 0) {
      await this.redis.del(processingKeys);
    }

    console.log("Task queue cleared");
  }

  /**
   * Recover stale processing tasks
   */
  async recoverStaleTasks(): Promise<number> {
    const processingKeys = await this.redis.keys(`${this.processingKey}:*`);
    let recoveredCount = 0;

    for (const key of processingKeys) {
      const ttl = await this.redis.ttl(key);
      
      // If TTL is expired or very low, recover the task
      if (ttl <= 0) {
        const taskData = await this.redis.get(key);
        if (taskData) {
          const task: QueuedTask = JSON.parse(taskData);
          await this.redis.del(key);
          await this.enqueue(task);
          recoveredCount++;
        }
      }
    }

    if (recoveredCount > 0) {
      console.log(`Recovered ${recoveredCount} stale tasks`);
    }

    return recoveredCount;
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error("Task queue health check failed:", error);
      return false;
    }
  }
}

