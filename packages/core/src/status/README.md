# Unified Status Synchronization System

This module consolidates all status synchronization functionality into a single, cohesive system that eliminates duplication and provides consistent status reporting across all channels.

## Overview

The Unified Status Synchronization System addresses the consolidation requirements from PRs #44 and #77 by providing:

- **Zero duplication** in sync logic
- **Consistent status update patterns** across all channels
- **Unified status reporting** with comprehensive error handling
- **Real-time broadcasting** via WebSocket and SSE
- **Linear integration** for seamless issue tracking
- **Pluggable architecture** for extensibility

## Architecture

### Core Components

1. **StatusSynchronizationCoordinator** - Central coordinator for all status updates
2. **RealTimeStatusBroadcaster** - Handles WebSocket and SSE broadcasting
3. **LinearStatusSyncPlugin** - Linear integration for issue status sync
4. **Type System** - Comprehensive type definitions for all status operations

### Status Flow

```
Agent Status Change
        ↓
StatusSynchronizationCoordinator
        ↓
┌─────────────────────────────────────┐
│  Parallel Propagation to Channels  │
├─────────────────────────────────────┤
│ • History Management                │
│ • Real-time Events                  │
│ • Telemetry Reporting              │
│ • WebSocket Broadcasting           │
│ • Linear Integration               │
└─────────────────────────────────────┘
        ↓
Status Update Complete
```

## Usage

### Basic Status Update

```typescript
import { updateAgentStatus } from "@voltagent/core/status";

// Simple status update
await updateAgentStatus("agent-123", "working");

// Status update with metadata
await updateAgentStatus("agent-123", "completed", {
  historyId: "history-456",
  metadata: { result: "success" },
  source: "tool",
  eventName: "task_completed",
});
```

### Real-time Subscriptions

```typescript
import { subscribeToAgentStatus, subscribeToAllStatusChanges } from "@voltagent/core/status";

// Subscribe to specific agent
const unsubscribe = subscribeToAgentStatus("agent-123", (event) => {
  console.log(`Agent ${event.agentId} status changed to ${event.newStatus}`);
});

// Subscribe to all status changes
const unsubscribeAll = subscribeToAllStatusChanges((event) => {
  console.log("Status change:", event);
});

// Cleanup
unsubscribe();
unsubscribeAll();
```

### WebSocket Integration

```typescript
import { addWebSocketConnection, removeWebSocketConnection } from "@voltagent/core/status";

// Add WebSocket connection for real-time updates
addWebSocketConnection("conn-123", websocket, "agent-123");

// Remove connection
removeWebSocketConnection("conn-123");
```

### Linear Integration

```typescript
import { createLinearStatusSync } from "@voltagent/core/status";

const linearSync = createLinearStatusSync({
  apiKey: "your-linear-api-key",
  teamId: "your-team-id",
  statusMappings: [
    {
      agentStatus: "working",
      linearStateId: "in-progress-state-id",
      linearStateName: "In Progress",
      autoTransition: true,
    },
    // ... more mappings
  ],
});

await linearSync.initialize({});
```

## Configuration

### Status Sync Options

```typescript
import { configureStatusSync } from "@voltagent/core/status";

configureStatusSync({
  enableWebSocket: true,
  enableTelemetry: true,
  enableHistory: true,
  enableRealTimeEvents: true,
  batchUpdates: false,
  batchInterval: 100,
});
```

### Batching

Enable batching for high-frequency status updates:

```typescript
configureStatusSync({
  batchUpdates: true,
  batchInterval: 50, // milliseconds
});
```

## Status Types

### Agent Status

```typescript
type AgentStatus = "idle" | "working" | "tool_calling" | "error" | "completed";
```

### Status Update Sources

```typescript
type StatusUpdateSource = "agent" | "tool" | "system" | "external" | "user";
```

### Status Change Reasons

