/**
 * list-tasks.ts
 * Direct function implementation for listing tasks
 */

import fs from 'fs';
import { getCachedOrExecute } from '../utils/cache-utils';
import { DirectFunctionArgs, DirectFunctionResult, Logger, TasksData } from '../types';

/**
 * Direct function wrapper for listTasks with error handling and caching.
 *
 * @param args - Command arguments (expecting tasksJsonPath explicitly).
 * @param log - Logger object.
 * @returns Task list result.
 */
export async function listTasksDirect(
  args: DirectFunctionArgs, 
  log: Logger
): Promise<DirectFunctionResult<TasksData>> {
  // Destructure the explicit tasksJsonPath from args
  const { tasksJsonPath, status, withSubtasks } = args;

  if (!tasksJsonPath) {
    log.error('listTasksDirect called without tasksJsonPath');
    return {
      success: false,
      error: {
        code: 'MISSING_ARGUMENT',
        message: 'tasksJsonPath is required'
      },
      fromCache: false
    };
  }

  // Use the explicit tasksJsonPath for cache key
  const statusFilter = status || 'all';
  const withSubtasksFilter = withSubtasks || false;
  const cacheKey = `listTasks:${tasksJsonPath}:${statusFilter}:${withSubtasksFilter}`;

  // Define the action function to be executed on cache miss
  const coreListTasksAction = async (): Promise<DirectFunctionResult<TasksData>> => {
    try {
      log.info(
        `Executing core listTasks function for path: ${tasksJsonPath}, filter: ${statusFilter}, subtasks: ${withSubtasksFilter}`
      );
      
      // Read the tasks file
      const tasksData = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf8')) as TasksData;

      if (!tasksData || !tasksData.tasks) {
        log.error('Invalid or empty response from tasks file');
        return {
          success: false,
          error: {
            code: 'INVALID_TASKS_FILE',
            message: 'Invalid or empty tasks file'
          }
        };
      }

      // Filter tasks by status if specified
      let filteredTasks = tasksData.tasks;
      if (status && status !== 'all') {
        filteredTasks = tasksData.tasks.filter(task => task.status === status);
      }

      // Remove subtasks if not requested
      if (!withSubtasksFilter) {
        filteredTasks = filteredTasks.map(task => {
          const { subtasks, ...taskWithoutSubtasks } = task;
          return taskWithoutSubtasks;
        });
      }

      log.info(
        `Retrieved ${filteredTasks.length} tasks`
      );

      return { 
        success: true, 
        data: {
          ...tasksData,
          tasks: filteredTasks
        } 
      };
    } catch (error: any) {
      log.error(`Core listTasks function failed: ${error.message}`);
      return {
        success: false,
        error: {
          code: 'LIST_TASKS_ERROR',
          message: error.message || 'Failed to list tasks'
        }
      };
    }
  };

  // Use the caching utility
  try {
    const result = await getCachedOrExecute({
      cacheKey,
      actionFn: coreListTasksAction,
      log
    });
    log.info(`listTasksDirect completed. From cache: ${result.fromCache}`);
    return result; // Returns { success, data/error, fromCache }
  } catch (error: any) {
    // Catch unexpected errors from getCachedOrExecute itself (though unlikely)
    log.error(
      `Unexpected error during getCachedOrExecute for listTasks: ${error.message}`
    );
    console.error(error.stack);
    return {
      success: false,
      error: { code: 'CACHE_UTIL_ERROR', message: error.message },
      fromCache: false
    };
  }
}

