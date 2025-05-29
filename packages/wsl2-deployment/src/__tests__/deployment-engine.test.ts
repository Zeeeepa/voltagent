import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WSL2DeploymentEngine } from '../integrations/wsl2/deployment-engine';
import { WSL2Config, DeploymentRequest } from '../types';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('WSL2DeploymentEngine', () => {
  let engine: WSL2DeploymentEngine;
  let mockConfig: WSL2Config;

  beforeEach(() => {
    mockConfig = {
      instancePool: {
        minInstances: 1,
        maxInstances: 3,
        instanceTimeout: 3600000
      },
      deployment: {
        timeout: 1800000,
        retries: 3,
        parallelDeployments: 2
      },
      environment: {
        nodeVersion: '18.x',
        pythonVersion: '3.9',
        dockerEnabled: true
      },
      monitoring: {
        healthCheckInterval: 30000,
        resourceCheckInterval: 60000,
        alertThresholds: {
          cpu: 80,
          memory: 85,
          disk: 90
        }
      },
      ssh: {
        host: 'localhost',
        port: 22,
        user: 'deploy',
        keyPath: '/home/deploy/.ssh/id_rsa'
      }
    };

    // Mock the exec function to simulate successful commands
    const { exec } = require('child_process');
    exec.mockImplementation((command: string, options: any, callback: Function) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      // Simulate successful command execution
      setTimeout(() => {
        callback(null, { stdout: 'success', stderr: '' });
      }, 10);
    });
  });

  afterEach(async () => {
    if (engine) {
      await engine.shutdown();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create engine with valid configuration', () => {
      expect(() => {
        engine = new WSL2DeploymentEngine(mockConfig);
      }).not.toThrow();
    });

    it('should emit pool.initialized event after initialization', (done) => {
      engine = new WSL2DeploymentEngine(mockConfig);
      
      engine.on('pool.initialized', (data) => {
        expect(data.instanceCount).toBeGreaterThanOrEqual(mockConfig.instancePool.minInstances);
        done();
      });
    });
  });

  describe('Instance Management', () => {
    beforeEach(() => {
      engine = new WSL2DeploymentEngine(mockConfig);
    });

    it('should create minimum required instances', async () => {
      // Wait for initialization
      await new Promise(resolve => {
        engine.on('pool.initialized', resolve);
      });

      const instances = engine.getInstances();
      expect(instances.length).toBeGreaterThanOrEqual(mockConfig.instancePool.minInstances);
    });

    it('should emit instance.created event when instance is created', (done) => {
      engine.on('instance.created', (data) => {
        expect(data.instance).toBeDefined();
        expect(data.instance.id).toBeDefined();
        expect(data.instance.name).toBeDefined();
        expect(data.instance.status).toBe('running');
        done();
      });
    });

    it('should get instance health', async () => {
      await new Promise(resolve => {
        engine.on('pool.initialized', resolve);
      });

      const instances = engine.getInstances();
      if (instances.length > 0) {
        const health = await engine.getInstanceHealth(instances[0].id);
        expect(health).toBeDefined();
        expect(health?.instanceId).toBe(instances[0].id);
      }
    });
  });

  describe('Deployment Operations', () => {
    beforeEach(async () => {
      engine = new WSL2DeploymentEngine(mockConfig);
      
      // Wait for initialization
      await new Promise(resolve => {
        engine.on('pool.initialized', resolve);
      });
    });

    it('should accept deployment request and return deployment ID', async () => {
      const request: DeploymentRequest = {
        id: 'test-deployment-1',
        repository: {
          url: 'https://github.com/test/repo.git',
          branch: 'main'
        },
        environment: {
          NODE_ENV: 'test'
        },
        validationSteps: [
          {
            name: 'Install dependencies',
            command: 'npm install'
          },
          {
            name: 'Run tests',
            command: 'npm test'
          }
        ],
        priority: 'normal'
      };

      const deploymentId = await engine.deploy(request);
      expect(deploymentId).toBeDefined();
      expect(typeof deploymentId).toBe('string');
    });

    it('should emit deployment.started event', (done) => {
      const request: DeploymentRequest = {
        id: 'test-deployment-2',
        repository: {
          url: 'https://github.com/test/repo.git',
          branch: 'main'
        },
        environment: {},
        validationSteps: [],
        priority: 'normal'
      };

      engine.on('deployment.started', (data) => {
        expect(data.deployment).toBeDefined();
        expect(data.instance).toBeDefined();
        done();
      });

      engine.deploy(request);
    });

    it('should get deployment status', async () => {
      const request: DeploymentRequest = {
        id: 'test-deployment-3',
        repository: {
          url: 'https://github.com/test/repo.git',
          branch: 'main'
        },
        environment: {},
        validationSteps: [],
        priority: 'normal'
      };

      const deploymentId = await engine.deploy(request);
      const status = engine.getDeploymentStatus(deploymentId);
      
      expect(status).toBeDefined();
      expect(status?.id).toBe(deploymentId);
    });

    it('should handle deployment priority queue', async () => {
      const lowPriorityRequest: DeploymentRequest = {
        id: 'low-priority',
        repository: {
          url: 'https://github.com/test/repo.git',
          branch: 'main'
        },
        environment: {},
        validationSteps: [],
        priority: 'low'
      };

      const highPriorityRequest: DeploymentRequest = {
        id: 'high-priority',
        repository: {
          url: 'https://github.com/test/repo.git',
          branch: 'main'
        },
        environment: {},
        validationSteps: [],
        priority: 'high'
      };

      const deploymentEvents: any[] = [];
      
      engine.on('deployment.started', (data) => {
        deploymentEvents.push(data);
      });

      // Deploy low priority first, then high priority
      await engine.deploy(lowPriorityRequest);
      await engine.deploy(highPriorityRequest);

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // High priority should be processed first (if both are queued)
      // This test might need adjustment based on actual implementation timing
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      engine = new WSL2DeploymentEngine(mockConfig);
    });

    it('should emit health.check events during monitoring', (done) => {
      engine.on('health.check', (healthCheck) => {
        expect(healthCheck.instanceId).toBeDefined();
        expect(healthCheck.timestamp).toBeInstanceOf(Date);
        expect(healthCheck.status).toMatch(/healthy|unhealthy|unknown/);
        done();
      });
    });

    it('should emit resource.alert when thresholds are exceeded', (done) => {
      engine.on('resource.alert', (alert) => {
        expect(alert.instanceId).toBeDefined();
        expect(alert.usage).toBeDefined();
        done();
      });

      // This would need to be triggered by actual high resource usage
      // For testing, we might need to mock the resource monitoring
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      engine = new WSL2DeploymentEngine(mockConfig);
    });

    it('should handle instance creation failures', (done) => {
      // Mock exec to fail
      const { exec } = require('child_process');
      exec.mockImplementation((command: string, options: any, callback: Function) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(new Error('WSL command failed'));
      });

      engine.on('instance.error', (data) => {
        expect(data.instanceId).toBeDefined();
        expect(data.error).toBeDefined();
        done();
      });

      // Try to create a new engine which should fail
      new WSL2DeploymentEngine(mockConfig);
    });

    it('should handle deployment failures gracefully', async () => {
      await new Promise(resolve => {
        engine.on('pool.initialized', resolve);
      });

      const request: DeploymentRequest = {
        id: 'failing-deployment',
        repository: {
          url: 'https://invalid-repo-url',
          branch: 'main'
        },
        environment: {},
        validationSteps: [
          {
            name: 'Failing step',
            command: 'exit 1'
          }
        ],
        priority: 'normal'
      };

      const deploymentId = await engine.deploy(request);
      
      // Wait for deployment to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const status = engine.getDeploymentStatus(deploymentId);
      expect(status?.status).toMatch(/failed|error/);
    });
  });

  describe('Cleanup and Shutdown', () => {
    beforeEach(async () => {
      engine = new WSL2DeploymentEngine(mockConfig);
      
      await new Promise(resolve => {
        engine.on('pool.initialized', resolve);
      });
    });

    it('should shutdown gracefully', async () => {
      const shutdownPromise = new Promise(resolve => {
        engine.on('engine.shutdown', resolve);
      });

      await engine.shutdown();
      await shutdownPromise;
    });

    it('should stop all monitoring intervals on shutdown', async () => {
      const instances = engine.getInstances();
      expect(instances.length).toBeGreaterThan(0);

      await engine.shutdown();

      // Verify that no more health checks are emitted
      let healthCheckEmitted = false;
      engine.on('health.check', () => {
        healthCheckEmitted = true;
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(healthCheckEmitted).toBe(false);
    });
  });
});

