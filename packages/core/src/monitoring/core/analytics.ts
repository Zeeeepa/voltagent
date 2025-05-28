/**
 * Unified analytics tracking system
 */

import { PostHog } from 'posthog-node';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import crypto from 'crypto';
import type { MonitoringConfig, AnalyticsEvent, MonitoringProvider } from '../types';

/**
 * Analytics tracker that consolidates PostHog and other analytics providers
 */
export class AnalyticsTracker implements MonitoringProvider {
  public readonly name = 'AnalyticsTracker';
  
  private config: MonitoringConfig;
  private posthogClient?: PostHog;
  private machineId?: string;
  private isInitialized = false;
  
  constructor(config: MonitoringConfig) {
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Initialize PostHog if configured
      if (this.config.posthog?.apiKey) {
        this.posthogClient = new PostHog(this.config.posthog.apiKey, {
          host: this.config.posthog.host || 'https://us.i.posthog.com',
          flushAt: this.config.posthog.flushAt || 1,
          flushInterval: this.config.posthog.flushInterval || 0,
          disableGeoip: this.config.posthog.disableGeoip || false,
        });
      }
      
      // Generate machine ID for anonymous tracking
      this.machineId = this.generateMachineId();
      
      this.isInitialized = true;
      console.log('[AnalyticsTracker] Initialized successfully');
      
    } catch (error) {
      console.error('[AnalyticsTracker] Failed to initialize:', error);
      throw error;
    }
  }
  
  async recordMetric(): Promise<void> {
    // Not used for analytics tracker
  }
  
  /**
   * Track an analytics event
   */
  async track(event: AnalyticsEvent): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[AnalyticsTracker] Not initialized, skipping event tracking');
      return;
    }
    
    try {
      // Track with PostHog if available
      if (this.posthogClient) {
        await this.trackWithPostHog(event);
      }
      
      // Log event for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('[AnalyticsTracker] Event tracked:', {
          type: event.type,
          agentId: event.agentId,
          userId: event.userId,
          properties: Object.keys(event.properties),
        });
      }
      
    } catch (error) {
      console.error('[AnalyticsTracker] Failed to track event:', error);
      throw error;
    }
  }
  
  /**
   * Track agent operation events
   */
  async trackAgentOperation(options: {
    agentId: string;
    operationType: string;
    status: 'started' | 'completed' | 'failed';
    duration?: number;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'agent_operation',
      agentId: options.agentId,
      userId: options.userId,
      sessionId: options.sessionId,
      properties: {
        operation_type: options.operationType,
        status: options.status,
        duration: options.duration,
        ...options.metadata,
      },
    };
    
    await this.track(event);
  }
  
  /**
   * Track tool usage events
   */
  async trackToolUsage(options: {
    agentId: string;
    toolName: string;
    toolCallId: string;
    status: 'started' | 'completed' | 'failed';
    duration?: number;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'tool_usage',
      agentId: options.agentId,
      userId: options.userId,
      sessionId: options.sessionId,
      properties: {
        tool_name: options.toolName,
        tool_call_id: options.toolCallId,
        status: options.status,
        duration: options.duration,
        ...options.metadata,
      },
    };
    
    await this.track(event);
  }
  
  /**
   * Track error events
   */
  async trackError(options: {
    agentId: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    userId?: string;
    sessionId?: string;
    context?: Record<string, any>;
  }): Promise<void> {
    const event: AnalyticsEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'error',
      agentId: options.agentId,
      userId: options.userId,
      sessionId: options.sessionId,
      properties: {
        error_type: options.errorType,
        error_message: options.errorMessage,
        stack_trace: options.stackTrace,
        ...options.context,
      },
    };
    
    await this.track(event);
  }
  
  /**
   * Track with PostHog
   */
  private async trackWithPostHog(event: AnalyticsEvent): Promise<void> {
    if (!this.posthogClient) {
      return;
    }
    
    try {
      this.posthogClient.capture({
        distinctId: event.userId || this.machineId || 'anonymous',
        event: event.type,
        properties: {
          ...event.properties,
          agent_id: event.agentId,
          session_id: event.sessionId,
          event_id: event.id,
          timestamp: event.timestamp,
          machine_id: this.machineId,
          ...this.getSystemInfo(),
        },
      });
      
    } catch (error) {
      console.error('[AnalyticsTracker] PostHog tracking failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate a machine-specific but anonymous ID
   */
  private generateMachineId(): string {
    try {
      const hostname = os.hostname();
      const cpus = os.cpus().length;
      const platform = os.platform();
      const arch = os.arch();
      
      const dataToHash = `${hostname}-${cpus}-${platform}-${arch}`;
      return crypto.createHash('sha256').update(dataToHash).digest('hex').substring(0, 32);
    } catch (error) {
      // Fallback to a random UUID if machine info isn't accessible
      return uuidv4();
    }
  }
  
  /**
   * Get system information for analytics
   */
  private getSystemInfo(): Record<string, any> {
    try {
      return {
        os_platform: os.platform(),
        os_release: os.release(),
        os_version: os.version(),
        os_arch: os.arch(),
        node_version: process.version,
      };
    } catch (error) {
      return {
        os_platform: 'unknown',
        os_release: 'unknown',
        os_version: 'unknown',
        os_arch: 'unknown',
        node_version: 'unknown',
      };
    }
  }
  
  isHealthy(): boolean {
    return this.isInitialized;
  }
  
  async shutdown(): Promise<void> {
    console.log('[AnalyticsTracker] Shutting down...');
    
    try {
      // Flush any remaining events
      if (this.posthogClient) {
        await this.posthogClient.shutdown();
      }
      
      this.isInitialized = false;
      console.log('[AnalyticsTracker] Shut down successfully');
      
    } catch (error) {
      console.error('[AnalyticsTracker] Error during shutdown:', error);
      throw error;
    }
  }
}

