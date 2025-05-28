/**
 * Tests for the unified monitoring system
 */

import { MonitoringSystem } from './system';
import type { MonitoringConfig, AnalyticsEvent, MetricPoint } from './types';

describe('MonitoringSystem', () => {
  let monitoring: MonitoringSystem;
  
  beforeEach(() => {
    // Reset singleton for each test
    MonitoringSystem.reset();
    
    // Create test instance with disabled external services
    monitoring = MonitoringSystem.getInstance({
      enabled: true,
      analyticsEnabled: false, // Disable PostHog in tests
      telemetryEnabled: false, // Disable VoltAgent Exporter in tests
      performanceEnabled: true,
      alertingEnabled: true,
      dashboardEnabled: true,
      samplingRate: 1.0, // Full sampling in tests
    });
  });
  
  afterEach(async () => {
    if (monitoring) {
      await monitoring.shutdown();
    }
    MonitoringSystem.reset();
  });
  
  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await monitoring.initialize();
      
      const state = monitoring.getState();
      expect(state.isRunning).toBe(true);
      expect(state.startedAt).toBeDefined();
    });
    
    it('should not initialize twice', async () => {
      await monitoring.initialize();
      await monitoring.initialize(); // Should not throw
      
      const state = monitoring.getState();
      expect(state.isRunning).toBe(true);
    });
    
    it('should handle disabled monitoring', async () => {
      const disabledMonitoring = MonitoringSystem.getInstance({
        enabled: false,
      });
      
      await disabledMonitoring.initialize();
      
      const state = disabledMonitoring.getState();
      expect(state.isRunning).toBe(false);
    });
  });
  
  describe('Event Tracking', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });
    
    it('should track events successfully', async () => {
      const event: AnalyticsEvent = {
        id: 'test-event-1',
        timestamp: new Date().toISOString(),
        type: 'test_event',
        agentId: 'test-agent',
        properties: {
          test_property: 'test_value',
        },
      };
      
      await expect(monitoring.trackEvent(event)).resolves.not.toThrow();
    });
    
    it('should handle event tracking errors gracefully', async () => {
      const invalidEvent = {} as AnalyticsEvent;
      
      // Should not throw even with invalid event
      await expect(monitoring.trackEvent(invalidEvent)).resolves.not.toThrow();
    });
    
    it('should respect sampling rate', async () => {
      // Create monitoring with 0% sampling
      const sampledMonitoring = MonitoringSystem.getInstance({
        enabled: true,
        analyticsEnabled: false,
        samplingRate: 0.0,
      });
      
      await sampledMonitoring.initialize();
      
      const event: AnalyticsEvent = {
        id: 'test-event-2',
        timestamp: new Date().toISOString(),
        type: 'test_event',
        agentId: 'test-agent',
        properties: {},
      };
      
      // Should complete without processing due to sampling
      await expect(sampledMonitoring.trackEvent(event)).resolves.not.toThrow();
      
      await sampledMonitoring.shutdown();
    });
  });
  
  describe('Metric Recording', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });
    
    it('should record metrics successfully', async () => {
      const metric: MetricPoint = {
        name: 'test.metric',
        value: 42,
        timestamp: new Date().toISOString(),
        tags: {
          test_tag: 'test_value',
        },
        unit: 'count',
      };
      
      await expect(monitoring.recordMetric(metric)).resolves.not.toThrow();
    });
    
    it('should handle metric recording errors gracefully', async () => {
      const invalidMetric = {} as MetricPoint;
      
      // Should not throw even with invalid metric
      await expect(monitoring.recordMetric(invalidMetric)).resolves.not.toThrow();
    });
  });
  
  describe('Agent Operation Tracking', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });
    
    it('should track successful operations', async () => {
      const result = await monitoring.trackAgentOperation(
        'test-op-1',
        'test-agent',
        'test_operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        },
        { test_metadata: 'value' }
      );
      
      expect(result).toBe('success');
    });
    
    it('should track failed operations', async () => {
      const error = new Error('Test error');
      
      await expect(
        monitoring.trackAgentOperation(
          'test-op-2',
          'test-agent',
          'test_operation',
          async () => {
            throw error;
          }
        )
      ).rejects.toThrow('Test error');
    });
    
    it('should measure operation duration', async () => {
      const startTime = Date.now();
      
      await monitoring.trackAgentOperation(
        'test-op-3',
        'test-agent',
        'test_operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'done';
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 50ms
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });
  
  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = monitoring.getConfig();
      
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.samplingRate).toBe(1.0);
    });
    
    it('should update configuration', async () => {
      await monitoring.initialize();
      
      const newConfig: Partial<MonitoringConfig> = {
        samplingRate: 0.5,
        performanceEnabled: false,
      };
      
      await monitoring.updateConfig(newConfig);
      
      const updatedConfig = monitoring.getConfig();
      expect(updatedConfig.samplingRate).toBe(0.5);
      expect(updatedConfig.performanceEnabled).toBe(false);
    });
    
    it('should validate configuration updates', async () => {
      await monitoring.initialize();
      
      const invalidConfig: Partial<MonitoringConfig> = {
        samplingRate: 2.0, // Invalid: should be between 0 and 1
      };
      
      await expect(monitoring.updateConfig(invalidConfig)).rejects.toThrow();
    });
  });
  
  describe('Dashboard Integration', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });
    
    it('should provide dashboard access', () => {
      const dashboard = monitoring.getDashboard();
      
      expect(dashboard).toBeDefined();
      expect(dashboard.isHealthy()).toBe(true);
    });
    
    it('should provide dashboard summary', () => {
      const dashboard = monitoring.getDashboard();
      const summary = dashboard.getDashboardSummary();
      
      expect(summary).toBeDefined();
      expect(summary.totalMetrics).toBeGreaterThanOrEqual(0);
      expect(summary.activeAlerts).toBeGreaterThanOrEqual(0);
      expect(['healthy', 'warning', 'critical']).toContain(summary.systemHealth);
    });
    
    it('should export dashboard data', () => {
      const dashboard = monitoring.getDashboard();
      const exportData = dashboard.exportDashboardData();
      
      expect(exportData).toBeDefined();
      expect(exportData.config).toBeDefined();
      expect(exportData.metrics).toBeDefined();
      expect(exportData.alerts).toBeDefined();
      expect(exportData.summary).toBeDefined();
    });
  });
  
  describe('Core Monitor Access', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });
    
    it('should provide core monitor access', () => {
      const core = monitoring.getCore();
      
      expect(core).toBeDefined();
      expect(core.getState().isRunning).toBe(true);
    });
    
    it('should provide monitoring state', () => {
      const state = monitoring.getState();
      
      expect(state).toBeDefined();
      expect(state.isRunning).toBe(true);
      expect(state.metrics).toBeDefined();
      expect(state.health).toBeDefined();
    });
  });
  
  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await monitoring.initialize();
      
      expect(monitoring.getState().isRunning).toBe(true);
      
      await monitoring.shutdown();
      
      expect(monitoring.getState().isRunning).toBe(false);
    });
    
    it('should handle shutdown when not initialized', async () => {
      // Should not throw when shutting down uninitialized system
      await expect(monitoring.shutdown()).resolves.not.toThrow();
    });
    
    it('should handle multiple shutdowns', async () => {
      await monitoring.initialize();
      await monitoring.shutdown();
      
      // Should not throw on second shutdown
      await expect(monitoring.shutdown()).resolves.not.toThrow();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Create monitoring with invalid configuration
      const invalidMonitoring = MonitoringSystem.getInstance({
        enabled: true,
        voltAgentExporter: {
          baseUrl: '', // Invalid empty URL
          publicKey: '',
          secretKey: '',
        },
      });
      
      // Should handle initialization errors
      await expect(invalidMonitoring.initialize()).rejects.toThrow();
    });
    
    it('should continue operating after non-critical errors', async () => {
      await monitoring.initialize();
      
      // Track an event that might cause issues
      const problematicEvent: AnalyticsEvent = {
        id: 'problematic-event',
        timestamp: 'invalid-timestamp',
        type: 'test_event',
        agentId: 'test-agent',
        properties: {
          circular: {} as any,
        },
      };
      
      // Add circular reference
      problematicEvent.properties.circular = problematicEvent.properties;
      
      // Should not crash the system
      await expect(monitoring.trackEvent(problematicEvent)).resolves.not.toThrow();
      
      // System should still be running
      expect(monitoring.getState().isRunning).toBe(true);
    });
  });
  
  describe('Singleton Behavior', () => {
    it('should return same instance', () => {
      const instance1 = MonitoringSystem.getInstance();
      const instance2 = MonitoringSystem.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    it('should reset singleton correctly', () => {
      const instance1 = MonitoringSystem.getInstance();
      
      MonitoringSystem.reset();
      
      const instance2 = MonitoringSystem.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });
});

