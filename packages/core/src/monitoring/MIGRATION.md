# Migration Guide: Consolidating Monitoring & Analytics

This guide helps you migrate from the separate monitoring and analytics systems to the unified VoltAgent monitoring system.

## 🎯 Migration Overview

The unified monitoring system consolidates:

- CLI analytics (`packages/cli/src/utils/analytics.ts`)
- Create-app analytics (`packages/create-voltagent-app/src/utils/analytics.ts`)
- Existing telemetry system (`packages/core/src/telemetry/`)
- OpenTelemetry integration (`packages/core/src/agent/open-telemetry/`)
- Event system (`packages/core/src/events/`)

## 📦 Package-by-Package Migration

### 1. CLI Package Migration

#### Before (packages/cli/src/utils/analytics.ts)

```typescript
import { captureInitEvent, captureError, captureUpdateEvent, captureWhoamiEvent } from "../utils/analytics";

// Initialize event
await captureInitEvent({ packageManager: 'npm' });

// Error event
await captureError({ command: 'init', errorMessage: 'Failed to initialize' });

// Update event
await captureUpdateEvent({ hadUpdates: true });

// Whoami event
await captureWhoamiEvent({ numVoltPackages: 5 });
```

#### After (Unified System)

```typescript
import { cliAnalytics } from '@voltagent/core/monitoring';

// Initialize event
await cliAnalytics.captureInitEvent({ packageManager: 'npm' });

// Error event
await cliAnalytics.captureError({ command: 'init', errorMessage: 'Failed to initialize' });

// Update event
await cliAnalytics.captureUpdateEvent({ hadUpdates: true });

// Whoami event
await cliAnalytics.captureWhoamiEvent({ numVoltPackages: 5 });

// New: Enhanced command tracking
await cliAnalytics.captureCommandUsage({
  command: 'init',
  subcommand: 'project',
  flags: ['--typescript'],
  duration: 5000,
  success: true,
});
```

### 2. Create-App Package Migration

#### Before (packages/create-voltagent-app/src/utils/analytics.ts)

```typescript
import { captureProjectCreation, captureError } from "./utils/analytics";

// Project creation
await captureProjectCreation({
  projectName: 'my-app',
  packageManager: 'npm',
  typescript: true,
  fromExample: 'basic',
});

// Error
await captureError({
  projectName: 'my-app',
  errorMessage: 'Failed to create project',
});
```

#### After (Unified System)

```typescript
import { cliAnalytics } from '@voltagent/core/monitoring';

// Project creation
await cliAnalytics.captureProjectCreation({
  projectName: 'my-app',
  packageManager: 'npm',
  typescript: true,
  fromExample: 'basic',
});

// Error
await cliAnalytics.captureError({
  command: 'create',
  errorMessage: 'Failed to create project',
  context: { projectName: 'my-app' },
});
```

### 3. Agent Integration Migration

#### Before (Manual tracking)

```typescript
// Manual event tracking
console.log('Agent operation started');
const startTime = Date.now();

try {
  const result = await performOperation();
  const duration = Date.now() - startTime;
  console.log(`Operation completed in ${duration}ms`);
} catch (error) {
  console.error('Operation failed:', error);
}
```

#### After (Integrated Monitoring)

```typescript
import { AgentMonitoringIntegration } from '@voltagent/core/monitoring';

const monitoring = new AgentMonitoringIntegration('my-agent-id');

const operationId = monitoring.startOperation('chat_completion');

try {
  const result = await performOperation();
  
  await monitoring.endOperation(operationId, {
    success: true,
    usage: { promptTokens: 100, completionTokens: 50 },
  });
} catch (error) {
  await monitoring.endOperation(operationId, {
    success: false,
    error,
  });
}
```

### 4. OpenTelemetry Migration

#### Before (Basic OpenTelemetry)

```typescript
import { startOperationSpan, endOperationSpan } from '../../agent/open-telemetry';

const span = startOperationSpan({
  agentId: 'my-agent',
  agentName: 'ChatAgent',
  operationName: 'process_message',
});

try {
  const result = await processMessage();
  endOperationSpan({ span, status: 'completed', data: { output: result } });
} catch (error) {
  endOperationSpan({ span, status: 'error', data: { error } });
}
```

#### After (Enhanced OpenTelemetry)

