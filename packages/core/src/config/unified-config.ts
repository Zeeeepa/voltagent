/**
 * Unified Configuration System for VoltAgent
 * 
 * This module provides a centralized configuration management system that
 * consolidates all the different configuration approaches from the various PRs.
 */

export interface WorkflowConfig {
  /** Maximum number of concurrent tasks */
  concurrencyLimit?: number;
  /** Default task timeout in milliseconds */
  defaultTimeout?: number;
  /** Enable task retry by default */
  enableRetry?: boolean;
  /** Default retry policy */
  defaultRetryPolicy?: {
    maxRetries: number;
    initialDelay: number;
    backoffFactor: number;
  };
  /** Resource limits */
  resourceLimits?: {
    cpu: number;
    memory: number;
  };
}

export interface DependencyConfig {
  /** Enable dependency validation */
  enableValidation?: boolean;
  /** Enable circular dependency detection */
  enableCircularDetection?: boolean;
  /** Enable dependency visualization */
  enableVisualization?: boolean;
  /** Default visualization format */
  defaultVisualizationFormat?: 'mermaid' | 'dot' | 'html';
  /** Enable critical path analysis */
  enableCriticalPath?: boolean;
}

export interface SynchronizationConfig {
  /** Enable conflict detection */
  enableConflictDetection?: boolean;
  /** Default conflict resolution strategy */
  defaultConflictResolution?: 'first_wins' | 'last_wins' | 'merge' | 'manual';
  /** Enable deadlock prevention */
  enableDeadlockPrevention?: boolean;
  /** Synchronization timeout in milliseconds */
  syncTimeout?: number;
  /** Enable data exchange channels */
  enableDataExchange?: boolean;
}

export interface ProgressConfig {
  /** Enable real-time progress updates */
  realTimeUpdates?: boolean;
  /** Metric calculation interval in milliseconds */
  metricCalculationInterval?: number;
  /** Enable predictive analytics */
  enablePredictiveAnalytics?: boolean;
  /** Enable blocker detection */
  enableBlockerDetection?: boolean;
  /** Enable milestone tracking */
  enableMilestoneTracking?: boolean;
}

