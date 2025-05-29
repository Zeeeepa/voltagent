import type { DeploymentConfig } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate deployment configuration
 */
export function validateConfig(config: DeploymentConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate AgentAPI configuration
  if (!config.agentapi) {
    errors.push("AgentAPI configuration is required");
  } else {
    if (!config.agentapi.baseUrl) {
      errors.push("AgentAPI baseUrl is required");
    } else {
      try {
        new URL(config.agentapi.baseUrl);
      } catch {
        errors.push("AgentAPI baseUrl must be a valid URL");
      }
    }

    if (config.agentapi.port && (config.agentapi.port < 1 || config.agentapi.port > 65535)) {
      errors.push("AgentAPI port must be between 1 and 65535");
    }

    if (config.agentapi.timeout && config.agentapi.timeout < 1000) {
      warnings.push("AgentAPI timeout is very low (< 1000ms)");
    }

    if (config.agentapi.retryAttempts && config.agentapi.retryAttempts < 1) {
      errors.push("AgentAPI retryAttempts must be at least 1");
    }

    if (config.agentapi.retryDelay && config.agentapi.retryDelay < 100) {
      warnings.push("AgentAPI retryDelay is very low (< 100ms)");
    }
  }

  // Validate WSL2 configuration
  if (config.wsl2) {
    if (config.wsl2.resourceLimits?.memory) {
      if (!isValidMemorySize(config.wsl2.resourceLimits.memory)) {
        errors.push("WSL2 memory limit must be in format like '4GB', '2048MB'");
      }
    }

    if (config.wsl2.resourceLimits?.processors) {
      if (config.wsl2.resourceLimits.processors < 1 || config.wsl2.resourceLimits.processors > 32) {
        errors.push("WSL2 processors must be between 1 and 32");
      }
    }

    if (config.wsl2.networkConfig?.hostPort) {
      if (config.wsl2.networkConfig.hostPort < 1 || config.wsl2.networkConfig.hostPort > 65535) {
        errors.push("WSL2 host port must be between 1 and 65535");
      }
    }

    if (config.wsl2.networkConfig?.guestPort) {
      if (config.wsl2.networkConfig.guestPort < 1 || config.wsl2.networkConfig.guestPort > 65535) {
        errors.push("WSL2 guest port must be between 1 and 65535");
      }
    }
  }

  // Validate Claude Code configuration
  if (config.claudeCode) {
    if (config.claudeCode.allowedTools && !Array.isArray(config.claudeCode.allowedTools)) {
      errors.push("Claude Code allowedTools must be an array");
    }

    if (config.claudeCode.model && !isValidClaudeModel(config.claudeCode.model)) {
      warnings.push(`Claude Code model '${config.claudeCode.model}' may not be supported`);
    }

    if (config.claudeCode.additionalArgs && !Array.isArray(config.claudeCode.additionalArgs)) {
      errors.push("Claude Code additionalArgs must be an array");
    }
  }

  // Validate database configuration
  if (config.database) {
    if (!config.database.connectionString) {
      errors.push("Database connectionString is required when database config is provided");
    } else {
      if (!isValidConnectionString(config.database.connectionString)) {
        errors.push("Database connectionString appears to be invalid");
      }
    }

    if (config.database.tableName && !isValidTableName(config.database.tableName)) {
      errors.push("Database tableName contains invalid characters");
    }
  }

  // Validate webhook configuration
  if (config.webhooks) {
    if (config.webhooks.endpoints && !Array.isArray(config.webhooks.endpoints)) {
      errors.push("Webhook endpoints must be an array");
    }

    if (config.webhooks.endpoints) {
      for (const endpoint of config.webhooks.endpoints) {
        try {
          new URL(endpoint);
        } catch {
          errors.push(`Webhook endpoint '${endpoint}' is not a valid URL`);
        }
      }
    }

    if (config.webhooks.secret && config.webhooks.secret.length < 16) {
      warnings.push("Webhook secret should be at least 16 characters for security");
    }
  }

  // Cross-validation checks
  if (config.agentapi && config.wsl2?.networkConfig) {
    const agentApiPort = config.agentapi.port || 3284;
    const wsl2GuestPort = config.wsl2.networkConfig.guestPort;
    
    if (wsl2GuestPort && agentApiPort !== wsl2GuestPort) {
      warnings.push("AgentAPI port and WSL2 guest port should typically match");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate memory size format
 */
function isValidMemorySize(memory: string): boolean {
  const memoryRegex = /^\d+(?:\.\d+)?(GB|MB|KB|G|M|K)$/i;
  return memoryRegex.test(memory);
}

/**
 * Validate Claude model name
 */
function isValidClaudeModel(model: string): boolean {
  const validModels = [
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-7-sonnet-20250219",
  ];
  
  return validModels.includes(model) || model.startsWith("claude-");
}

/**
 * Validate database connection string format
 */
function isValidConnectionString(connectionString: string): boolean {
  // Basic validation for common database connection string formats
  const patterns = [
    /^postgresql:\/\//, // PostgreSQL
    /^mysql:\/\//, // MySQL
    /^sqlite:/, // SQLite
    /^mongodb:\/\//, // MongoDB
    /^redis:\/\//, // Redis
  ];
  
  return patterns.some(pattern => pattern.test(connectionString));
}

/**
 * Validate database table name
 */
function isValidTableName(tableName: string): boolean {
  // Allow alphanumeric characters, underscores, and hyphens
  const tableNameRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  return tableNameRegex.test(tableName) && tableName.length <= 64;
}

/**
 * Get default configuration with validation
 */
export function getValidatedDefaultConfig(): DeploymentConfig {
  const defaultConfig: DeploymentConfig = {
    agentapi: {
      baseUrl: "http://localhost",
      port: 3284,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    },
    wsl2: {
      distributionName: "Ubuntu-22.04",
      instancePrefix: "claude-test-env",
      resourceLimits: {
        memory: "4GB",
        processors: 2,
      },
      networkConfig: {
        hostPort: 3284,
        guestPort: 3284,
      },
    },
    claudeCode: {
      version: "latest",
      allowedTools: ["Bash(git*)", "Edit", "Replace"],
      model: "claude-3-sonnet-20240229",
      additionalArgs: [],
    },
  };

  const validation = validateConfig(defaultConfig);
  if (!validation.valid) {
    throw new Error(`Default configuration is invalid: ${validation.errors.join(", ")}`);
  }

  return defaultConfig;
}

/**
 * Merge and validate configuration
 */
export function mergeAndValidateConfig(
  baseConfig: DeploymentConfig,
  overrides: Partial<DeploymentConfig>
): DeploymentConfig {
  const mergedConfig: DeploymentConfig = {
    agentapi: { ...baseConfig.agentapi, ...overrides.agentapi },
    wsl2: { ...baseConfig.wsl2, ...overrides.wsl2 },
    claudeCode: { ...baseConfig.claudeCode, ...overrides.claudeCode },
    database: overrides.database || baseConfig.database,
    webhooks: overrides.webhooks || baseConfig.webhooks,
  };

  const validation = validateConfig(mergedConfig);
  if (!validation.valid) {
    throw new Error(`Merged configuration is invalid: ${validation.errors.join(", ")}`);
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn("Configuration warnings:", validation.warnings);
  }

  return mergedConfig;
}

