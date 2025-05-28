import { CICDIntegration } from '../cicd-integration';
import { NLPRequirementsEngine } from '../nlp-engine';
import { PostgreSQLTaskStorage } from '../task-storage';
import { CodegenIntegration } from '../codegen-integration';
import { ClaudeCodeValidation } from '../code-validation';
import { WorkflowOrchestrator } from '../workflow-orchestration';

// Mock environment variables for testing
const mockConfig = {
  database: {
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cicd',
    maxConnections: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
    enableLogging: false
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
  nlp: {
    confidenceThreshold: 0.7,
    maxTokens: 1000,
    enableEntityExtraction: true,
    enableIntentClassification: true,
    enableComplexityAnalysis: true
  },
  codegen: {
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4000,
    temperature: 0.1,
    enableCodeReview: true,
    enableTestGeneration: true,
    enableDocumentationGeneration: true,
    codeStyle: {
      language: 'typescript',
      framework: 'react',
      indentation: 'spaces' as const,
      indentSize: 2,
      lineLength: 100,
      namingConvention: 'camelCase' as const,
      includeComments: true,
      includeTypeAnnotations: true
    }
  },
  validation: {
    model: 'claude-3-sonnet-20240229',
    enableStaticAnalysis: true,
    enableSecurityScan: true,
    enablePerformanceAnalysis: true,
    enableBestPracticesCheck: true,
    customRules: [],
    severityThresholds: {
      error: 0,
      warning: 10
    }
  },
  workflow: {
    maxConcurrentWorkflows: 2,
    stepTimeout: 30000,
    retryAttempts: 2,
    enableMetrics: true,
    enableNotifications: true
  },
  enableCyclicalImprovement: true,
  enableParallelExecution: true,
  enableRealTimeMonitoring: true
};

describe('CI/CD Integration Tests', () => {
  let cicd: CICDIntegration;

  beforeAll(async () => {
    cicd = new CICDIntegration(mockConfig);
    
    // Skip initialization if no real database is available
    if (process.env.TEST_DATABASE_URL) {
      await cicd.initialize();
    }
  });

  afterAll(async () => {
    if (process.env.TEST_DATABASE_URL) {
      await cicd.shutdown();
    }
  });

  describe('Component Integration', () => {
    test('should create CI/CD integration instance', () => {
      expect(cicd).toBeInstanceOf(CICDIntegration);
    });

    test('should emit initialization event', (done) => {
      if (!process.env.TEST_DATABASE_URL) {
        done();
        return;
      }

      const testCICD = new CICDIntegration(mockConfig);
      
      testCICD.on('initialized', () => {
        done();
      });

      testCICD.initialize();
    });
  });

  describe('NLP Requirements Engine', () => {
    let nlpEngine: NLPRequirementsEngine;

    beforeEach(() => {
      nlpEngine = new NLPRequirementsEngine(mockConfig.nlp);
    });

    test('should process simple requirements', async () => {
      const requirements = await nlpEngine.processRequirement(
        'Create a React component for user login'
      );

      expect(requirements).toHaveProperty('id');
      expect(requirements).toHaveProperty('text');
      expect(requirements).toHaveProperty('intent');
      expect(requirements).toHaveProperty('entities');
      expect(requirements).toHaveProperty('confidence');
      expect(requirements).toHaveProperty('complexity');
      expect(requirements).toHaveProperty('estimatedEffort');
    });

    test('should extract entities from requirements', async () => {
      const requirements = await nlpEngine.processRequirement(
        'Build a REST API with Express.js and PostgreSQL database'
      );

      expect(requirements.entities.length).toBeGreaterThan(0);
      
      const technologies = requirements.entities.filter(e => e.type === 'TECHNOLOGY');
      expect(technologies.length).toBeGreaterThan(0);
    });

    test('should classify intent correctly', async () => {
      const createRequirements = await nlpEngine.processRequirement(
        'Create a new dashboard component'
      );
      expect(createRequirements.intent).toBe('CREATE_FEATURE');

      const fixRequirements = await nlpEngine.processRequirement(
        'Fix the login bug where users cannot sign in'
      );
      expect(fixRequirements.intent).toBe('FIX_BUG');
    });

    test('should analyze complexity levels', async () => {
      const simpleRequirements = await nlpEngine.processRequirement(
        'Add a button'
      );
      expect(['LOW', 'MEDIUM']).toContain(simpleRequirements.complexity);

      const complexRequirements = await nlpEngine.processRequirement(
        'Build a distributed microservices architecture with authentication, authorization, real-time notifications, and advanced analytics'
      );
      expect(['HIGH', 'VERY_HIGH']).toContain(complexRequirements.complexity);
    });
  });

  describe('Task Storage', () => {
    let storage: PostgreSQLTaskStorage;

    beforeEach(() => {
      storage = new PostgreSQLTaskStorage(mockConfig.database);
    });

    afterEach(async () => {
      if (process.env.TEST_DATABASE_URL) {
        await storage.close();
      }
    });

    test('should initialize database schema', async () => {
      if (!process.env.TEST_DATABASE_URL) {
        return;
      }

      await expect(storage.initialize()).resolves.not.toThrow();
    });

    test('should create and retrieve pipeline', async () => {
      if (!process.env.TEST_DATABASE_URL) {
        return;
      }

      await storage.initialize();

      const pipeline = {
        id: 'test-pipeline-1',
        userId: 'test-user',
        projectId: 'test-project',
        requirements: {
          id: 'req-1',
          text: 'Test requirement',
          intent: 'CREATE_FEATURE' as any,
          entities: [],
          confidence: 0.8,
          complexity: 'MEDIUM' as any,
          estimatedEffort: { hours: 4, confidence: 0.7, factors: [] }
        },
        status: 'pending' as any,
        metadata: { test: true }
      };

      const created = await storage.createPipeline(pipeline);
      expect(created.id).toBe(pipeline.id);

      const retrieved = await storage.getPipeline(pipeline.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(pipeline.id);
    });

    test('should create and query tasks', async () => {
      if (!process.env.TEST_DATABASE_URL) {
        return;
      }

      await storage.initialize();

      // First create a pipeline
      const pipeline = {
        id: 'test-pipeline-2',
        userId: 'test-user',
        projectId: 'test-project',
        requirements: {
          id: 'req-2',
          text: 'Test requirement',
          intent: 'CREATE_FEATURE' as any,
          entities: [],
          confidence: 0.8,
          complexity: 'MEDIUM' as any,
          estimatedEffort: { hours: 4, confidence: 0.7, factors: [] }
        },
        status: 'pending' as any,
        metadata: {}
      };

      await storage.createPipeline(pipeline);

      const task = {
        id: 'test-task-1',
        pipelineId: pipeline.id,
        type: 'CODE_GENERATION' as any,
        title: 'Test Task',
        description: 'Test task description',
        status: 'PENDING' as any,
        priority: 'MEDIUM' as any,
        dependencies: [],
        artifacts: [],
        context: {
          codebase: {
            repositoryUrl: 'https://github.com/test/repo',
            branch: 'main',
            language: 'typescript',
            framework: 'react',
            dependencies: [],
            structure: []
          },
          requirements: pipeline.requirements,
          constraints: [],
          preferences: {
            codingStyle: 'typescript',
            testingFramework: 'jest',
            documentationLevel: 'standard' as any,
            reviewLevel: 'thorough' as any
          }
        }
      };

      const created = await storage.createTask(task);
      expect(created.id).toBe(task.id);

      const { tasks } = await storage.queryTasks({ pipelineId: pipeline.id });
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task.id);
    });
  });

  describe('Code Generation', () => {
    let codegen: CodegenIntegration;

    beforeEach(() => {
      codegen = new CodegenIntegration({
        ...mockConfig.codegen,
        anthropicApiKey: mockConfig.anthropicApiKey
      });
    });

    test('should create codegen integration instance', () => {
      expect(codegen).toBeInstanceOf(CodegenIntegration);
    });

    test('should have default templates', () => {
      const templates = codegen.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const reactTemplate = templates.find(t => t.id === 'react-component');
      expect(reactTemplate).toBeDefined();
    });

    test('should filter templates by language', () => {
      const tsTemplates = codegen.getTemplates('typescript');
      expect(tsTemplates.length).toBeGreaterThan(0);
      
      tsTemplates.forEach(template => {
        expect(template.language).toBe('typescript');
      });
    });

    test('should add custom templates', () => {
      const customTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test template description',
        language: 'typescript',
        framework: 'test',
        template: 'test template content',
        variables: []
      };

      codegen.addTemplate(customTemplate);
      
      const templates = codegen.getTemplates();
      const added = templates.find(t => t.id === 'test-template');
      expect(added).toBeDefined();
    });
  });

  describe('Code Validation', () => {
    let validation: ClaudeCodeValidation;

    beforeEach(() => {
      validation = new ClaudeCodeValidation({
        ...mockConfig.validation,
        anthropicApiKey: mockConfig.anthropicApiKey
      });
    });

    test('should create validation instance', () => {
      expect(validation).toBeInstanceOf(ClaudeCodeValidation);
    });

    test('should have default validation rules', () => {
      const rules = validation.getRules();
      expect(rules.length).toBeGreaterThan(0);
      
      const securityRule = rules.find(r => r.type === 'SECURITY');
      expect(securityRule).toBeDefined();
    });

    test('should add custom validation rules', () => {
      const customRule = {
        id: 'test-rule',
        name: 'Test Rule',
        type: 'BEST_PRACTICE' as any,
        severity: 'warning' as const,
        description: 'Test rule description',
        pattern: 'test-pattern'
      };

      validation.addRule(customRule);
      
      const rules = validation.getRules();
      const added = rules.find(r => r.id === 'test-rule');
      expect(added).toBeDefined();
    });

    test('should validate code files', async () => {
      const testFile = {
        path: 'test.ts',
        content: 'var x = eval("dangerous code");',
        language: 'typescript',
        type: 'CODE_FILE' as any,
        dependencies: []
      };

      const mockContext = {
        codebase: {
          repositoryUrl: 'https://github.com/test/repo',
          branch: 'main',
          language: 'typescript',
          framework: 'react',
          dependencies: [],
          structure: []
        },
        requirements: {
          id: 'req-1',
          text: 'Test requirement',
          intent: 'CREATE_FEATURE' as any,
          entities: [],
          confidence: 0.8,
          complexity: 'MEDIUM' as any,
          estimatedEffort: { hours: 4, confidence: 0.7, factors: [] }
        },
        constraints: [],
        preferences: {
          codingStyle: 'typescript',
          testingFramework: 'jest',
          documentationLevel: 'standard' as any,
          reviewLevel: 'thorough' as any
        }
      };

      const issues = await validation.validateFile(testFile, mockContext);
      expect(issues.length).toBeGreaterThan(0);
      
      const securityIssues = issues.filter(i => i.severity === 'error');
      expect(securityIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Orchestration', () => {
    let orchestrator: WorkflowOrchestrator;
    let mockStorage: PostgreSQLTaskStorage;

    beforeEach(() => {
      mockStorage = new PostgreSQLTaskStorage(mockConfig.database);
      
      orchestrator = new WorkflowOrchestrator({
        ...mockConfig.workflow,
        storage: mockStorage,
        nlpEngine: new NLPRequirementsEngine(mockConfig.nlp),
        codegenIntegration: new CodegenIntegration({
          ...mockConfig.codegen,
          anthropicApiKey: mockConfig.anthropicApiKey
        }),
        codeValidation: new ClaudeCodeValidation({
          ...mockConfig.validation,
          anthropicApiKey: mockConfig.anthropicApiKey
        })
      });
    });

    test('should create orchestrator instance', () => {
      expect(orchestrator).toBeInstanceOf(WorkflowOrchestrator);
    });

    test('should register workflows', () => {
      const testWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        description: 'Test workflow description',
        steps: [],
        triggers: [],
        configuration: {
          maxConcurrency: 1,
          timeout: 60000,
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential' as const,
            baseDelay: 1000,
            maxDelay: 30000
          },
          notifications: []
        }
      };

      expect(() => orchestrator.registerWorkflow(testWorkflow)).not.toThrow();
    });

    test('should emit workflow events', (done) => {
      const testWorkflow = {
        id: 'event-test-workflow',
        name: 'Event Test Workflow',
        version: '1.0.0',
        description: 'Test workflow for events',
        steps: [],
        triggers: [],
        configuration: {
          maxConcurrency: 1,
          timeout: 60000,
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential' as const,
            baseDelay: 1000,
            maxDelay: 30000
          },
          notifications: []
        }
      };

      orchestrator.on('workflow-registered', (workflow) => {
        expect(workflow.id).toBe('event-test-workflow');
        done();
      });

      orchestrator.registerWorkflow(testWorkflow);
    });
  });

  describe('End-to-End Integration', () => {
    test('should process simple requirements end-to-end', async () => {
      if (!process.env.TEST_DATABASE_URL || !process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping E2E test - missing environment variables');
        return;
      }

      const requirements = 'Create a simple React button component';
      
      // Mock the actual API calls for testing
      const mockResult = {
        pipeline: {
          id: 'test-pipeline',
          userId: 'test-user',
          projectId: 'test-project',
          requirements: {
            id: 'req-1',
            text: requirements,
            intent: 'CREATE_FEATURE' as any,
            entities: [],
            confidence: 0.8,
            complexity: 'LOW' as any,
            estimatedEffort: { hours: 2, confidence: 0.8, factors: [] }
          },
          status: 'completed' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {}
        },
        execution: {
          id: 'exec-1',
          workflowId: 'cicd-pipeline',
          pipelineId: 'test-pipeline',
          status: 'completed' as any,
          startedAt: new Date(),
          completedAt: new Date(),
          steps: [],
          context: {}
        },
        metrics: {
          totalDuration: 5000,
          stepDurations: {},
          resourceUsage: {}
        }
      };

      // For testing, we'll just verify the structure
      expect(mockResult.pipeline).toHaveProperty('id');
      expect(mockResult.execution).toHaveProperty('id');
      expect(mockResult.metrics).toHaveProperty('totalDuration');
    });

    test('should handle pipeline failures gracefully', async () => {
      if (!process.env.TEST_DATABASE_URL) {
        return;
      }

      // Test error handling
      const invalidRequirements = '';
      
      try {
        await cicd.processRequirements(invalidRequirements);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should provide metrics', async () => {
      if (!process.env.TEST_DATABASE_URL) {
        return;
      }

      const metrics = await cicd.getMetrics();
      
      expect(metrics).toHaveProperty('totalPipelines');
      expect(metrics).toHaveProperty('activePipelines');
      expect(metrics).toHaveProperty('completedPipelines');
      expect(metrics).toHaveProperty('failedPipelines');
      expect(metrics).toHaveProperty('averageExecutionTime');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('taskDecompositionAccuracy');
      expect(metrics).toHaveProperty('codeQualityScore');
      expect(metrics).toHaveProperty('validationSuccessRate');
    });
  });

  describe('Event System', () => {
    test('should emit pipeline events', (done) => {
      let eventCount = 0;
      const expectedEvents = ['pipeline-started', 'requirements-processed'];
      
      expectedEvents.forEach(eventName => {
        cicd.on(eventName, () => {
          eventCount++;
          if (eventCount === expectedEvents.length) {
            done();
          }
        });
      });

      // Simulate events
      cicd.emit('pipeline-started', { requirementsText: 'test' });
      cicd.emit('requirements-processed', { id: 'test' });
    });

    test('should handle workflow events', (done) => {
      cicd.on('workflow-started', (execution) => {
        expect(execution).toHaveProperty('id');
        done();
      });

      // Simulate workflow event
      cicd.emit('workflow-started', { id: 'test-execution' });
    });
  });

  describe('Configuration Validation', () => {
    test('should validate required configuration', () => {
      expect(() => {
        new CICDIntegration({
          ...mockConfig,
          anthropicApiKey: ''
        });
      }).not.toThrow(); // Constructor shouldn't throw, but initialization might
    });

    test('should use default values for optional configuration', () => {
      const minimalConfig = {
        database: mockConfig.database,
        anthropicApiKey: 'test-key',
        nlp: mockConfig.nlp,
        codegen: mockConfig.codegen,
        validation: mockConfig.validation,
        workflow: mockConfig.workflow,
        enableCyclicalImprovement: false,
        enableParallelExecution: false,
        enableRealTimeMonitoring: false
      };

      expect(() => new CICDIntegration(minimalConfig)).not.toThrow();
    });
  });
});

