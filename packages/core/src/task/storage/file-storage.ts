/**
 * File-based storage provider for tasks
 */

import fs from 'fs';
import path from 'path';
import { TasksData, TaskComplexityReport } from '../types';
import { TaskStorageProvider } from '../manager';

export interface FileStorageOptions {
  tasksFilePath: string;
  complexityReportPath?: string;
  createIfNotExists?: boolean;
  defaultProjectName?: string;
  defaultProjectVersion?: string;
}

/**
 * File-based storage provider for tasks
 */
export class FileTaskStorage implements TaskStorageProvider {
  private tasksFilePath: string;
  private complexityReportPath: string;
  private createIfNotExists: boolean;
  private defaultProjectName: string;
  private defaultProjectVersion: string;

  constructor(options: FileStorageOptions) {
    this.tasksFilePath = options.tasksFilePath;
    this.complexityReportPath = options.complexityReportPath || path.join(
      path.dirname(options.tasksFilePath),
      'task-complexity-report.json'
    );
    this.createIfNotExists = options.createIfNotExists ?? true;
    this.defaultProjectName = options.defaultProjectName || 'Project';
    this.defaultProjectVersion = options.defaultProjectVersion || '1.0.0';
  }

  /**
   * Get tasks from file
   */
  async getTasks(): Promise<TasksData> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.tasksFilePath)) {
        if (this.createIfNotExists) {
          // Create default tasks data
          const defaultTasksData: TasksData = {
            project: {
              name: this.defaultProjectName,
              version: this.defaultProjectVersion
            },
            tasks: [],
            lastUpdated: new Date().toISOString()
          };

          // Create directory if it doesn't exist
          const dir = path.dirname(this.tasksFilePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Write default tasks data to file
          fs.writeFileSync(
            this.tasksFilePath,
            JSON.stringify(defaultTasksData, null, 2)
          );

          return defaultTasksData;
        } else {
          throw new Error(`Tasks file not found at ${this.tasksFilePath}`);
        }
      }

      // Read and parse tasks file
      const tasksData = JSON.parse(
        fs.readFileSync(this.tasksFilePath, 'utf8')
      ) as TasksData;

      return tasksData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error reading tasks file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Save tasks to file
   */
  async saveTasks(tasksData: TasksData): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.tasksFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Update lastUpdated timestamp
      tasksData.lastUpdated = new Date().toISOString();

      // Write tasks data to file
      fs.writeFileSync(
        this.tasksFilePath,
        JSON.stringify(tasksData, null, 2)
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error saving tasks file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get complexity report from file
   */
  async getComplexityReport(): Promise<TaskComplexityReport | null> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.complexityReportPath)) {
        return null;
      }

      // Read and parse complexity report file
      const report = JSON.parse(
        fs.readFileSync(this.complexityReportPath, 'utf8')
      ) as TaskComplexityReport;

      return report;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error reading complexity report file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Save complexity report to file
   */
  async saveComplexityReport(report: TaskComplexityReport): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.complexityReportPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write complexity report to file
      fs.writeFileSync(
        this.complexityReportPath,
        JSON.stringify(report, null, 2)
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error saving complexity report file: ${error.message}`);
      }
      throw error;
    }
  }
}