```typescript
import { EnhancedOpenTelemetryIntegration } from '@voltagent/core/monitoring';

// Automatic monitoring integration
const result = await EnhancedOpenTelemetryIntegration.withOperationSpan(
  {
    agentId: 'my-agent',
    agentName: 'ChatAgent',
    operationName: 'process_message',
    userId: 'user-123',
  },
  async (span) => {
    return await processMessage();
  }
);
```

### 5. Telemetry System Migration

#### Before (Direct VoltAgentExporter)

```typescript
import { VoltAgentExporter } from '../telemetry/exporter';

const exporter = new VoltAgentExporter({
  baseUrl: 'https://api.example.com',
  publicKey: 'key',
  secretKey: 'secret',
});

await exporter.exportHistoryEntry({
  agent_id: 'agent-1',
  project_id: 'project-1',
  history_id: 'history-1',
  timestamp: new Date().toISOString(),
  type: 'operation',
  status: 'completed',
  input: { message: 'Hello' },
  output: { response: 'Hi there!' },
});
```

#### After (Unified Monitoring)

```typescript
import { monitoring } from '@voltagent/core/monitoring';

// Automatic telemetry export through unified system
await monitoring.trackEvent({
  id: 'unique-event-id',
  timestamp: new Date().toISOString(),
  type: 'agent_operation',
  agentId: 'agent-1',
  properties: {
    project_id: 'project-1',
    history_id: 'history-1',
    input: { message: 'Hello' },
    output: { response: 'Hi there!' },
    status: 'completed',
  },
});
```

## 🔧 Configuration Migration

### Environment Variables

#### Before (Multiple configurations)

```bash
# CLI analytics
VOLTAGENT_TELEMETRY_DISABLED=false

# Telemetry exporter
VOLTAGENT_EXPORTER_BASE_URL=https://api.example.com
VOLTAGENT_EXPORTER_PUBLIC_KEY=key
VOLTAGENT_EXPORTER_SECRET_KEY=secret
```

#### After (Unified configuration)

```bash
# Global telemetry control
VOLTAGENT_TELEMETRY_DISABLED=false

# PostHog analytics
VOLTAGENT_POSTHOG_API_KEY=your_api_key
VOLTAGENT_POSTHOG_HOST=https://us.i.posthog.com

# VoltAgent Exporter
VOLTAGENT_EXPORTER_BASE_URL=https://api.example.com
VOLTAGENT_EXPORTER_PUBLIC_KEY=key
VOLTAGENT_EXPORTER_SECRET_KEY=secret

# OpenTelemetry
VOLTAGENT_OTEL_ENDPOINT=https://otel.example.com
```

### Programmatic Configuration

#### Before (Separate configurations)

```typescript
// CLI analytics config
const posthogClient = new PostHog('api-key', {
  host: 'https://us.i.posthog.com',
  flushAt: 1,
  flushInterval: 0,
});

// Telemetry config
const exporter = new VoltAgentExporter({
  baseUrl: 'https://api.example.com',
  publicKey: 'key',
  secretKey: 'secret',
});
```

#### After (Unified configuration)

```typescript
import { MonitoringSystem } from '@voltagent/core/monitoring';

const monitoring = MonitoringSystem.getInstance({
  enabled: true,
  analyticsEnabled: true,
  telemetryEnabled: true,
  performanceEnabled: true,
  alertingEnabled: true,
  
  posthog: {
    apiKey: 'your_api_key',
    host: 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  },
  
  voltAgentExporter: {
    baseUrl: 'https://api.example.com',
    publicKey: 'key',
    secretKey: 'secret',
  },
  
  opentelemetry: {
    serviceName: 'voltagent-core',
    serviceVersion: '0.1.0',
    endpoint: 'https://otel.example.com',
  },
});

await monitoring.initialize();
```

## 📊 New Capabilities After Migration

### 1. Unified Dashboard

```typescript
const dashboard = monitoring.getDashboard();

// Get system overview
const summary = dashboard.getDashboardSummary();
console.log(`System Health: ${summary.systemHealth}`);
console.log(`Active Alerts: ${summary.activeAlerts}`);
console.log(`Total Metrics: ${summary.totalMetrics}`);

// Export dashboard data
const data = dashboard.exportDashboardData();
```

### 2. Advanced Alerting

