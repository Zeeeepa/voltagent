# VoltAgent Unified Monitoring & Analytics System

This module provides a comprehensive, consolidated monitoring and analytics system for VoltAgent that unifies all observability components into a single, cohesive platform.

## 🎯 Consolidation Objectives

This system consolidates the following previously separate monitoring components:

- **Performance monitoring system** (PR #51)
- **Analytics and metrics collection** (PR #67)  
- **Real-time monitoring & performance analytics** (PR #71)
- **Comprehensive end-to-end workflow testing** (PR #72)
- **Consolidated monitoring & testing systems** (PR #94)

## ✨ Features

### Core Capabilities

- **Unified Analytics**: Consolidates PostHog analytics from CLI and create-app packages
- **Performance Monitoring**: Real-time tracking of operation duration, memory usage, and throughput
- **Metrics Collection**: Standardized metric collection with buffering and batch processing
- **Alerting System**: Rule-based alerting with configurable thresholds and actions
- **Dashboard System**: Visualization and monitoring dashboard capabilities
- **OpenTelemetry Integration**: Enhanced distributed tracing with monitoring integration

### Zero Duplication

- **Single analytics provider**: Replaces duplicate PostHog implementations
- **Unified metric collection**: Eliminates redundant metrics gathering
- **Consolidated alerting**: Single alerting system across all components
- **Standardized interfaces**: Consistent monitoring contracts throughout

## 🚀 Quick Start

### Basic Usage

```typescript
import { monitoring } from '@voltagent/core/monitoring';

// Initialize the monitoring system
await monitoring.initialize();

// Track events
await monitoring.trackEvent({
  id: 'unique-event-id',
  timestamp: new Date().toISOString(),
  type: 'agent_operation',
  agentId: 'my-agent',
  properties: {
    operation_type: 'chat',
    duration: 1500,
  },
});

// Record metrics
await monitoring.recordMetric({
  name: 'agent.response.time',
  value: 1500,
  timestamp: new Date().toISOString(),
  tags: {
    agent_id: 'my-agent',
    model: 'gpt-4',
  },
  unit: 'milliseconds',
});
```

### Agent Integration

```typescript
import { AgentMonitoringIntegration } from '@voltagent/core/monitoring';

class MyAgent {
  private monitoring: AgentMonitoringIntegration;
  
  constructor(agentId: string) {
    this.monitoring = new AgentMonitoringIntegration(agentId);
  }
  
  async performOperation() {
    const operationId = this.monitoring.startOperation('chat');
    
    try {
      const result = await this.doWork();
      
      await this.monitoring.endOperation(operationId, {
        success: true,
        usage: { promptTokens: 100, completionTokens: 50 },
      });
      
      return result;
    } catch (error) {
      await this.monitoring.endOperation(operationId, {
        success: false,
        error,
      });
      throw error;
    }
  }
}
```

### Enhanced OpenTelemetry

```typescript
import { EnhancedOpenTelemetryIntegration } from '@voltagent/core/monitoring';

// Wrap operations with enhanced tracing
const result = await EnhancedOpenTelemetryIntegration.withOperationSpan(
  {
    agentId: 'my-agent',
    agentName: 'ChatAgent',
    operationName: 'process_message',
    userId: 'user-123',
  },
  async (span) => {
    // Your operation logic here
    return await processMessage();
  }
);
```

### CLI Analytics

```typescript
import { cliAnalytics } from '@voltagent/core/monitoring';

// Track CLI commands
await cliAnalytics.captureCommandUsage({
  command: 'init',
  subcommand: 'project',
  flags: ['--typescript'],
  duration: 5000,
  success: true,
});
```

## ⚙️ Configuration

### Environment Variables

```bash
# Disable telemetry
VOLTAGENT_TELEMETRY_DISABLED=true

# PostHog configuration
VOLTAGENT_POSTHOG_API_KEY=your_api_key
VOLTAGENT_POSTHOG_HOST=https://us.i.posthog.com

# VoltAgent Exporter configuration
VOLTAGENT_EXPORTER_BASE_URL=https://your-exporter.com
VOLTAGENT_EXPORTER_PUBLIC_KEY=your_public_key
VOLTAGENT_EXPORTER_SECRET_KEY=your_secret_key

# OpenTelemetry configuration
VOLTAGENT_OTEL_ENDPOINT=https://your-otel-endpoint.com
```

### Programmatic Configuration

```typescript
import { MonitoringSystem } from '@voltagent/core/monitoring';

const monitoring = MonitoringSystem.getInstance({
  enabled: true,
  analyticsEnabled: true,
  performanceEnabled: true,
  alertingEnabled: true,
  
  samplingRate: 0.1, // 10% sampling
  
  posthog: {
    apiKey: 'your_api_key',
    host: 'https://us.i.posthog.com',
  },
  
  eventFilters: [
    {
      type: 'tool',
      agentIds: ['debug-agent'],
      exclude: true, // Exclude debug agent tool events
    },
  ],
});
```

## 📊 Dashboard & Visualization

### Getting Dashboard Data

```typescript
const dashboard = monitoring.getDashboard();

// Get current system summary
const summary = dashboard.getDashboardSummary();
console.log(summary);
// {
//   totalMetrics: 1250,
//   activeAlerts: 2,
//   systemHealth: 'healthy',
//   uptime: '2h 15m'
// }

// Get metrics for a time range
const metrics = dashboard.getMetricsData(
  'agent.operation.duration',
  {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-01T23:59:59Z',
  }
);

// Export all dashboard data
const exportData = dashboard.exportDashboardData();
```

### Custom Dashboard Widgets

```typescript
dashboard.updateDashboardConfig({
  widgets: [
    {
      id: 'custom-metric',
      type: 'metric',
      title: 'Custom Agent Metric',
      config: {
        metric: 'agent.custom.metric',
        aggregation: 'avg',
      },
      position: { x: 0, y: 0, width: 6, height: 4 },
    },
  ],
});
```

## 🚨 Alerting

### Adding Alert Rules

```typescript
const alerting = monitoring.getCore().alertingSystem;

alerting.addRule({
  id: 'high-latency',
  name: 'High Response Latency',
  description: 'Alert when response time exceeds 5 seconds',
  condition: {
    metric: 'agent.response.time',
    operator: 'gt',
    threshold: 5000,
    timeWindow: 10, // minutes
    aggregation: 'avg',
  },
  actions: [
    {
      type: 'webhook',
      config: {
        url: 'https://your-webhook.com/alerts',
      },
    },
  ],
  enabled: true,
  cooldown: 15, // minutes
});
```

### Handling Alerts

```typescript
monitoring.getCore().on('alertTriggered', (alert) => {
  console.log(`Alert: ${alert.message}`);
  console.log(`Severity: ${alert.severity}`);
  console.log(`Context:`, alert.context);
});

monitoring.getCore().on('alertResolved', (alert) => {
  console.log(`Alert resolved: ${alert.message}`);
});
```

## 🔧 Advanced Usage

### Custom Monitoring Providers

```typescript
import { MonitoringProvider } from '@voltagent/core/monitoring';

class CustomProvider implements MonitoringProvider {
  name = 'CustomProvider';
  
  async initialize(config: any): Promise<void> {
    // Initialize your custom provider
  }
  
  async track(event: AnalyticsEvent): Promise<void> {
    // Handle event tracking
  }
  
  async recordMetric(metric: MetricPoint): Promise<void> {
    // Handle metric recording
  }
  
  async shutdown(): Promise<void> {
    // Cleanup
  }
  
  isHealthy(): boolean {
    return true;
  }
}

// Register the custom provider
monitoring.getCore().registerProvider(new CustomProvider());
```

### Performance Monitoring

```typescript
const performanceMonitor = monitoring.getCore().performanceMonitor;

// Start tracking an operation
performanceMonitor.startOperation('my-operation', {
  userId: 'user-123',
  metadata: { type: 'chat' },
});

// End tracking and get metrics
const metrics = performanceMonitor.endOperation('my-operation', {
  success: true,
});

console.log(metrics);
// {
//   operationDuration: 1500,
//   memoryUsage: 52428800,
//   errorRate: 0,
//   throughput: 0.67,
//   latency: 1500
// }
```

## 🧪 Testing

### Mock Monitoring for Tests

```typescript
import { MonitoringSystem } from '@voltagent/core/monitoring';

// Disable monitoring in tests
const monitoring = MonitoringSystem.getInstance({
  enabled: false,
});

// Or use a test configuration
const testMonitoring = MonitoringSystem.getInstance({
  enabled: true,
  analyticsEnabled: false, // Disable external analytics
  telemetryEnabled: false, // Disable telemetry
  samplingRate: 0, // No sampling in tests
});
```

## 📈 Migration Guide

### From Separate Analytics

If you were using the separate analytics from CLI or create-app packages:

```typescript
// Before (CLI package)
import { captureInitEvent } from '../utils/analytics';
await captureInitEvent({ packageManager: 'npm' });

// After (Unified monitoring)
import { cliAnalytics } from '@voltagent/core/monitoring';
await cliAnalytics.captureInitEvent({ packageManager: 'npm' });
```

### From Direct PostHog Usage

```typescript
// Before
import { PostHog } from 'posthog-node';
const client = new PostHog('api-key');
client.capture({ distinctId: 'user', event: 'action' });

// After
import { monitoring } from '@voltagent/core/monitoring';
await monitoring.trackEvent({
  id: 'unique-id',
  timestamp: new Date().toISOString(),
  type: 'action',
  agentId: 'agent-id',
  userId: 'user',
  properties: {},
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Monitoring not initializing**: Check environment variables and configuration
2. **Events not being tracked**: Verify telemetry is not disabled
3. **High memory usage**: Adjust sampling rate or buffer sizes
4. **Missing metrics**: Check metric filters and ensure proper initialization

### Debug Mode

```typescript
// Enable debug logging
process.env.NODE_ENV = 'development';

// Check monitoring state
const state = monitoring.getState();
console.log('Monitoring state:', state);

// Check health of components
const config = monitoring.getConfig();
console.log('Monitoring config:', config);
```

## 📚 API Reference

### Core Classes

- `MonitoringSystem`: Main singleton class
- `CoreMonitor`: Core monitoring orchestrator
- `MetricsCollector`: Unified metrics collection
- `AnalyticsTracker`: Analytics and event tracking
- `PerformanceMonitor`: Performance monitoring
- `AlertingSystem`: Rule-based alerting
- `DashboardSystem`: Visualization and dashboards

### Integration Classes

- `AgentMonitoringIntegration`: Agent-specific monitoring
- `EnhancedOpenTelemetryIntegration`: Enhanced OpenTelemetry
- `CLIAnalyticsIntegration`: CLI analytics consolidation

### Types

- `MonitoringConfig`: Configuration interface
- `AnalyticsEvent`: Event structure
- `MetricPoint`: Metric data structure
- `AlertRule`: Alert rule definition
- `DashboardWidget`: Dashboard widget configuration

## 🤝 Contributing

When adding new monitoring capabilities:

1. Follow the existing patterns and interfaces
2. Add appropriate tests
3. Update this documentation
4. Ensure zero duplication with existing systems
5. Consider backward compatibility

## 📄 License

This monitoring system is part of the VoltAgent core package and follows the same license terms.

