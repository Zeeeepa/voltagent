import express from 'express'
import { PRAnalysisOrchestrator } from './orchestration/orchestrator'
import { GitHubWebhookHandler } from './webhooks/github-webhook'
import { Logger } from './utils/logger'
import { PRAnalysisConfig } from './types'

/**
 * PR Analysis Server
 * 
 * Main entry point for the PR Analysis & CI/CD Automation System.
 * Handles webhook events, orchestrates analysis, and manages integrations.
 */
export class PRAnalysisServer {
  private app: express.Application
  private orchestrator: PRAnalysisOrchestrator
  private webhookHandler: GitHubWebhookHandler
  private logger: Logger
  private config: PRAnalysisConfig

  constructor(config: PRAnalysisConfig) {
    this.config = config
    this.app = express()
    this.logger = new Logger('PRAnalysisServer', config.logging)
    
    this.setupMiddleware()
    this.initializeComponents()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(express.json())
    this.app.use(express.raw({ type: 'application/json' }))
    
    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      })
      next()
    })
  }

  private initializeComponents(): void {
    // Initialize orchestrator
    this.orchestrator = new PRAnalysisOrchestrator(this.config, this.logger)
    
    // Initialize webhook handler
    this.webhookHandler = new GitHubWebhookHandler(
      this.config.github.webhookSecret,
      this.orchestrator
    )
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    })

    // GitHub webhook endpoint
    this.app.post('/webhooks/github', async (req, res) => {
      try {
        const signature = req.get('X-Hub-Signature-256')
        if (!signature) {
          return res.status(400).json({ error: 'Missing signature' })
        }

        await this.webhookHandler.handleWebhook(
          JSON.stringify(req.body),
          signature
        )

        res.status(200).json({ status: 'processed' })
      } catch (error) {
        this.logger.error('Webhook processing failed', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // Manual analysis trigger endpoint
    this.app.post('/analyze/:owner/:repo/:pr', async (req, res) => {
      try {
        const { owner, repo, pr } = req.params
        
        this.logger.info(`Manual analysis triggered for ${owner}/${repo}#${pr}`)
        
        // Mock PR data - would fetch from GitHub API
        const mockPR = {
          id: parseInt(pr),
          number: parseInt(pr),
          title: `PR #${pr}`,
          author: 'developer',
          repository: {
            name: repo,
            owner,
            fullName: `${owner}/${repo}`
          },
          baseBranch: 'main',
          headBranch: 'feature-branch',
          files: []
        }

        const workflowId = await this.orchestrator.analyzePR(mockPR)
        
        res.json({
          status: 'started',
          workflowId,
          message: `Analysis started for ${owner}/${repo}#${pr}`
        })
      } catch (error) {
        this.logger.error('Manual analysis failed', error)
        res.status(500).json({ error: 'Analysis failed' })
      }
    })

    // Workflow status endpoint
    this.app.get('/workflow/:id', async (req, res) => {
      try {
        const { id } = req.params
        
        // Mock workflow status - would query database
        res.json({
          id,
          status: 'running',
          progress: 65,
          startedAt: new Date().toISOString(),
          estimatedCompletion: new Date(Date.now() + 120000).toISOString()
        })
      } catch (error) {
        this.logger.error('Workflow status query failed', error)
        res.status(500).json({ error: 'Query failed' })
      }
    })

    // System metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await this.orchestrator.getSystemMetrics()
        res.json(metrics)
      } catch (error) {
        this.logger.error('Metrics query failed', error)
        res.status(500).json({ error: 'Metrics unavailable' })
      }
    })

    // Configuration endpoint
    this.app.get('/config', (req, res) => {
      // Return sanitized config (no secrets)
      res.json({
        analysis: {
          enabledModules: this.config.analysis.enabledModules,
          timeoutMs: this.config.analysis.timeoutMs,
          maxConcurrentAnalyses: this.config.analysis.maxConcurrentAnalyses
        },
        performance: this.config.performance,
        features: this.config.features
      })
    })

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      })
    })
  }

  async start(): Promise<void> {
    try {
      // Initialize orchestrator
      await this.orchestrator.initialize()
      
      // Start server
      const port = this.config.server?.port || 3000
      
      this.app.listen(port, () => {
        this.logger.info(`PR Analysis Server started on port ${port}`)
        this.logger.info('System ready for PR analysis')
      })
      
    } catch (error) {
      this.logger.error('Failed to start server', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    try {
      await this.orchestrator.shutdown()
      this.logger.info('PR Analysis Server stopped')
    } catch (error) {
      this.logger.error('Error during shutdown', error)
      throw error
    }
  }
}

// CLI entry point
if (require.main === module) {
  const config: PRAnalysisConfig = {
    analysis: {
      enabledModules: ['all'],
      timeoutMs: 300000,
      maxConcurrentAnalyses: 5
    },
    github: {
      token: process.env.GITHUB_TOKEN || '',
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'dev-secret'
    },
    linear: {
      apiKey: process.env.LINEAR_API_KEY || '',
      teamId: process.env.LINEAR_TEAM_ID || ''
    },
    agentapi: {
      baseUrl: process.env.AGENTAPI_BASE_URL || 'http://localhost:8080',
      apiKey: process.env.AGENTAPI_KEY || '',
      timeout: 300000,
      maxRetries: 3
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'pr_analysis',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: 'json'
    },
    performance: {
      maxAnalysisTimeMs: 300000,
      maxMemoryUsageMB: 1024,
      enableCaching: true
    },
    features: {
      autoFix: true,
      linearIntegration: true,
      agentapiIntegration: true,
      webhookValidation: true
    }
  }

  const server = new PRAnalysisServer(config)
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  // Start server
  server.start().catch(error => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

