/**
 * File task storage tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileTaskStorage } from './file-storage';
import { TasksData, TaskComplexityReport } from '../types';

describe('FileTaskStorage', () => {
  let tempDir: string;
  let tasksFilePath: string;
  let complexityReportPath: string;
  let fileStorage: FileTaskStorage;

  beforeEach(() => {
    // Create a temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-task-storage-test-'));
    tasksFilePath = path.join(tempDir, 'tasks.json');
    complexityReportPath = path.join(tempDir, 'task-complexity-report.json');

    fileStorage = new FileTaskStorage({
      tasksFilePath,
      complexityReportPath,
      createIfNotExists: true,
      defaultProjectName: 'Test Project',
      defaultProjectVersion: '1.0.0'
    });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create default tasks file if it does not exist', async () => {
    const tasksData = await fileStorage.getTasks();

    expect(fs.existsSync(tasksFilePath)).toBe(true);
    expect(tasksData.project.name).toBe('Test Project');
    expect(tasksData.project.version).toBe('1.0.0');
    expect(tasksData.tasks).toEqual([]);
  });

  it('should save and retrieve tasks', async () => {
    const initialTasksData: TasksData = {
      project: {
        name: 'Test Project',
        version: '1.0.0'
      },
      tasks: [
        {
          id: 1,
          title: 'Test Task',
          description: 'Test Description',
          priority: 'medium',
          status: 'pending',
          dependencies: []
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    await fileStorage.saveTasks(initialTasksData);

    const retrievedTasksData = await fileStorage.getTasks();

    expect(retrievedTasksData.project.name).toBe('Test Project');
    expect(retrievedTasksData.tasks.length).toBe(1);
    expect(retrievedTasksData.tasks[0].title).toBe('Test Task');
  });

  it('should return null if complexity report does not exist', async () => {
    const report = await fileStorage.getComplexityReport();
    expect(report).toBeNull();
  });

  it('should save and retrieve complexity report', async () => {
    const initialReport: TaskComplexityReport = {
      tasksAnalyzed: 1,
      threshold: 5,
      generatedAt: new Date().toISOString(),
      tasks: [
        {
          taskId: 1,
          taskTitle: 'Test Task',
          complexityScore: 3,
          recommendedSubtasks: 2,
          expansionPrompt: 'Test prompt',
          reasoning: 'Test reasoning',
          expansionCommand: 'Test command'
        }
      ]
    };

    await fileStorage.saveComplexityReport(initialReport);

    const retrievedReport = await fileStorage.getComplexityReport();

    expect(retrievedReport).not.toBeNull();
    expect(retrievedReport?.tasksAnalyzed).toBe(1);
    expect(retrievedReport?.tasks.length).toBe(1);
    expect(retrievedReport?.tasks[0].taskTitle).toBe('Test Task');
  });

  it('should throw an error if tasks file cannot be read', async () => {
    // Create a file storage with createIfNotExists = false
    const nonExistentFileStorage = new FileTaskStorage({
      tasksFilePath: path.join(tempDir, 'non-existent.json'),
      createIfNotExists: false
    });

    await expect(nonExistentFileStorage.getTasks()).rejects.toThrow();
  });

  it('should create directory if it does not exist', async () => {
    const nestedDir = path.join(tempDir, 'nested', 'dir');
    const nestedFilePath = path.join(nestedDir, 'tasks.json');

    const nestedFileStorage = new FileTaskStorage({
      tasksFilePath: nestedFilePath,
      createIfNotExists: true
    });

    await nestedFileStorage.getTasks();

    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(fs.existsSync(nestedFilePath)).toBe(true);
  });

  it('should update lastUpdated timestamp when saving tasks', async () => {
    const initialTasksData: TasksData = {
      project: {
        name: 'Test Project',
        version: '1.0.0'
      },
      tasks: [],
      lastUpdated: '2023-01-01T00:00:00.000Z' // Old timestamp
    };

    await fileStorage.saveTasks(initialTasksData);

    const retrievedTasksData = await fileStorage.getTasks();

    // Check that lastUpdated was updated
    expect(retrievedTasksData.lastUpdated).not.toBe('2023-01-01T00:00:00.000Z');
    expect(new Date(retrievedTasksData.lastUpdated).getTime()).toBeGreaterThan(
      new Date('2023-01-01T00:00:00.000Z').getTime()
    );
  });

  it('should handle file system errors when saving tasks', async () => {
    // Mock fs.writeFileSync to throw an error
    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = vi.fn().mockImplementation(() => {
      throw new Error('Mock file system error');
    });

    try {
      await expect(fileStorage.saveTasks({
        project: { name: 'Test', version: '1.0.0' },
        tasks: [],
        lastUpdated: new Date().toISOString()
      })).rejects.toThrow('Error saving tasks file: Mock file system error');
    } finally {
      // Restore original function
      fs.writeFileSync = originalWriteFileSync;
    }
  });

  it('should handle file system errors when saving complexity report', async () => {
    // Mock fs.writeFileSync to throw an error
    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = vi.fn().mockImplementation(() => {
      throw new Error('Mock file system error');
    });

    try {
      await expect(fileStorage.saveComplexityReport({
        tasksAnalyzed: 1,
        threshold: 5,
        generatedAt: new Date().toISOString(),
        tasks: []
      })).rejects.toThrow('Error saving complexity report file: Mock file system error');
    } finally {
      // Restore original function
      fs.writeFileSync = originalWriteFileSync;
    }
  });
});

