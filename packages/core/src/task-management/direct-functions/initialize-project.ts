/**
 * initialize-project.ts
 * Direct function implementation for initializing a new project
 */

import fs from 'fs';
import path from 'path';
import { DirectFunctionArgs, DirectFunctionContext, DirectFunctionResult, Logger } from '../types';
import { resolveProjectPaths } from '../utils/path-utils';

/**
 * Direct function wrapper for initializing a new project.
 *
 * @param args - Command arguments
 * @param log - Logger object
 * @param context - Additional context
 * @returns Result object
 */
export async function initializeProjectDirect(
  args: DirectFunctionArgs, 
  log: Logger, 
  context: DirectFunctionContext = {}
): Promise<DirectFunctionResult<{ projectRoot: string; tasksJsonPath: string }>> {
  try {
    // Check if projectRoot was provided
    if (!args.projectRoot) {
      log.error('initializeProjectDirect called without projectRoot');
      return {
        success: false,
        error: {
          code: 'MISSING_ARGUMENT',
          message: 'projectRoot is required'
        }
      };
    }

    const projectRoot = args.projectRoot;
    log.info(`Initializing project at: ${projectRoot}`);

    // Resolve paths for the project
    const paths = resolveProjectPaths(projectRoot, {
      input: args.input,
      output: args.output
    }, log);

    const tasksJsonPath = paths.tasksJsonPath as string;
    
    // Create the tasks directory if it doesn't exist
    const tasksDir = path.dirname(tasksJsonPath);
    if (!fs.existsSync(tasksDir)) {
      log.info(`Creating tasks directory: ${tasksDir}`);
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    // Check if tasks.json already exists
    if (fs.existsSync(tasksJsonPath)) {
      log.info(`Tasks file already exists at: ${tasksJsonPath}`);
      return {
        success: true,
        data: {
          projectRoot,
          tasksJsonPath
        }
      };
    }

    // Create an empty tasks.json file
    const initialTasksData = {
      tasks: [],
      metadata: {
        projectName: path.basename(projectRoot),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'manual'
      }
    };

    // Write the initial tasks data to the file
    fs.writeFileSync(tasksJsonPath, JSON.stringify(initialTasksData, null, 2));
    log.info(`Created initial tasks file at: ${tasksJsonPath}`);

    return {
      success: true,
      data: {
        projectRoot,
        tasksJsonPath
      }
    };
  } catch (error: any) {
    log.error(`Error in initializeProjectDirect: ${error.message}`);
    return {
      success: false,
      error: {
        code: 'INITIALIZE_PROJECT_ERROR',
        message: error.message
      }
    };
  }
}