```typescript
enum StatusChangeReason {
  AGENT_STARTED = "agent_started",
  AGENT_COMPLETED = "agent_completed",
  TOOL_EXECUTION = "tool_execution",
  SYSTEM_UPDATE = "system_update",
  // ... more reasons
}
```

## Channels

The system supports multiple synchronization channels:

- **history** - Agent history and timeline events
- **events** - Real-time event emission
- **telemetry** - External telemetry reporting
- **websocket** - WebSocket broadcasting
- **linear** - Linear issue integration

## Error Handling

The system provides comprehensive error handling with partial failure support:

```typescript
const result = await updateAgentStatus("agent-123", "error");

if (!result.success) {
  console.error("Status update failed:", result.errors);
} else if (result.errors?.length > 0) {
  console.warn("Partial failure:", result.errors);
  console.log("Successfully propagated to:", result.propagatedTo);
}
```

## Monitoring

### Health Check

```typescript
import { getStatusSyncHealth } from "@voltagent/core/status";

const health = getStatusSyncHealth();
console.log("System health:", health);
```

### Connection Statistics

```typescript
import { getConnectionStats } from "@voltagent/core/status";

const stats = getConnectionStats();
console.log("Active connections:", stats.totalConnections);
console.log("WebSocket connections:", stats.webSocketConnections);
```

## Migration from Legacy System

### AgentEventEmitter Integration

The legacy `AgentEventEmitter` automatically integrates with the unified system:

```typescript
// Legacy code continues to work
const eventEmitter = AgentEventEmitter.getInstance();
await eventEmitter.addHistoryEvent({
  agentId: "agent-123",
  historyId: "history-456",
  eventName: "status_change",
  status: "working",
  additionalData: { source: "migration" },
  type: "agent",
});

// Automatically uses unified system under the hood
```

### WebSocket Server Integration

The WebSocket server automatically integrates with the unified broadcaster:

```typescript
// WebSocket connections are automatically managed
// by the unified system while maintaining backward compatibility
```

## Plugin Development

### Creating Custom Plugins

```typescript
import type { StatusSyncPlugin } from "@voltagent/core/status";

class CustomStatusPlugin implements StatusSyncPlugin {
  name = "custom-status-sync";
  version = "1.0.0";
  channels = ["custom"] as const;

  async initialize(config: Record<string, any>): Promise<void> {
    // Initialize plugin
  }

  async updateStatus(context: StatusUpdateContext, status: AgentStatus): Promise<void> {
    // Handle status update
  }

  async getStatus(agentId: string): Promise<AgentStatus | null> {
    // Get current status
    return null;
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}
```

## Best Practices

1. **Use the unified API** - Prefer `updateAgentStatus()` over direct coordinator calls
2. **Handle partial failures** - Check `result.errors` for channel-specific failures
3. **Subscribe efficiently** - Use agent-specific subscriptions when possible
4. **Cleanup subscriptions** - Always call unsubscribe functions
5. **Configure appropriately** - Disable unused channels for better performance
6. **Monitor health** - Regularly check system health in production

## Troubleshooting

### Common Issues

1. **Status updates not propagating**
   - Check channel configuration
   - Verify agent exists in registry
   - Check for network connectivity issues

2. **WebSocket connections dropping**
   - Implement reconnection logic
   - Check heartbeat configuration
   - Monitor connection statistics

3. **Linear integration failures**
   - Verify API key and permissions
   - Check status mapping configuration
   - Monitor Linear API rate limits

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG = "voltagent:status:*";

// Or configure programmatically
configureStatusSync({
  enableMetrics: true,
  enableValidation: true,
});
```

## Performance Considerations

- **Batching** - Enable for high-frequency updates
- **Channel selection** - Disable unused channels
- **Connection limits** - Monitor WebSocket connection count
- **Memory usage** - Cleanup stale subscriptions

## Security

- **API keys** - Store Linear API keys securely
- **WebSocket authentication** - Implement connection validation
- **Data sanitization** - Validate status update metadata
- **Rate limiting** - Implement appropriate limits for external APIs

