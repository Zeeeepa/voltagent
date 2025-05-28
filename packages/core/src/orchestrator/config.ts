/**
 * Unified Configuration Management
 * 
 * Consolidates configuration patterns across the VoltAgent system,
 * providing a single source of truth for all system configuration.
 */

import type { SystemConfig } from "./initialization";
import type { OrchestratorConfig } from "./index";

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
  // Orchestrator configuration
  VOLTAGENT_MAX_CONCURRENT_OPERATIONS: 'orchestrator.maxConcurrentOperations',
  VOLTAGENT_DEFAULT_TIMEOUT: 'orchestrator.defaultTimeout',
  VOLTAGENT_AUTO_CLEANUP: 'orchestrator.autoCleanup',
  VOLTAGENT_CLEANUP_INTERVAL: 'orchestrator.cleanupInterval',
  VOLTAGENT_ENABLE_TELEMETRY: 'orchestrator.enableTelemetry',
  VOLTAGENT_ENABLE_EVENT_PROPAGATION: 'orchestrator.enableEventPropagation',
  
  // Server configuration
  VOLTAGENT_SERVER_PORT: 'server.port',
  VOLTAGENT_SERVER_AUTO_START: 'server.autoStart',
  VOLTAGENT_SERVER_ENABLE_WEBSOCKET: 'server.enableWebSocket',
  
  // Telemetry configuration
  VOLTAGENT_TELEMETRY_ENABLED: 'telemetry.enabled',
  
  // Dependencies configuration
  VOLTAGENT_CHECK_UPDATES: 'dependencies.checkUpdates',
  VOLTAGENT_AUTO_UPDATE: 'dependencies.autoUpdate',
  
  // Logging configuration
  VOLTAGENT_LOG_LEVEL: 'logging.level',
  VOLTAGENT_STRUCTURED_LOGGING: 'logging.structured',
} as const;

/**
 * Configuration validation rules
 */
interface ValidationRule {
  path: string;
  type: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
  enum?: readonly string[];
  required?: boolean;
}

