import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ClaudeCodeValidator } from '../validation/service.js';
import { AgentAPIClient } from '../agentapi/client.js';
import { WSL2Manager } from '../wsl2/manager.js';

// Mock dependencies
jest.mock('../agentapi/client.js');
jest.mock('../wsl2/manager.js');
jest.mock('../database/connection.js');

const MockedAgentAPIClient = AgentAPIClient as jest.MockedClass<typeof AgentAPIClient>;
const MockedWSL2Manager = WSL2Manager as jest.MockedClass<typeof WSL2Manager>;

describe('ClaudeCodeValidator', () => {
  let validator: ClaudeCodeValidator;
  let mockAgentApiClient: jest.Mocked<AgentAPIClient>;
  let mockWSL2Manager: jest.Mocked<WSL2Manager>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockAgentApiClient = new MockedAgentAPIClient() as jest.Mocked<AgentAPIClient>;
    mockWSL2Manager = new MockedWSL2Manager() as jest.Mocked<WSL2Manager>;

    // Create validator instance
    validator = new ClaudeCodeValidator({
      agentapiUrl: 'http://localhost:8000',
      apiKey: 'test-key',
    });

    // Replace internal instances with mocks
    (validator as any).agentApiClient = mockAgentApiClient;
    (validator as any).wsl2Manager = mockWSL2Manager;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validatePR', () => {
    it('should start PR validation successfully', async () => {
      // Arrange
      const prInfo = {
        url: 'https://github.com/test/repo.git',
        number: 123,
        branchName: 'feature/test',
        repository: 'repo',
        owner: 'test',
      };

      const taskContext = {
        taskId: 'task-123',
        title: 'Test validation',
        priority: 1,
      };

      const mockSession = {
        id: 'session-123',
        taskId: 'task-123',
        prInfo,
        status: 'pending' as const,
        startedAt: new Date(),
        metadata: {},
      };

      // Mock database operations
      const mockDb = {
        query: jest.fn().mockResolvedValue({ rows: [mockSession] }),
      };
      jest.doMock('../database/connection.js', () => ({ db: mockDb }));

      // Act
      const result = await validator.validatePR(prInfo, taskContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('session-123');
      expect(result.status).toBe('pending');
      expect(result.prInfo).toEqual(prInfo);
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const prInfo = {
        url: 'invalid-url',
        number: 123,
        branchName: 'feature/test',
        repository: 'repo',
        owner: 'test',
      };

      const taskContext = {
        taskId: 'task-123',
        title: 'Test validation',
        priority: 1,
      };

      // Mock database error
      const mockDb = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      jest.doMock('../database/connection.js', () => ({ db: mockDb }));

      // Act & Assert
      await expect(validator.validatePR(prInfo, taskContext)).rejects.toThrow('Database error');
    });
  });

  describe('deployPRToEnvironment', () => {
    it('should deploy PR to WSL2 environment successfully', async () => {
      // Arrange
      const prUrl = 'https://github.com/test/repo.git';
      const branchName = 'feature/test';

      const mockInstance = {
        id: 'instance-123',
        instanceName: 'test-instance',
        projectId: 'project-123',
        status: 'running' as const,
        distro: 'Ubuntu-22.04',
        basePath: '/mnt/c/projects',
        resourceLimits: { memory: '8GB', processors: 4, swap: '2GB' },
        createdAt: new Date(),
        lastUsedAt: new Date(),
        metadata: {},
      };

      const mockDeploymentResult = {
        success: true,
        deploymentPath: '/home/ubuntu/projects/feature-test',
        instanceName: 'test-instance',
        logs: ['✓ git clone: success', '✓ npm install: success'],
      };

      mockWSL2Manager.createInstance.mockResolvedValue(mockInstance);
      mockWSL2Manager.deployPRToInstance.mockResolvedValue(mockDeploymentResult);

      // Act
      const result = await validator.deployPRToEnvironment(prUrl, branchName);

      // Assert
      expect(result).toEqual(mockDeploymentResult);
      expect(mockWSL2Manager.createInstance).toHaveBeenCalledWith(
        expect.stringMatching(/^pr-\d+$/),
        undefined
      );
      expect(mockWSL2Manager.deployPRToInstance).toHaveBeenCalledWith(
        'test-instance',
        prUrl,
        branchName
      );
    });

    it('should handle deployment failures', async () => {
      // Arrange
      const prUrl = 'https://github.com/test/repo.git';
      const branchName = 'feature/test';

      mockWSL2Manager.createInstance.mockRejectedValue(new Error('WSL2 creation failed'));

      // Act & Assert
      await expect(validator.deployPRToEnvironment(prUrl, branchName)).rejects.toThrow(
        'WSL2 creation failed'
      );
    });
  });

  describe('runCodeAnalysis', () => {
    it('should run code analysis successfully', async () => {
      // Arrange
      const deploymentPath = '/home/ubuntu/projects/test';
      const analysisOptions = {
        includeMetrics: true,
        includeSecurity: true,
      };

      const mockAnalysisResult = {
        metrics: {
          linesOfCode: 1000,
          cyclomaticComplexity: 10,
          maintainabilityIndex: 80,
          technicalDebt: 1.5,
        },
        security: {
          vulnerabilities: [],
          riskScore: 5,
        },
        performance: {
          issues: [],
          score: 90,
        },
        testCoverage: {
          percentage: 85,
          uncoveredLines: [],
          missingTests: [],
        },
      };

      mockAgentApiClient.analyzeCode.mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await validator.runCodeAnalysis(deploymentPath, analysisOptions);

      // Assert
      expect(result).toEqual(mockAnalysisResult);
      expect(mockAgentApiClient.analyzeCode).toHaveBeenCalledWith(
        deploymentPath,
        analysisOptions
      );
    });

    it('should handle analysis failures', async () => {
      // Arrange
      const deploymentPath = '/home/ubuntu/projects/test';

      mockAgentApiClient.analyzeCode.mockRejectedValue(new Error('Analysis failed'));

      // Act & Assert
      await expect(validator.runCodeAnalysis(deploymentPath)).rejects.toThrow('Analysis failed');
    });
  });

  describe('getValidationResults', () => {
    it('should retrieve validation results for a task', async () => {
      // Arrange
      const taskId = 'task-123';
      const mockResults = [
        {
          id: 'session-1',
          taskId,
          status: 'completed',
          overallScore: 85,
          grade: 'B+',
        },
        {
          id: 'session-2',
          taskId,
          status: 'completed',
          overallScore: 92,
          grade: 'A-',
        },
      ];

      const mockDb = {
        query: jest.fn().mockResolvedValue({ rows: mockResults }),
      };
      jest.doMock('../database/connection.js', () => ({ db: mockDb }));

      // Act
      const results = await validator.getValidationResults(taskId);

      // Assert
      expect(results).toEqual(mockResults);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM validation_sessions'),
        [taskId]
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all components are working', async () => {
      // Arrange
      mockAgentApiClient.testConnection.mockResolvedValue(true);
      mockWSL2Manager.healthCheck.mockResolvedValue({
        available: true,
        version: 'WSL 2.0',
        activeInstances: 2,
      });

      const mockDb = {
        healthCheck: jest.fn().mockResolvedValue(true),
      };
      jest.doMock('../database/connection.js', () => ({ db: mockDb }));

      // Mock getValidationMetrics
      jest.spyOn(validator, 'getValidationMetrics').mockResolvedValue({
        totalSessions: 100,
        successfulSessions: 95,
        failedSessions: 5,
        averageValidationTime: 120000,
        averageScore: 85.5,
        activeInstances: 2,
      });

      // Act
      const health = await validator.healthCheck();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.components.agentapi).toBe(true);
      expect(health.components.wsl2).toBe(true);
      expect(health.components.database).toBe(true);
    });

    it('should return degraded status when some components are failing', async () => {
      // Arrange
      mockAgentApiClient.testConnection.mockResolvedValue(false);
      mockWSL2Manager.healthCheck.mockResolvedValue({
        available: true,
        version: 'WSL 2.0',
        activeInstances: 2,
      });

      const mockDb = {
        healthCheck: jest.fn().mockResolvedValue(true),
      };
      jest.doMock('../database/connection.js', () => ({ db: mockDb }));

      // Mock getValidationMetrics
      jest.spyOn(validator, 'getValidationMetrics').mockResolvedValue({
        totalSessions: 100,
        successfulSessions: 95,
        failedSessions: 5,
        averageValidationTime: 120000,
        averageScore: 85.5,
        activeInstances: 2,
      });

      // Act
      const health = await validator.healthCheck();

      // Assert
      expect(health.status).toBe('degraded');
      expect(health.components.agentapi).toBe(false);
      expect(health.components.wsl2).toBe(true);
      expect(health.components.database).toBe(true);
    });
  });
});

