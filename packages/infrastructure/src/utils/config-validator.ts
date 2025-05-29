import { InfrastructureConfig } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  /**
   * Validate infrastructure configuration
   */
  static validateConfig(config: InfrastructureConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate database config
    const dbValidation = this.validateDatabaseConfig(config.database);
    errors.push(...dbValidation.errors);
    warnings.push(...dbValidation.warnings);

    // Validate Redis config
    const redisValidation = this.validateRedisConfig(config.redis);
    errors.push(...redisValidation.errors);
    warnings.push(...redisValidation.warnings);

    // Validate workflow config
    if (config.workflow) {
      const workflowValidation = this.validateWorkflowConfig(config.workflow);
      errors.push(...workflowValidation.errors);
      warnings.push(...workflowValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateDatabaseConfig(config: InfrastructureConfig["database"]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.host) errors.push("Database host is required");
    if (!config.port) errors.push("Database port is required");
    if (!config.database) errors.push("Database name is required");
    if (!config.username) errors.push("Database username is required");
    if (!config.password) errors.push("Database password is required");

    // Validate port range
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push("Database port must be between 1 and 65535");
    }

    // Validate pool settings
    if (config.pool) {
      if (config.pool.min && config.pool.min < 0) {
        errors.push("Database pool min connections must be >= 0");
      }
      if (config.pool.max && config.pool.max < 1) {
        errors.push("Database pool max connections must be >= 1");
      }
      if (config.pool.min && config.pool.max && config.pool.min > config.pool.max) {
        errors.push("Database pool min connections cannot exceed max connections");
      }
    }

    // Warnings
    if (!config.ssl) {
      warnings.push("Database SSL is disabled - consider enabling for production");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private static validateRedisConfig(config: InfrastructureConfig["redis"]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.host) errors.push("Redis host is required");
    if (!config.port) errors.push("Redis port is required");

    // Validate port range
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push("Redis port must be between 1 and 65535");
    }

    // Validate database number
    if (config.db !== undefined && (config.db < 0 || config.db > 15)) {
      errors.push("Redis database number must be between 0 and 15");
    }

    // Warnings
    if (!config.password) {
      warnings.push("Redis password is not set - consider setting for production");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private static validateWorkflowConfig(config: NonNullable<InfrastructureConfig["workflow"]>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate concurrent tasks
    if (config.maxConcurrentTasks !== undefined) {
      if (config.maxConcurrentTasks < 1) {
        errors.push("Max concurrent tasks must be >= 1");
      }
      if (config.maxConcurrentTasks > 100) {
        warnings.push("Max concurrent tasks is very high - consider system resources");
      }
    }

    // Validate timeout
    if (config.taskTimeout !== undefined) {
      if (config.taskTimeout < 1000) {
        errors.push("Task timeout must be >= 1000ms");
      }
      if (config.taskTimeout > 3600000) {
        warnings.push("Task timeout is very high (>1 hour) - consider if this is intentional");
      }
    }

    // Validate retry attempts
    if (config.retryAttempts !== undefined) {
      if (config.retryAttempts < 0) {
        errors.push("Retry attempts must be >= 0");
      }
      if (config.retryAttempts > 10) {
        warnings.push("Retry attempts is very high - consider if this is intentional");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate environment variables
   */
  static validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredEnvVars = [
      "DATABASE_HOST",
      "DATABASE_PORT", 
      "DATABASE_NAME",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "REDIS_HOST",
      "REDIS_PORT",
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Environment variable ${envVar} is required`);
      }
    }

    // Optional but recommended
    const recommendedEnvVars = [
      "DATABASE_SSL",
      "REDIS_PASSWORD",
      "LOG_LEVEL",
    ];

    for (const envVar of recommendedEnvVars) {
      if (!process.env[envVar]) {
        warnings.push(`Environment variable ${envVar} is recommended`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Create config from environment variables
   */
  static createConfigFromEnv(): InfrastructureConfig {
    return {
      database: {
        host: process.env.DATABASE_HOST || "localhost",
        port: parseInt(process.env.DATABASE_PORT || "5432"),
        database: process.env.DATABASE_NAME || "voltagent",
        username: process.env.DATABASE_USER || "postgres",
        password: process.env.DATABASE_PASSWORD || "",
        ssl: process.env.DATABASE_SSL === "true",
        pool: {
          min: parseInt(process.env.DATABASE_POOL_MIN || "2"),
          max: parseInt(process.env.DATABASE_POOL_MAX || "10"),
          idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT || "30000"),
        },
      },
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || "0"),
      },
      workflow: {
        maxConcurrentTasks: parseInt(process.env.WORKFLOW_MAX_CONCURRENT_TASKS || "5"),
        taskTimeout: parseInt(process.env.WORKFLOW_TASK_TIMEOUT || "600000"),
        retryAttempts: parseInt(process.env.WORKFLOW_RETRY_ATTEMPTS || "3"),
      },
    };
  }
}