export interface APIConfig {
  /** Enable REST API */
  enableREST?: boolean;
  /** Enable GraphQL API */
  enableGraphQL?: boolean;
  /** API version */
  version?: string;
  /** Enable webhook support */
  enableWebhooks?: boolean;
  /** Enable SDK generation */
  enableSDKGeneration?: boolean;
  /** Supported SDK languages */
  sdkLanguages?: string[];
  /** API rate limiting */
  rateLimiting?: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

export interface CICDConfig {
  /** Enable Claude Code validation */
  enableClaudeValidation?: boolean;
  /** Enable WSL2 deployment */
  enableWSL2?: boolean;
  /** Enable security analysis */
  enableSecurityAnalysis?: boolean;
  /** Enable performance analysis */
  enablePerformanceAnalysis?: boolean;
  /** Validation weights */
  validationWeights?: {
    codeQuality: number;
    functionality: number;
    testing: number;
    documentation: number;
  };
  /** Deployment strategy */
  deploymentStrategy?: 'wsl2' | 'docker' | 'kubernetes';
}

export interface VoltAgentConfig {
  /** Workflow configuration */
  workflow: WorkflowConfig;
  /** Dependency management configuration */
  dependency: DependencyConfig;
  /** Synchronization configuration */
  synchronization: SynchronizationConfig;
  /** Progress tracking configuration */
  progress: ProgressConfig;
  /** API configuration (optional) */
  api?: APIConfig;
  /** CI/CD configuration (optional) */
  cicd?: CICDConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: VoltAgentConfig = {
  workflow: {
    concurrencyLimit: 10,
    defaultTimeout: 30000,
    enableRetry: true,
    defaultRetryPolicy: {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 2,
    },
    resourceLimits: {
      cpu: 100,
      memory: 100,
    },
  },
  dependency: {
    enableValidation: true,
    enableCircularDetection: true,
    enableVisualization: true,
    defaultVisualizationFormat: 'mermaid',
    enableCriticalPath: true,
  },
  synchronization: {
    enableConflictDetection: true,
    defaultConflictResolution: 'last_wins',
    enableDeadlockPrevention: true,
    syncTimeout: 30000,
    enableDataExchange: true,
  },
  progress: {
    realTimeUpdates: true,
    metricCalculationInterval: 5000,
    enablePredictiveAnalytics: true,
    enableBlockerDetection: true,
    enableMilestoneTracking: true,
  },
};

/**
 * Configuration Manager
 * 
 * Provides centralized configuration management with validation,
 * merging, and environment-based overrides.
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: VoltAgentConfig;

  private constructor(initialConfig?: Partial<VoltAgentConfig>) {
    this.config = this.mergeConfigs(DEFAULT_CONFIG, initialConfig || {});
  }

  /**
   * Get the singleton instance of ConfigManager
   */
  static getInstance(initialConfig?: Partial<VoltAgentConfig>): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(initialConfig);
    }
    return ConfigManager.instance;
  }

  /**
   * Get the current configuration
   */
  getConfig(): VoltAgentConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(updates: Partial<VoltAgentConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
    this.validateConfig(this.config);
  }

  /**
   * Merge multiple configuration objects
   */
  mergeConfigs(...configs: Partial<VoltAgentConfig>[]): VoltAgentConfig {
    const merged = configs.reduce((acc, config) => {
      return this.deepMerge(acc, config);
    }, {} as VoltAgentConfig);

    return merged;
  }

  /**
   * Validate configuration
   */
  validateConfig(config: VoltAgentConfig): boolean {
    const errors: string[] = [];

    // Validate workflow config
    if (config.workflow.concurrencyLimit && config.workflow.concurrencyLimit <= 0) {
      errors.push('workflow.concurrencyLimit must be greater than 0');
    }

    if (config.workflow.defaultTimeout && config.workflow.defaultTimeout <= 0) {
      errors.push('workflow.defaultTimeout must be greater than 0');
    }

    // Validate dependency config
    const validVisualizationFormats = ['mermaid', 'dot', 'html'];
    if (config.dependency.defaultVisualizationFormat && 
        !validVisualizationFormats.includes(config.dependency.defaultVisualizationFormat)) {
      errors.push(`dependency.defaultVisualizationFormat must be one of: ${validVisualizationFormats.join(', ')}`);
    }

    // Validate synchronization config
    const validConflictResolutions = ['first_wins', 'last_wins', 'merge', 'manual'];
    if (config.synchronization.defaultConflictResolution && 
        !validConflictResolutions.includes(config.synchronization.defaultConflictResolution)) {
      errors.push(`synchronization.defaultConflictResolution must be one of: ${validConflictResolutions.join(', ')}`);
    }

    // Validate progress config
    if (config.progress.metricCalculationInterval && config.progress.metricCalculationInterval <= 0) {
      errors.push('progress.metricCalculationInterval must be greater than 0');
    }

    // Validate CI/CD config
    if (config.cicd?.validationWeights) {
      const weights = config.cicd.validationWeights;
      const total = weights.codeQuality + weights.functionality + weights.testing + weights.documentation;
      if (Math.abs(total - 1.0) > 0.001) {
        errors.push('cicd.validationWeights must sum to 1.0');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): Partial<VoltAgentConfig> {
    const envConfig: Partial<VoltAgentConfig> = {};

    // Workflow config from environment
    if (process.env.VOLTAGENT_WORKFLOW_CONCURRENCY_LIMIT) {
      envConfig.workflow = {
        ...envConfig.workflow,
        concurrencyLimit: parseInt(process.env.VOLTAGENT_WORKFLOW_CONCURRENCY_LIMIT),
      };
    }

    if (process.env.VOLTAGENT_WORKFLOW_DEFAULT_TIMEOUT) {
      envConfig.workflow = {
        ...envConfig.workflow,
        defaultTimeout: parseInt(process.env.VOLTAGENT_WORKFLOW_DEFAULT_TIMEOUT),
      };
    }

    // Dependency config from environment
    if (process.env.VOLTAGENT_DEPENDENCY_ENABLE_VALIDATION) {
      envConfig.dependency = {
        ...envConfig.dependency,
        enableValidation: process.env.VOLTAGENT_DEPENDENCY_ENABLE_VALIDATION === 'true',
      };
    }

    // Progress config from environment
    if (process.env.VOLTAGENT_PROGRESS_REAL_TIME_UPDATES) {
      envConfig.progress = {
        ...envConfig.progress,
        realTimeUpdates: process.env.VOLTAGENT_PROGRESS_REAL_TIME_UPDATES === 'true',
      };
    }

    // API config from environment
    if (process.env.VOLTAGENT_API_ENABLE_REST) {
      envConfig.api = {
        ...envConfig.api,
        enableREST: process.env.VOLTAGENT_API_ENABLE_REST === 'true',
      };
    }

    return envConfig;
  }

  /**
   * Export configuration to JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(jsonConfig: string): void {
    try {
      const config = JSON.parse(jsonConfig) as Partial<VoltAgentConfig>;
      this.updateConfig(config);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

/**
 * Factory function to create a configuration manager
 */
export function createConfigManager(initialConfig?: Partial<VoltAgentConfig>): ConfigManager {
  return ConfigManager.getInstance(initialConfig);
}

/**
 * Utility function to get default configuration
 */
export function getDefaultConfig(): VoltAgentConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Utility function to create configuration from environment
 */
export function createConfigFromEnvironment(): VoltAgentConfig {
  const configManager = ConfigManager.getInstance();
  const envConfig = configManager.loadFromEnvironment();
  return configManager.mergeConfigs(DEFAULT_CONFIG, envConfig);
}

