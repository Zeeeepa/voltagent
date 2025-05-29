import { PRAnalysisOrchestrator } from '../orchestration/orchestrator'
import { createDefaultConfig } from '../config'
import { Logger } from '../utils/logger'

describe('PRAnalysisOrchestrator', () => {
  let orchestrator: PRAnalysisOrchestrator
  let logger: Logger

  beforeEach(() => {
    const config = createDefaultConfig()
    logger = new Logger('test', config.logging)
    orchestrator = new PRAnalysisOrchestrator(config, logger)
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(orchestrator.initialize()).resolves.not.toThrow()
    })

    it('should be healthy after initialization', async () => {
      await orchestrator.initialize()
      expect(await orchestrator.isHealthy()).toBe(true)
    })
  })

  describe('PR analysis', () => {
    const mockPR = {
      id: 123,
      number: 123,
      title: 'Test PR',
      author: 'test-user',
      repository: {
        name: 'test-repo',
        owner: 'test-owner',
        fullName: 'test-owner/test-repo'
      },
      baseBranch: 'main',
      headBranch: 'feature-branch',
      files: []
    }

    it('should analyze PR successfully', async () => {
      await orchestrator.initialize()
      const workflowId = await orchestrator.analyzePR(mockPR)
      expect(workflowId).toBeDefined()
      expect(typeof workflowId).toBe('string')
    })

    it('should handle analysis errors gracefully', async () => {
      await orchestrator.initialize()
      
      // Mock a PR that would cause an error
      const invalidPR = { ...mockPR, files: null as any }
      
      await expect(orchestrator.analyzePR(invalidPR)).rejects.toThrow()
    })
  })

  describe('system metrics', () => {
    it('should return system metrics', async () => {
      await orchestrator.initialize()
      const metrics = await orchestrator.getSystemMetrics()
      
      expect(metrics).toHaveProperty('totalAnalyses')
      expect(metrics).toHaveProperty('successRate')
      expect(metrics).toHaveProperty('averageAnalysisTime')
      expect(metrics).toHaveProperty('activeWorkflows')
    })
  })

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await orchestrator.initialize()
      await expect(orchestrator.shutdown()).resolves.not.toThrow()
    })
  })
})

