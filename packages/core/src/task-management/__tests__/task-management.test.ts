/**
 * Task Management System Tests
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  initializeProjectDirect, 
  addTaskDirect, 
  listTasksDirect 
} from '../core/task-master-core';

// Create a test logger
const testLogger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`)
};

describe('Task Management System', () => {
  let tempDir: string;
  let tasksJsonPath: string;

  beforeEach(() => {
    // Create a temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-management-test-'));
    tasksJsonPath = path.join(tempDir, 'tasks', 'tasks.json');
  });

  afterEach(() => {
    // Clean up the temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should initialize a project', async () => {
    const result = await initializeProjectDirect(
      { projectRoot: tempDir, tasksJsonPath },
      testLogger
    );

    expect(result.success).toBe(true);
    expect(result.data?.tasksJsonPath).toBe(tasksJsonPath);
    expect(fs.existsSync(tasksJsonPath)).toBe(true);

    // Check the content of the tasks.json file
    const tasksData = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf8'));
    expect(tasksData.tasks).toEqual([]);
    expect(tasksData.metadata.projectName).toBe(path.basename(tempDir));
  });

  test('should add a task manually', async () => {
    // Initialize the project first
    await initializeProjectDirect(
      { projectRoot: tempDir, tasksJsonPath },
      testLogger
    );

    // Add a task manually
    const addResult = await addTaskDirect(
      {
        tasksJsonPath,
        title: 'Test Task',
        description: 'This is a test task',
        details: 'Implementation details',
        priority: 'high'
      },
      testLogger
    );

    expect(addResult.success).toBe(true);
    expect(addResult.data?.taskId).toBe(1);

    // List tasks to verify
    const listResult = await listTasksDirect(
      { tasksJsonPath },
      testLogger
    );

    expect(listResult.success).toBe(true);
    expect(listResult.data?.tasks.length).toBe(1);
    expect(listResult.data?.tasks[0].title).toBe('Test Task');
    expect(listResult.data?.tasks[0].priority).toBe('high');
  });

  // Additional tests would be added for other functionality
});

