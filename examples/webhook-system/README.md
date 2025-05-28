# Webhook Event System Example

This example demonstrates the comprehensive webhook event system that consolidates all webhook handling and event processing functionality.

## Features Consolidated

This webhook system consolidates the following PRs into a single comprehensive solution:

- **PR #48**: GitHub webhook integration
- **PR #49**: Event processing pipeline  
- **PR #58**: Webhook validation system
- **PR #68**: Event routing and distribution
- **PR #79**: Webhook system & event-driven automation
- **PR #89**: GitHub webhook integration & event processing

## System Components

### 1. Webhook Validation System
- HMAC-SHA256 validation (GitHub style)
- HMAC-SHA1 validation
- Simple secret validation
- Custom validation functions
- Comprehensive error handling

### 2. Event Routing and Distribution
- Rule-based routing system
- Priority-based rule execution
- Conditional routing based on payload content
- Agent targeting and tool execution
- Notification system

### 3. Automation Engine
- Event-driven automation rules
- Complex condition evaluation
- Rate limiting and cooldown periods
- Action execution (agent triggers, tool calls, notifications)
- Execution history and statistics

### 4. Webhook Handlers
- GitHub webhook handler with signature validation
- Generic webhook handler for custom integrations
- Configurable validation and processing
- Statistics and health monitoring

## Quick Start

### Basic Setup

```typescript
import { initializeWebhookEventSystem } from "@voltagent/core";

// Initialize the complete webhook system
const webhookSystem = initializeWebhookEventSystem({
  enabled: true,
  basePath: "/webhooks",
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  timeout: 30000
});

console.log("Webhook system initialized:", webhookSystem.health);
```

### GitHub Webhooks

```typescript
import { setupGitHubWebhooks } from "@voltagent/core";

// Setup GitHub webhooks with secret validation
const githubSystem = setupGitHubWebhooks(
  "your-github-webhook-secret",
  "your-agent-id" // Optional: route events to specific agent
);

// The system will automatically:
// - Validate GitHub webhook signatures
// - Route events to the specified agent
// - Create timeline events for tracking
// - Execute automation rules
```

### Custom Webhook Processing

```typescript
import { getWebhookHandler } from "@voltagent/core";

const handler = getWebhookHandler();

// Process a webhook manually
const result = await handler.processWebhook(
  JSON.stringify(payload),
  headers,
  "github", // source
  "push"    // event type
);

console.log("Processing result:", result);
```

## Configuration Examples

### Adding Custom Routing Rules

```typescript
import { getWebhookRouter } from "@voltagent/core";

const router = getWebhookRouter();

// Add a custom routing rule
router.addRule({
  id: "critical-pr-alert",
  name: "Critical Pull Request Alert",
  source: "github",
  eventType: "pull_request",
  condition: (payload) => {
    return payload.data.pull_request.changed_files > 10;
  },
  action: {
    type: "agent_trigger",
    agentId: "code-review-agent"
  },
  priority: 100,
  enabled: true
});
```

### Adding Automation Rules

```typescript
import { getWebhookAutomationEngine } from "@voltagent/core";

const engine = getWebhookAutomationEngine();

// Add a complex automation rule
engine.addRule({
  id: "deployment-notification",
  name: "Deployment Success Notification",
  description: "Notify team when deployment succeeds",
  enabled: true,
  source: "github",
  eventType: "deployment",
  conditions: [
    {
      field: "data.deployment_status.state",
      operator: "equals",
      value: "success"
    },
    {
      field: "data.deployment.environment",
      operator: "equals",
      value: "production"
    }
  ],
  actions: [
    {
      type: "notification",
      notification: {
        message: "🚀 Production deployment successful: {{webhook.data.deployment.sha}}",
        channels: ["slack", "email"]
      }
    },
    {
      type: "agent_trigger",
      agentId: "deployment-monitor-agent"
    }
  ],
  priority: 100,
  cooldown: 300000, // 5 minutes
  tags: ["deployment", "production"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
```

