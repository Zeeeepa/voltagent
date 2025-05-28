import { ClaudeCodeConfig } from '../types/index.js';

export const DEFAULT_CONFIG: ClaudeCodeConfig = {
  agentapi: {
    url: process.env.AGENTAPI_URL || 'http://localhost:8000',
    apiKey: process.env.CLAUDE_CODE_API_KEY,
    timeout: parseInt(process.env.AGENTAPI_TIMEOUT || '300000'),
  },
  validation: {
    enableSecurityAnalysis: process.env.ENABLE_SECURITY_ANALYSIS === 'true',
    enablePerformanceAnalysis: process.env.ENABLE_PERFORMANCE_ANALYSIS === 'true',
    codeQualityWeight: parseFloat(process.env.CODE_QUALITY_WEIGHT || '0.3'),
    functionalityWeight: parseFloat(process.env.FUNCTIONALITY_WEIGHT || '0.4'),
    testingWeight: parseFloat(process.env.TESTING_WEIGHT || '0.2'),
    documentationWeight: parseFloat(process.env.DOCUMENTATION_WEIGHT || '0.1'),
    timeout: parseInt(process.env.VALIDATION_TIMEOUT || '300000'),
  },
  deployment: {
    strategy: (process.env.DEPLOYMENT_STRATEGY as 'wsl2' | 'docker' | 'local') || 'wsl2',
    wsl2: {
      distro: process.env.WSL2_DISTRO || 'Ubuntu-22.04',
      basePath: process.env.WSL2_BASE_PATH || '/mnt/c/projects',
      maxInstances: parseInt(process.env.MAX_WSL2_INSTANCES || '5'),
      memory: process.env.WSL2_MEMORY || '8GB',
      processors: parseInt(process.env.WSL2_PROCESSORS || '4'),
      swap: process.env.WSL2_SWAP || '2GB',
    },
    docker: {
      registry: process.env.CONTAINER_REGISTRY || 'docker.io',
      namespace: process.env.CONTAINER_NAMESPACE || 'voltagent-claude-code',
    },
  },
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  },
};

export function createConfig(overrides: Partial<ClaudeCodeConfig> = {}): ClaudeCodeConfig {
  return {
    agentapi: {
      ...DEFAULT_CONFIG.agentapi,
      ...overrides.agentapi,
    },
    validation: {
      ...DEFAULT_CONFIG.validation,
      ...overrides.validation,
    },
    deployment: {
      ...DEFAULT_CONFIG.deployment,
      ...overrides.deployment,
      wsl2: {
        ...DEFAULT_CONFIG.deployment.wsl2,
        ...overrides.deployment?.wsl2,
      },
      docker: {
        ...DEFAULT_CONFIG.deployment.docker,
        ...overrides.deployment?.docker,
      },
    },
    monitoring: {
      ...DEFAULT_CONFIG.monitoring,
      ...overrides.monitoring,
    },
  };
}

export { ClaudeCodeConfig } from '../types/index.js';

