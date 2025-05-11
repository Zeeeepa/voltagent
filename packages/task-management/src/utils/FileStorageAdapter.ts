/**
 * File-based storage adapter for TaskManager
 */

import fs from 'fs/promises';
import { TaskStorageAdapter } from '../core/TaskManager';
import { Task } from '../types/task';

/**
 * Options for creating a FileStorageAdapter
 */
export interface FileStorageAdapterOptions {
  /**
   * Path to the file where tasks will be stored
   */
  filePath: string;

  /**
   * Whether to create the file if it doesn't exist
   */
  createIfNotExists?: boolean;

  /**
   * Whether to pretty-print the JSON (with indentation)
   */
  prettyPrint?: boolean;
}

/**
 * File-based storage adapter for TaskManager
 * 
 * This adapter stores tasks in a JSON file on the filesystem.
 */
export class FileStorageAdapter implements TaskStorageAdapter {
  /**
   * Path to the file where tasks will be stored
   */
  private filePath: string;

  /**
   * Whether to create the file if it doesn't exist
   */
  private createIfNotExists: boolean;

  /**
   * Whether to pretty-print the JSON (with indentation)
   */
  private prettyPrint: boolean;

  /**
   * Create a new FileStorageAdapter
   */
  constructor(options: FileStorageAdapterOptions) {
    this.filePath = options.filePath;
    this.createIfNotExists = options.createIfNotExists ?? true;
    this.prettyPrint = options.prettyPrint ?? true;
  }

  /**
   * Save tasks to the file
   * 
   * @param tasks - Tasks to save
   */
  public async saveTasks(tasks: Task[]): Promise<void> {
    const data = this.prettyPrint
      ? JSON.stringify(tasks, null, 2)
      : JSON.stringify(tasks);

    try {
      await fs.writeFile(this.filePath, data, 'utf-8');
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT' &&
        this.createIfNotExists
      ) {
        // Create the directory if it doesn't exist
        const dirPath = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
        await fs.mkdir(dirPath, { recursive: true });
        
        // Try writing again
        await fs.writeFile(this.filePath, data, 'utf-8');
      } else {
        throw error;
      }
    }
  }

  /**
   * Load tasks from the file
   * 
   * @returns Tasks loaded from the file
   */
  public async loadTasks(): Promise<Task[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as Task[];
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT' &&
        this.createIfNotExists
      ) {
        // File doesn't exist, return empty array
        return [];
      }
      
      throw error;
    }
  }
}