### Custom Webhook Handlers

```typescript
import { getWebhookHandler } from "@voltagent/core";

const handler = getWebhookHandler();

// Add a custom webhook handler
handler.addHandler({
  id: "slack-webhook",
  name: "Slack Webhook Handler",
  source: "custom",
  eventTypes: ["message", "reaction"],
  validation: {
    method: "secret",
    secret: "your-slack-secret",
    signatureHeader: "x-slack-signature"
  },
  enabled: true,
  processor: async (payload) => {
    // Custom processing logic
    console.log("Processing Slack webhook:", payload);
    return { processed: true };
  }
});
```

## API Endpoints

The webhook system automatically adds the following API endpoints:

### Webhook Processing
- `POST /webhooks/github` - Process GitHub webhooks
- `POST /webhooks/generic` - Process generic webhooks

### Management
- `GET /webhooks/handlers` - Get all webhook handlers
- `POST /webhooks/handlers` - Create new webhook handler
- `GET /webhooks/routing-rules` - Get routing rules
- `POST /webhooks/routing-rules` - Create routing rule
- `GET /webhooks/automation-rules` - Get automation rules
- `POST /webhooks/automation-rules` - Create automation rule

### Monitoring
- `GET /webhooks/stats` - Get webhook statistics
- `GET /webhooks/health` - Get system health status

## Event Integration

The webhook system integrates seamlessly with VoltAgent's event system:

```typescript
import { AgentEventEmitter } from "@voltagent/core";

const eventEmitter = AgentEventEmitter.getInstance();

// Listen for webhook events
eventEmitter.onHistoryUpdate((agentId, historyEntry) => {
  if (historyEntry.events?.some(e => e.name.startsWith("webhook:"))) {
    console.log("Webhook event processed:", historyEntry);
  }
});
```

## Statistics and Monitoring

```typescript
import { getWebhookHandler } from "@voltagent/core";

const handler = getWebhookHandler();

// Get comprehensive statistics
const stats = handler.getStats();
console.log("Webhook Statistics:", {
  totalReceived: stats.totalReceived,
  successRate: (stats.totalProcessed / stats.totalReceived) * 100,
  averageProcessingTime: stats.averageProcessingTime,
  bySource: stats.bySource
});

// Check system health
const health = handler.healthCheck();
console.log("System Health:", health.status, health.details);
```

## Error Handling

The webhook system provides comprehensive error handling:

```typescript
try {
  const result = await handler.processWebhook(payload, headers);
  if (!result.success) {
    console.error("Webhook processing failed:", result.error);
    // Handle specific error cases
  }
} catch (error) {
  if (error instanceof WebhookProcessingError) {
    console.error("Webhook error:", error.code, error.message);
  }
}
```

## Security Considerations

1. **Signature Validation**: Always use HMAC validation for production webhooks
2. **Rate Limiting**: Configure rate limits to prevent abuse
3. **Payload Size Limits**: Set appropriate payload size limits
4. **Secret Management**: Store webhook secrets securely
5. **HTTPS Only**: Use HTTPS endpoints in production

## Performance Optimization

1. **Async Processing**: All webhook processing is asynchronous
2. **Event Streaming**: Real-time event updates via WebSocket
3. **Efficient Routing**: Priority-based rule evaluation
4. **Statistics Tracking**: Built-in performance monitoring
5. **Memory Management**: Automatic cleanup of old execution history

## Troubleshooting

### Common Issues

1. **Validation Failures**: Check webhook secrets and signature headers
2. **No Matching Rules**: Verify routing rule conditions
3. **Agent Not Found**: Ensure target agents are registered
4. **Rate Limiting**: Check cooldown periods and rate limits

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
const webhookSystem = initializeWebhookEventSystem({
  enabled: true,
  debug: true // Enable debug logging
});
```

This comprehensive webhook system provides a unified, scalable solution for all webhook processing needs while maintaining the flexibility to handle various webhook sources and automation requirements.