```typescript
const core = monitoring.getCore();

// Add custom alert rules
core.alertingSystem?.addRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  description: 'Alert when error rate exceeds 5%',
  condition: {
    metric: 'agent.error.rate',
    operator: 'gt',
    threshold: 0.05,
    timeWindow: 10,
    aggregation: 'avg',
  },
  actions: [
    {
      type: 'webhook',
      config: { url: 'https://alerts.example.com' },
    },
  ],
  enabled: true,
  cooldown: 15,
});

// Listen for alerts
core.on('alertTriggered', (alert) => {
  console.log(`🚨 Alert: ${alert.message}`);
});
```

### 3. Performance Monitoring

```typescript
// Track operation performance
const result = await monitoring.trackAgentOperation(
  'operation-123',
  'agent-456',
  'chat_completion',
  async () => {
    return await performChatCompletion();
  },
  { model: 'gpt-4', temperature: 0.7 }
);

// Get performance metrics
const performanceMonitor = core.performanceMonitor;
const metrics = performanceMonitor?.getCurrentMetrics();
console.log(`Average latency: ${metrics?.latency}ms`);
console.log(`Error rate: ${(metrics?.errorRate || 0) * 100}%`);
```

### 4. Enhanced Analytics

```typescript
// Rich event tracking with automatic metrics
await monitoring.trackEvent({
  id: 'user-interaction-123',
  timestamp: new Date().toISOString(),
  type: 'user_interaction',
  agentId: 'chat-agent',
  userId: 'user-456',
  sessionId: 'session-789',
  properties: {
    interaction_type: 'message',
    message_length: 150,
    response_time: 1200,
    satisfaction_score: 4.5,
  },
  metrics: {
    operationDuration: 1200,
    memoryUsage: 52428800,
    errorRate: 0,
    throughput: 0.83,
    latency: 1200,
  },
});
```

## 🧪 Testing Migration

### Before (No unified testing)

```typescript
// Tests had to mock multiple systems
jest.mock('../utils/analytics');
jest.mock('../telemetry/exporter');
```

### After (Unified testing)

```typescript
import { MonitoringSystem } from '@voltagent/core/monitoring';

// Disable monitoring in tests
const testMonitoring = MonitoringSystem.getInstance({
  enabled: false,
});

// Or use test-specific configuration
const testMonitoring = MonitoringSystem.getInstance({
  enabled: true,
  analyticsEnabled: false,
  telemetryEnabled: false,
  samplingRate: 0,
});

// Reset between tests
afterEach(() => {
  MonitoringSystem.reset();
});
```

## ⚠️ Breaking Changes

### 1. Import Changes

```typescript
// Before
import { captureInitEvent } from '../utils/analytics';
import { VoltAgentExporter } from '../telemetry/exporter';

// After
import { cliAnalytics, monitoring } from '@voltagent/core/monitoring';
```

### 2. API Changes

```typescript
// Before: Direct PostHog capture
client.capture({
  distinctId: 'user',
  event: 'action',
  properties: { key: 'value' },
});

// After: Structured event tracking
await monitoring.trackEvent({
  id: 'unique-id',
  timestamp: new Date().toISOString(),
  type: 'action',
  agentId: 'agent-id',
  userId: 'user',
  properties: { key: 'value' },
});
```

### 3. Configuration Changes

The unified system requires initialization:

```typescript
// Must initialize before use
await monitoring.initialize();
```

## 🚀 Migration Checklist

- [ ] Update imports to use unified monitoring system
- [ ] Replace direct PostHog usage with unified analytics
- [ ] Migrate CLI analytics to `cliAnalytics`
- [ ] Replace manual telemetry with unified tracking
- [ ] Update OpenTelemetry usage to enhanced integration
- [ ] Update environment variables
- [ ] Initialize monitoring system in application startup
- [ ] Update tests to use unified mocking
- [ ] Remove old analytics utility files
- [ ] Update documentation and examples

## 🔍 Validation

After migration, verify:

1. **Events are being tracked**: Check dashboard or logs
2. **Metrics are being collected**: Verify metric collection
3. **Alerts are working**: Test alert conditions
4. **Performance is monitored**: Check performance metrics
5. **No duplicate tracking**: Ensure no double-counting

## 📞 Support

If you encounter issues during migration:

1. Check the [README](./README.md) for detailed usage examples
2. Verify configuration and environment variables
3. Enable debug logging with `NODE_ENV=development`
4. Check monitoring system state with `monitoring.getState()`

The unified monitoring system provides backward compatibility where possible, but some breaking changes are necessary for consolidation benefits.

