/**
 * Configuration management for the unified monitoring system
 */

import type { MonitoringConfig } from './types';

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  telemetryEnabled: true,
  analyticsEnabled: true,
  performanceEnabled: true,
  alertingEnabled: true,
  dashboardEnabled: true,
  
  samplingRate: 1.0, // 100% sampling by default
  eventFilters: [],
  metricFilters: [],
  
  posthog: {
    apiKey: process.env.VOLTAGENT_POSTHOG_API_KEY || '',
    host: process.env.VOLTAGENT_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
    disableGeoip: false,
  },
  
  opentelemetry: {
    serviceName: 'voltagent-core',
    serviceVersion: '0.1.0',
    endpoint: process.env.VOLTAGENT_OTEL_ENDPOINT,
    headers: {},
  },
  
  voltAgentExporter: {
    baseUrl: process.env.VOLTAGENT_EXPORTER_BASE_URL || '',
    publicKey: process.env.VOLTAGENT_EXPORTER_PUBLIC_KEY || '',
    secretKey: process.env.VOLTAGENT_EXPORTER_SECRET_KEY || '',
  },
};

/**
 * Environment-based configuration detection
 */
export function detectEnvironmentConfig(): Partial<MonitoringConfig> {
  const config: Partial<MonitoringConfig> = {};
  
  // Check if telemetry is disabled
  const telemetryDisabled = process.env.VOLTAGENT_TELEMETRY_DISABLED === '1' || 
                           process.env.VOLTAGENT_TELEMETRY_DISABLED === 'true';
  
  if (telemetryDisabled) {
    config.enabled = false;
    config.telemetryEnabled = false;
    config.analyticsEnabled = false;
  }
  
  // Check for development environment
  if (process.env.NODE_ENV === 'development') {
    config.samplingRate = 0.1; // 10% sampling in development
  }
  
  // Check for production optimizations
  if (process.env.NODE_ENV === 'production') {
    config.samplingRate = 1.0; // Full sampling in production
  }
  
  return config;
}

/**
 * Merge configuration with defaults and environment overrides
 */
export function createMonitoringConfig(
  userConfig: Partial<MonitoringConfig> = {}
): MonitoringConfig {
  const envConfig = detectEnvironmentConfig();
  
  return {
    ...DEFAULT_MONITORING_CONFIG,
    ...envConfig,
    ...userConfig,
    
    // Deep merge nested objects
    posthog: {
      ...DEFAULT_MONITORING_CONFIG.posthog,
      ...envConfig.posthog,
      ...userConfig.posthog,
    },
    
    opentelemetry: {
      ...DEFAULT_MONITORING_CONFIG.opentelemetry,
      ...envConfig.opentelemetry,
      ...userConfig.opentelemetry,
    },
    
    voltAgentExporter: {
      ...DEFAULT_MONITORING_CONFIG.voltAgentExporter,
      ...envConfig.voltAgentExporter,
      ...userConfig.voltAgentExporter,
    },
  };
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(config: MonitoringConfig): string[] {
  const errors: string[] = [];
  
  if (config.enabled) {
    if (config.analyticsEnabled && config.posthog?.apiKey && !config.posthog.apiKey) {
      errors.push('PostHog API key is required when analytics is enabled');
    }
    
    if (config.telemetryEnabled && config.voltAgentExporter) {
      if (!config.voltAgentExporter.baseUrl) {
        errors.push('VoltAgent Exporter base URL is required when telemetry is enabled');
      }
      if (!config.voltAgentExporter.publicKey) {
        errors.push('VoltAgent Exporter public key is required when telemetry is enabled');
      }
      if (!config.voltAgentExporter.secretKey) {
        errors.push('VoltAgent Exporter secret key is required when telemetry is enabled');
      }
    }
    
    if (config.samplingRate && (config.samplingRate < 0 || config.samplingRate > 1)) {
      errors.push('Sampling rate must be between 0 and 1');
    }
  }
  
  return errors;
}

