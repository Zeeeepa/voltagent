# VoltAgent Workflow Orchestration Example

This example demonstrates the comprehensive workflow orchestration system integrated into VoltAgent. It shows how to create, execute, and monitor AI-driven CI/CD workflows that coordinate multiple components to transform natural language requirements into validated, production-ready code.

## Features Demonstrated

- **Workflow Creation**: Create workflows from natural language requirements
- **Step Execution**: Coordinate NLP analysis, task creation, code generation, and validation
- **State Management**: Track workflow states and transitions
- **Event-Driven Architecture**: Real-time component coordination
- **Error Handling**: Automatic retry mechanisms and error recovery
- **Monitoring**: Real-time progress tracking and analytics
- **API Integration**: RESTful API with WebSocket support

## Quick Start

### Prerequisites

- Node.js 18+ 
- TypeScript
- VoltAgent Core package

### Installation

```bash
# Install dependencies
npm install

# Run the example
npm start
```

### Running Individual Examples

```bash
# Basic workflow example
tsx basic-example.ts

# Development mode with auto-reload
npm run dev
```

## Examples Included

### 1. Basic Workflow Creation and Execution

Demonstrates the fundamental workflow orchestration capabilities:

```typescript
import { createWorkflowOrchestrator } from '@voltagent/core';

const orchestrator = createWorkflowOrchestrator({
  nlpEngine: new MockNLPEngine(),
  codegenIntegration: new MockCodegenIntegration(),
  validationEngine: new MockValidationEngine(),
  taskStorage: new MockTaskStorage()
});

// Create workflow
const workflow = await orchestrator.createWorkflow(
  "Build a user authentication system with JWT tokens",
  { framework: "Express.js", database: "PostgreSQL" }
);

// Start execution
await orchestrator.startWorkflow(workflow.workflow_id);
```

**Features shown:**
- Workflow creation from requirements
- Component integration
- Event handling
- Progress monitoring

### 2. Complete CI/CD Integration

Shows the full integration with all VoltAgent components:

```typescript
import { VoltAgentWorkflowIntegration } from '@voltagent/core';

const integration = new VoltAgentWorkflowIntegration({
  nlpEngine: myNLPEngine,
  codegenIntegration: myCodegenClient,
  validationEngine: myValidationEngine,
  taskStorage: myTaskStorage
});

// Create and start with monitoring
const { workflowId, stopMonitoring } = await integration.createAndStartWorkflow(
  "Create a REST API for user management",
  { language: "TypeScript", framework: "Express" }
);
```

**Features shown:**
- Complete system integration
- Real-time monitoring
- Status updates
- Resource cleanup

### 3. API Server with Real-time Monitoring

Demonstrates the RESTful API server with WebSocket support:

```typescript
import { createCICDServer } from '@voltagent/core';

const server = await createCICDServer({
  port: 3001,
  nlpEngine: myNLPEngine,
  codegenIntegration: myCodegenClient,
  validationEngine: myValidationEngine
});
```

**API Endpoints:**
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/:id/status` - Get status
- `POST /api/v1/workflows/:id/start` - Start workflow
- `POST /api/v1/workflows/:id/pause` - Pause workflow
- `POST /api/v1/workflows/:id/resume` - Resume workflow
- `POST /api/v1/workflows/:id/cancel` - Cancel workflow
- `GET /api/v1/analytics/workflows` - Get analytics
- `WebSocket /api/v1/workflows/:id/stream` - Real-time updates

### 4. Error Handling and Recovery

Shows robust error handling with automatic retry mechanisms:

```typescript
class ErrorProneCodegen extends MockCodegenIntegration {
  async generateCode(task: any) {
    if (this.attemptCount <= 2) {
      throw new Error('Network timeout - recoverable error');
    }
    return super.generateCode(task);
  }
}
```

**Features shown:**
- Automatic retry logic
- Error classification (recoverable vs non-recoverable)
- Exponential backoff
- Workflow recovery

## Workflow Steps

The example demonstrates a complete workflow with these steps:

### 1. Analysis Step
- **Input**: Natural language requirement
- **Process**: NLP analysis to extract tasks and complexity
- **Output**: Structured analysis with task breakdown

### 2. Task Creation Step
- **Input**: Analysis results
- **Process**: Create atomic, executable tasks
- **Output**: List of tasks with priorities and dependencies

### 3. Code Generation Steps
- **Input**: Individual tasks
- **Process**: Generate code using AI codegen
- **Output**: Generated files, PR URLs, branch names

### 4. Validation Steps
- **Input**: Generated code
- **Process**: Validate code quality and functionality
- **Output**: Validation results, suggestions, scores

### 5. Completion Step
- **Input**: All validation results
- **Process**: Aggregate results and finalize workflow
- **Output**: Complete workflow summary

## Mock Components

The example includes mock implementations of external components:

### MockNLPEngine
Simulates natural language processing for requirement analysis.

### MockCodegenIntegration
Simulates AI-powered code generation with realistic delays.

### MockValidationEngine
Simulates code validation with quality scoring.

### MockTaskStorage
Simulates task storage and retrieval system.

## Event System

The workflow system uses an event-driven architecture:

```typescript
orchestrator.on('workflow_created', (data) => {
  console.log(`Workflow created: ${data.workflow_id}`);
});

