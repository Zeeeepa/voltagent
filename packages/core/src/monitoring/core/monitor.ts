/**
 * Core monitoring functionality that unifies all monitoring components
 */

import { EventEmitter } from 'events';
import type { 
  MonitoringConfig, 
  AnalyticsEvent, 
  MetricPoint, 
  MonitoringState,
  MonitoringProvider 
} from '../types';
import { createMonitoringConfig, validateMonitoringConfig } from '../config';
import { MetricsCollector } from './metrics';
import { AnalyticsTracker } from './analytics';
import { PerformanceMonitor } from './performance';
import { AlertingSystem } from './alerting';

/**
 * Core monitoring class that orchestrates all monitoring components
 */
export class CoreMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private state: MonitoringState;
  private providers: Map<string, MonitoringProvider> = new Map();
  
  // Component instances
  private metricsCollector?: MetricsCollector;
  private analyticsTracker?: AnalyticsTracker;
  private performanceMonitor?: PerformanceMonitor;
  private alertingSystem?: AlertingSystem;
  
  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.config = createMonitoringConfig(config);
    this.state = {
      isRunning: false,
      metrics: {
        eventsProcessed: 0,
        metricsCollected: 0,
        alertsTriggered: 0,
        errorsEncountered: 0,
      },
      health: {
        telemetry: 'down',
        analytics: 'down',
        performance: 'down',
        alerting: 'down',
      },
    };
    
    this.validateConfig();
  }
  
  /**
   * Initialize the monitoring system
   */
  async initialize(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }
    
    if (!this.config.enabled) {
      console.log('[VoltAgent Monitor] Monitoring is disabled');
      return;
    }
    
    try {
      console.log('[VoltAgent Monitor] Initializing monitoring system...');
      
      // Initialize components based on configuration
      if (this.config.analyticsEnabled) {
        this.analyticsTracker = new AnalyticsTracker(this.config);
        await this.analyticsTracker.initialize();
        this.state.health.analytics = 'healthy';
      }
      
      if (this.config.performanceEnabled) {
        this.performanceMonitor = new PerformanceMonitor(this.config);
        await this.performanceMonitor.initialize();
        this.state.health.performance = 'healthy';
      }
      
      if (this.config.telemetryEnabled) {
        this.metricsCollector = new MetricsCollector(this.config);
        await this.metricsCollector.initialize();
        this.state.health.telemetry = 'healthy';
      }
      
      if (this.config.alertingEnabled) {
        this.alertingSystem = new AlertingSystem(this.config);
        await this.alertingSystem.initialize();
        this.state.health.alerting = 'healthy';
      }
      
      this.state.isRunning = true;
      this.state.startedAt = new Date().toISOString();
      
      console.log('[VoltAgent Monitor] Monitoring system initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      console.error('[VoltAgent Monitor] Failed to initialize monitoring system:', error);
      this.state.health = {
        telemetry: 'down',
        analytics: 'down',
        performance: 'down',
        alerting: 'down',
      };
      throw error;
    }
  }
  
  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.state.isRunning || !this.config.analyticsEnabled) {
      return;
    }
    
    try {
      // Apply sampling
      if (Math.random() > this.config.samplingRate!) {
        return;
      }
      
      // Apply event filters
      if (this.shouldFilterEvent(event)) {
        return;
      }
      
      await this.analyticsTracker?.track(event);
      this.state.metrics.eventsProcessed++;
      
      this.emit('eventTracked', event);
      
    } catch (error) {
      console.error('[VoltAgent Monitor] Failed to track event:', error);
      this.state.metrics.errorsEncountered++;
      this.emit('error', error);
    }
  }
  
  /**
   * Record a metric point
   */
  async recordMetric(metric: MetricPoint): Promise<void> {
    if (!this.state.isRunning || !this.config.performanceEnabled) {
      return;
    }
    
    try {
      // Apply metric filters
      if (this.shouldFilterMetric(metric)) {
        return;
      }
      
      await this.metricsCollector?.record(metric);
      this.state.metrics.metricsCollected++;
      
      // Check for alert conditions
      if (this.alertingSystem) {
        await this.alertingSystem.checkMetric(metric);
      }
      
      this.emit('metricRecorded', metric);
      
    } catch (error) {
      console.error('[VoltAgent Monitor] Failed to record metric:', error);
      this.state.metrics.errorsEncountered++;
      this.emit('error', error);
    }
  }
  
  /**
   * Get current monitoring state
   */
  getState(): MonitoringState {
    return { ...this.state };
  }
  
  /**
   * Get monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }
  
  /**
   * Update monitoring configuration
   */
  async updateConfig(newConfig: Partial<MonitoringConfig>): Promise<void> {
    const updatedConfig = createMonitoringConfig({
      ...this.config,
      ...newConfig,
    });
    
    const errors = validateMonitoringConfig(updatedConfig);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }
    
    this.config = updatedConfig;
    
    // Reinitialize components if running
    if (this.state.isRunning) {
      await this.shutdown();
      await this.initialize();
    }
    
    this.emit('configUpdated', this.config);
  }
  
  /**
   * Register a custom monitoring provider
   */
  registerProvider(provider: MonitoringProvider): void {
    this.providers.set(provider.name, provider);
    this.emit('providerRegistered', provider.name);
  }
  
  /**
   * Unregister a monitoring provider
   */
  unregisterProvider(name: string): void {
    const provider = this.providers.get(name);
    if (provider) {
      this.providers.delete(name);
      this.emit('providerUnregistered', name);
    }
  }
  
  /**
   * Shutdown the monitoring system
   */
  async shutdown(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }
    
    console.log('[VoltAgent Monitor] Shutting down monitoring system...');
    
    try {
      // Shutdown all components
      await Promise.all([
        this.analyticsTracker?.shutdown(),
        this.performanceMonitor?.shutdown(),
        this.metricsCollector?.shutdown(),
        this.alertingSystem?.shutdown(),
      ]);
      
      // Shutdown custom providers
      for (const provider of this.providers.values()) {
        await provider.shutdown();
      }
      
      this.state.isRunning = false;
      this.state.health = {
        telemetry: 'down',
        analytics: 'down',
        performance: 'down',
        alerting: 'down',
      };
      
      console.log('[VoltAgent Monitor] Monitoring system shut down successfully');
      this.emit('shutdown');
      
    } catch (error) {
      console.error('[VoltAgent Monitor] Error during shutdown:', error);
      throw error;
    }
  }
  
  /**
   * Validate the monitoring configuration
   */
  private validateConfig(): void {
    const errors = validateMonitoringConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Invalid monitoring configuration: ${errors.join(', ')}`);
    }
  }
  
  /**
   * Check if an event should be filtered out
   */
  private shouldFilterEvent(event: AnalyticsEvent): boolean {
    if (!this.config.eventFilters?.length) {
      return false;
    }
    
    return this.config.eventFilters.some(filter => {
      const typeMatch = filter.type === 'all' || event.type === filter.type;
      const agentMatch = !filter.agentIds?.length || filter.agentIds.includes(event.agentId);
      
      const matches = typeMatch && agentMatch;
      return filter.exclude ? matches : !matches;
    });
  }
  
  /**
   * Check if a metric should be filtered out
   */
  private shouldFilterMetric(metric: MetricPoint): boolean {
    if (!this.config.metricFilters?.length) {
      return false;
    }
    
    return this.config.metricFilters.some(filter => {
      const nameMatch = metric.name === filter.name;
      const tagMatch = !filter.tags || Object.entries(filter.tags).every(
        ([key, value]) => metric.tags[key] === value
      );
      
      const matches = nameMatch && tagMatch;
      return filter.exclude ? matches : !matches;
    });
  }
}

