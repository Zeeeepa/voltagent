import { PRAnalysisConfig } from './types'

/**
 * Create default configuration for PR analysis system
 */
export function createDefaultConfig(): PRAnalysisConfig {
  return {
    analysis: {
      enabledModules: ['all'],
      timeoutMs: 300000, // 5 minutes
      maxConcurrentAnalyses: 5
    },
    github: {
      token: process.env.GITHUB_TOKEN || '',
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || ''
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
    },
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0'
    }
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: PRAnalysisConfig): string[] {
  const errors: string[] = []

  // Required fields
  if (!config.github.token) {
    errors.push('GitHub token is required')
  }

  if (!config.github.webhookSecret) {
    errors.push('GitHub webhook secret is required')
  }

  if (config.features.linearIntegration) {
    if (!config.linear.apiKey) {
      errors.push('Linear API key is required when Linear integration is enabled')
    }
    if (!config.linear.teamId) {
      errors.push('Linear team ID is required when Linear integration is enabled')
    }
  }

  if (config.features.agentapiIntegration) {
    if (!config.agentapi.baseUrl) {
      errors.push('AgentAPI base URL is required when AgentAPI integration is enabled')
    }
    if (!config.agentapi.apiKey) {
      errors.push('AgentAPI key is required when AgentAPI integration is enabled')
    }
  }

  // Validation ranges
  if (config.analysis.timeoutMs < 10000) {
    errors.push('Analysis timeout must be at least 10 seconds')
  }

  if (config.analysis.maxConcurrentAnalyses < 1) {
    errors.push('Max concurrent analyses must be at least 1')
  }

  if (config.performance.maxAnalysisTimeMs < config.analysis.timeoutMs) {
    errors.push('Performance max analysis time must be >= analysis timeout')
  }

  return errors
}

