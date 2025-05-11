/**
 * execution-adapters.test.ts
 * 
 * Tests for the execution adapters
 */

import { createExecutionAdapter, LocalExecutionAdapter } from '../index';
import { ConsoleLogger } from '../../utils/logger';

describe('Execution Adapters', () => {
  describe('LocalExecutionAdapter', () => {
    let adapter: LocalExecutionAdapter;

    beforeEach(() => {
      adapter = new LocalExecutionAdapter({
        logger: new ConsoleLogger('error') // Suppress logs during tests
      });
    });

    test('should execute commands', async () => {
      const result = await adapter.executeCommand('test', 'echo "Hello, World!"');
      expect(result.stdout.trim()).toBe('Hello, World!');
      expect(result.exitCode).toBe(0);
    });

    test('should handle command errors', async () => {
      const result = await adapter.executeCommand('test', 'command-that-does-not-exist');
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBeTruthy();
    });

    test('should read files', async () => {
      // Create a temporary file
      await adapter.writeFile('test', '/tmp/voltagent-test.txt', 'Hello, World!');
      
      const result = await adapter.readFile('test', '/tmp/voltagent-test.txt');
      expect(result.success).toBe(true);
      expect(result.content).toContain('Hello, World!');
    });

    test('should handle non-existent files', async () => {
      const result = await adapter.readFile('test', '/tmp/file-that-does-not-exist.txt');
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('ExecutionAdapterFactory', () => {
    test('should create a local adapter by default', async () => {
      const { adapter, type } = await createExecutionAdapter({
        type: 'local',
        logger: new ConsoleLogger('error') // Suppress logs during tests
      });
      
      expect(type).toBe('local');
      
      const result = await adapter.executeCommand('test', 'echo "Hello, World!"');
      expect(result.stdout.trim()).toBe('Hello, World!');
    });

    test('should fall back to local adapter when Docker is not available', async () => {
      const { adapter, type } = await createExecutionAdapter({
        type: 'docker',
        autoFallback: true,
        logger: new ConsoleLogger('error'), // Suppress logs during tests
        docker: {
          projectRoot: '/tmp' // Invalid project root to force fallback
        }
      });
      
      expect(type).toBe('local');
      
      const result = await adapter.executeCommand('test', 'echo "Hello, World!"');
      expect(result.stdout.trim()).toBe('Hello, World!');
    });
  });
});