const VALIDATION_RULES: ValidationRule[] = [
  { path: 'orchestrator.maxConcurrentOperations', type: 'number', min: 1, max: 1000 },
  { path: 'orchestrator.defaultTimeout', type: 'number', min: 1000, max: 300000 },
  { path: 'orchestrator.autoCleanup', type: 'boolean' },
  { path: 'orchestrator.cleanupInterval', type: 'number', min: 10000, max: 3600000 },
  { path: 'orchestrator.enableTelemetry', type: 'boolean' },
  { path: 'orchestrator.enableEventPropagation', type: 'boolean' },
  
  { path: 'server.port', type: 'number', min: 1, max: 65535 },
  { path: 'server.autoStart', type: 'boolean' },
  { path: 'server.enableWebSocket', type: 'boolean' },
  
  { path: 'telemetry.enabled', type: 'boolean' },
  
  { path: 'dependencies.checkUpdates', type: 'boolean' },
  { path: 'dependencies.autoUpdate', type: 'boolean' },
  
  { path: 'logging.level', type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
  { path: 'logging.structured', type: 'boolean' },
];

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<SystemConfig> = {
  orchestrator: {
    maxConcurrentOperations: 50,
    defaultTimeout: 30000,
    autoCleanup: true,
    cleanupInterval: 60000,
    enableTelemetry: true,
    enableEventPropagation: true,
  },
  server: {
    port: 3141,
    autoStart: true,
    enableWebSocket: true,
  },
  telemetry: {
    enabled: true,
  },
  dependencies: {
    checkUpdates: true,
    autoUpdate: false,
  },
  logging: {
    level: 'info',
    structured: false,
  },
};

/**
 * Unified Configuration Manager
 * 
 * Provides centralized configuration management with:
 * - Environment variable loading
 * - Configuration validation
 * - Type-safe configuration access
 * - Configuration merging and overrides
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: Required<SystemConfig>;
  private isLocked = false;

  private constructor(initialConfig?: Partial<SystemConfig>) {
    this.config = this.mergeConfigs(DEFAULT_CONFIG, initialConfig || {});
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(initialConfig?: Partial<SystemConfig>): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(initialConfig);
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from environment variables
   */
  public static createFromEnvironment(): Partial<SystemConfig> {
    const config: any = {};
    
    for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(config, configPath, this.parseEnvValue(value));
      }
    }
    
    return config;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Required<SystemConfig> {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get a specific configuration value
   */
  public get<T = any>(path: string): T {
    return this.getNestedValue(this.config, path);
  }

  /**
   * Update configuration (only if not locked)
   */
  public updateConfig(updates: Partial<SystemConfig>): void {
    if (this.isLocked) {
      throw new Error('Configuration is locked and cannot be modified');
    }

    const newConfig = this.mergeConfigs(this.config, updates);
    this.validateConfig(newConfig);
    this.config = newConfig;
  }

  /**
   * Lock configuration to prevent further changes
   */
  public lock(): void {
    this.isLocked = true;
  }

  /**
   * Check if configuration is locked
   */
  public isConfigLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Validate the entire configuration
   */
  public validateConfig(config: Required<SystemConfig>): void {
    const errors: string[] = [];

    for (const rule of VALIDATION_RULES) {
      const value = this.getNestedValue(config, rule.path);
      const error = this.validateValue(value, rule, rule.path);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get orchestrator-specific configuration
   */
  public getOrchestratorConfig(): OrchestratorConfig {
    return this.config.orchestrator;
  }

  /**
   * Export configuration to environment variables format
   */
  public exportToEnv(): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
      const value = this.getNestedValue(this.config, configPath);
      if (value !== undefined) {
        envVars[envVar] = String(value);
      }
    }
    
    return envVars;
  }

  /**
   * Create a configuration snapshot
   */
  public createSnapshot(): string {
    return JSON.stringify({
      config: this.config,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }, null, 2);
  }

  /**
   * Restore configuration from snapshot
   */
  public restoreFromSnapshot(snapshot: string): void {
    if (this.isLocked) {
      throw new Error('Configuration is locked and cannot be modified');
    }

    try {
      const data = JSON.parse(snapshot);
      if (!data.config) {
        throw new Error('Invalid snapshot format');
      }
      
      this.validateConfig(data.config);
      this.config = data.config;
    } catch (error) {
      throw new Error(`Failed to restore configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge multiple configuration objects
   */
  private mergeConfigs(...configs: Partial<SystemConfig>[]): Required<SystemConfig> {
    const result = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    for (const config of configs) {
      this.deepMerge(result, config);
    }
    
    return result;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Parse environment variable value
   */
  private static parseEnvValue(value: string): any {
    // Boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Number values
    const numValue = Number(value);
    if (!isNaN(numValue)) return numValue;
    
    // String values
    return value;
  }

  /**
   * Validate a single value against a rule
   */
  private validateValue(value: any, rule: ValidationRule, path: string): string | null {
    if (value === undefined || value === null) {
      if (rule.required) {
        return `${path}: Required value is missing`;
      }
      return null;
    }

    // Type validation
    if (typeof value !== rule.type) {
      return `${path}: Expected ${rule.type}, got ${typeof value}`;
    }

    // Number-specific validation
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `${path}: Value ${value} is below minimum ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `${path}: Value ${value} is above maximum ${rule.max}`;
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return `${path}: Value "${value}" is not one of allowed values: ${rule.enum.join(', ')}`;
    }

    return null;
  }
}

/**
 * Factory function to create configuration manager
 */
export function createConfigManager(initialConfig?: Partial<SystemConfig>): ConfigManager {
  return ConfigManager.getInstance(initialConfig);
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnvironment(): Partial<SystemConfig> {
  return ConfigManager.createFromEnvironment();
}

/**
 * Get the global configuration manager instance
 */
export function getConfigManager(): ConfigManager {
  return ConfigManager.getInstance();
}

// Export types and constants
export { DEFAULT_CONFIG, ENV_MAPPINGS, VALIDATION_RULES };
export type { ValidationRule };