orchestrator.on('workflow_progress', (event) => {
  console.log(`Progress: ${event.progress}% - ${event.message}`);
});

orchestrator.on('workflow_completed', (event) => {
  console.log(`Completed in ${event.duration}ms`);
});
```

**Available Events:**
- `workflow_created` - Workflow creation
- `workflow_started` - Workflow execution start
- `workflow_progress` - Progress updates
- `workflow_completed` - Successful completion
- `workflow_failed` - Workflow failure
- `workflow_step_failed` - Individual step failure
- `workflow_step_retry` - Step retry attempts

## Configuration

### Environment Variables

```bash
# Workflow Configuration
WORKFLOW_MAX_CONCURRENT_STEPS=10
WORKFLOW_STEP_TIMEOUT=300000
WORKFLOW_ENABLE_PARALLEL_EXECUTION=true
WORKFLOW_DEFAULT_MAX_RETRIES=3
WORKFLOW_RETRY_DELAY_MS=5000

# Event System
EVENT_SYSTEM_ENABLED=true
EVENT_QUEUE_SIZE=1000
EVENT_PROCESSING_BATCH_SIZE=10

# Monitoring
WORKFLOW_METRICS_ENABLED=true
WORKFLOW_ANALYTICS_ENABLED=true
```

### Programmatic Configuration

```typescript
const orchestrator = createWorkflowOrchestrator({
  maxConcurrentSteps: 5,
  stepTimeout: 600000, // 10 minutes
  enableParallelExecution: true,
  retryDelay: 10000 // 10 seconds
});
```

## Monitoring and Analytics

### Real-time Monitoring

```typescript
const monitor = new WorkflowMonitor();
const stopMonitoring = monitor.startMonitoring(workflowId);

// Get live metrics
const metrics = monitor.getWorkflowMetrics(workflowId);
```

### Analytics Dashboard

```typescript
const analytics = orchestrator.getWorkflowAnalytics();
console.log({
  totalWorkflows: analytics.totalWorkflows,
  completedWorkflows: analytics.completedWorkflows,
  averageDuration: analytics.averageDuration,
  stepSuccessRate: analytics.stepSuccessRate
});
```

## WebSocket Integration

Real-time updates via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3001/api/v1/workflows/workflow-id/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

## Testing

Run the test suite:

```bash
npm test
```

The tests cover:
- Workflow creation and execution
- State transitions
- Event handling
- Error scenarios
- API endpoints

## Production Considerations

When using this in production:

1. **Replace Mock Components**: Implement real NLP, codegen, and validation services
2. **Database Integration**: Add PostgreSQL or other database for persistence
3. **Authentication**: Implement proper API authentication
4. **Rate Limiting**: Add rate limiting for API endpoints
5. **Monitoring**: Set up comprehensive monitoring and alerting
6. **Scaling**: Consider horizontal scaling for high throughput
7. **Security**: Implement proper security measures

## Integration with VoltAgent

This workflow system integrates seamlessly with VoltAgent:

```typescript
import { Agent, VoltAgent } from '@voltagent/core';

// Create agent with workflow capabilities
const cicdAgent = new Agent({
  name: 'CI/CD Orchestrator',
  instructions: 'Coordinate AI-driven development workflows',
  llm: myLLMProvider
});

// Add workflow tools
const workflow = new VoltAgentWorkflowIntegration();
cicdAgent.addTool(workflow.createWorkflowTool());

// Create VoltAgent instance
const voltAgent = new VoltAgent({
  agents: { cicdAgent },
  port: 3000
});
```

## Contributing

To contribute to this example:

1. Fork the repository
2. Create a feature branch
3. Add your improvements
4. Include tests for new functionality
5. Update documentation
6. Submit a pull request

## License

This example is part of the VoltAgent project and follows the same license terms.

## Support

For questions and support:
- Check the VoltAgent documentation
- Open an issue on GitHub
- Join the community discussions

---

This example demonstrates the power of VoltAgent's workflow orchestration system for creating sophisticated AI-driven CI/CD pipelines. The system provides the coordination layer needed to transform natural language requirements into production-ready code through intelligent orchestration of multiple AI components.

