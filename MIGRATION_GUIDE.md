# 🔄 Migration Guide: PR Consolidation

This guide helps you migrate from the individual PR implementations to the consolidated VoltAgent system.

## Overview

The consolidation combines functionality from 20+ PRs into a unified, maintainable system:

- **Before**: 20 separate PRs with overlapping functionality
- **After**: Single consolidated system with unified API

## Quick Migration

### 1. Update Imports

```typescript
// Before (Multiple PRs)
import { WorkflowEngine } from '@voltagent/workflow';
import { DependencyManager } from '@voltagent/dependency';
import { Progress } from '@voltagent/progress';
import { SynchronizationManager } from '@voltagent/synchronization';

// After (Consolidated)
import { createVoltAgent } from '@voltagent/core';
```

### 2. Update Configuration

```typescript
// Before (Multiple config files)
const workflowConfig = { /* workflow config */ };
const dependencyConfig = { /* dependency config */ };
const progressConfig = { /* progress config */ };

// After (Unified config)
const voltAgent = createVoltAgent({
  workflow: { /* workflow config */ },
  dependency: { /* dependency config */ },
  progress: { /* progress config */ },
  synchronization: { /* sync config */ },
});
```

### 3. Update API Calls

```typescript
// Before (Separate managers)
const workflowEngine = new WorkflowEngine(workflowConfig);
const dependencyManager = new DependencyManager(dependencyConfig);
const progressTracker = new Progress(progressConfig);

// After (Unified interface)
const voltAgent = createVoltAgent(config);
const engine = voltAgent.getEngine();
```

## Detailed Migration by PR

### PR #27: Parallel Execution Engine → Core Workflow

#### Before
```typescript
import { createWorkflowEngine, createTask, createWorkflow } from '@voltagent/workflow';

const engine = createWorkflowEngine();
const task = createTask('task-1', 'Task 1', async () => {});
const workflow = createWorkflow('workflow-1', 'Workflow 1').addTask(task).build();
await engine.executeWorkflow(workflow);
```

#### After
```typescript
import { createVoltAgent } from '@voltagent/core';

const voltAgent = createVoltAgent();
const task = voltAgent.createTask('task-1', 'Task 1')
  .execute(async () => {})
  .build();
const workflow = voltAgent.createWorkflow('workflow-1', 'Workflow 1')
  .addTask(task)
  .build();
await voltAgent.runWorkflow(workflow);
```

### PR #26: Dependency Management → Integrated Dependencies

#### Before
```typescript
import { DependencyManager, DependencyType } from '@voltagent/dependency';

const dependencyManager = new DependencyManager();
const task = dependencyManager.createTask({ name: 'Task A' });
dependencyManager.createDependency({
  predecessorId: 'task-a',
  dependentId: 'task-b',
  type: DependencyType.FINISH_TO_START,
});
const visualization = dependencyManager.visualize({ format: 'mermaid' });
```

#### After
```typescript
import { createVoltAgent, DependencyTypes } from '@voltagent/core';

const voltAgent = createVoltAgent();
const taskA = voltAgent.createTask('task-a', 'Task A').execute(async () => {}).build();
const taskB = voltAgent.createTask('task-b', 'Task B')
  .dependencies(['task-a'])
  .execute(async () => {})
  .build();
const visualization = voltAgent.visualizeDependencies('workflow-id', 'mermaid');
```

### PR #29: Progress Tracking → Integrated Progress

#### Before
```typescript
import { Progress, MilestoneStatus } from '@voltagent/progress';

const progress = new Progress();
await progress.registerMilestone({
  id: 'milestone-1',
  name: 'Milestone 1',
  workflowId: 'workflow-1',
});
await progress.updateMilestoneState('milestone-1', {
  status: MilestoneStatus.COMPLETED,
});
const metric = await progress.calculateMetric('workflow-1', 'overall_progress');
```

#### After
```typescript
import { createVoltAgent } from '@voltagent/core';

const voltAgent = createVoltAgent();
const engine = voltAgent.getEngine();
await engine.registerMilestone({
  id: 'milestone-1',
  name: 'Milestone 1',
  workflowId: 'workflow-1',
});
await engine.updateMilestoneStatus('milestone-1', 'completed');
const progress = await voltAgent.getProgress('workflow-1');
```

### PR #30: Synchronization → Integrated Sync

#### Before
```typescript
import { SynchronizationManager, ConflictType } from '@voltagent/synchronization';

const syncManager = new SynchronizationManager();
const barrier = syncManager.createBarrier({ parties: 2 });
await barrier.wait('workstream-1');
const conflict = syncManager.detectConflict(
  'sync-point-1',
  ['stream1', 'stream2'],
  'Data conflict',
  ConflictType.DATA_CONFLICT
);
await syncManager.resolveConflict(conflict.id);
```

#### After
```typescript
import { createVoltAgent } from '@voltagent/core';

const voltAgent = createVoltAgent();
const engine = voltAgent.getEngine();
const syncPoint = voltAgent.createSyncPoint('sync-1', 'Sync Point', ['stream1', 'stream2']);
await engine.waitAtSyncPoint('sync-1', 'stream1');
const conflict = engine.detectConflict('sync-1', ['stream1', 'stream2'], 'Data conflict', 'data_conflict');
await engine.resolveConflict(conflict.id);
```

### PR #28: API Layer → Optional Module

#### Before
```typescript
import { WorkflowAPI } from '@voltagent/api';

const api = new WorkflowAPI();
app.use('/api', api.router);
```

#### After
```typescript
import { createVoltAgent } from '@voltagent/core';
// API layer becomes optional - enable via configuration
const voltAgent = createVoltAgent({
  api: {
    enableREST: true,
    enableGraphQL: true,
    version: 'v1',
  },
});
```

### PRs #33-38: CI/CD → Unified CI/CD

#### Before (Multiple CI/CD implementations)
```typescript
// Different approaches across PRs #33-38
import { ClaudeCodeValidator } from './pr-35/validator';
import { WSL2Manager } from './pr-36/wsl2';
import { CICDPipeline } from './pr-37/pipeline';
```

#### After (Unified CI/CD)
```typescript
import { createVoltAgent } from '@voltagent/core';

const voltAgent = createVoltAgent({
  cicd: {
    enableClaudeValidation: true,
    enableWSL2: true,
    enableSecurityAnalysis: true,
    deploymentStrategy: 'wsl2',
  },
});
```

## Configuration Migration

### Environment Variables

#### Before (Multiple prefixes)
```bash
# PR #27
WORKFLOW_CONCURRENCY_LIMIT=10
WORKFLOW_TIMEOUT=30000

# PR #26
DEPENDENCY_ENABLE_VALIDATION=true
DEPENDENCY_VISUALIZATION_FORMAT=mermaid

# PR #29
PROGRESS_REAL_TIME_UPDATES=true
PROGRESS_METRIC_INTERVAL=5000
```

#### After (Unified prefix)
```bash
# Consolidated
VOLTAGENT_WORKFLOW_CONCURRENCY_LIMIT=10
VOLTAGENT_WORKFLOW_DEFAULT_TIMEOUT=30000
VOLTAGENT_DEPENDENCY_ENABLE_VALIDATION=true
VOLTAGENT_PROGRESS_REAL_TIME_UPDATES=true
```

### Configuration Files

#### Before (Multiple files)
```
config/
├── workflow.json
├── dependency.json
├── progress.json
└── synchronization.json
```

#### After (Single file)
```
config/
└── voltagent.json
```

```json
{
  "workflow": { /* workflow config */ },
  "dependency": { /* dependency config */ },
  "progress": { /* progress config */ },
  "synchronization": { /* sync config */ }
}
```

## Breaking Changes

### 1. Import Paths
- **Old**: `@voltagent/workflow`, `@voltagent/dependency`, etc.
- **New**: `@voltagent/core`

### 2. Configuration Structure
- **Old**: Separate config objects
- **New**: Unified config object with nested sections

### 3. API Methods
- **Old**: Separate manager instances
- **New**: Single VoltAgent instance with unified API

### 4. Event Names
- **Old**: Different event naming conventions per PR
- **New**: Consistent `module:action` naming convention

## Migration Checklist

### Phase 1: Preparation
- [ ] Audit current usage of individual PR features
- [ ] Identify configuration dependencies
- [ ] Plan migration timeline
- [ ] Set up testing environment

### Phase 2: Code Migration
- [ ] Update import statements
- [ ] Consolidate configuration files
- [ ] Update API calls to use unified interface
- [ ] Update event listeners
- [ ] Update environment variables

### Phase 3: Testing
- [ ] Test workflow execution
- [ ] Test dependency management
- [ ] Test progress tracking
- [ ] Test synchronization features
- [ ] Test visualization generation
- [ ] Performance testing

### Phase 4: Deployment
- [ ] Update deployment scripts
- [ ] Update documentation
- [ ] Train team on new API
- [ ] Monitor for issues

## Common Migration Issues

### Issue 1: Configuration Not Found
```typescript
// Problem: Old config structure
const config = {
  concurrencyLimit: 10,
  timeout: 30000,
};

// Solution: Use nested structure
const config = {
  workflow: {
    concurrencyLimit: 10,
    defaultTimeout: 30000,
  },
};
```

### Issue 2: Missing Dependencies
```typescript
// Problem: Implicit dependencies
const taskB = createTask('task-b', 'Task B', async () => {});

// Solution: Explicit dependencies
const taskB = voltAgent.createTask('task-b', 'Task B')
  .dependencies(['task-a'])
  .execute(async () => {})
  .build();
```

### Issue 3: Event Handler Updates
```typescript
// Problem: Old event names
engine.on('taskCompleted', handler);

// Solution: New event names
engine.on('task:completed', handler);
```

## Performance Considerations

### Memory Usage
- **Before**: Multiple manager instances
- **After**: Single consolidated instance (reduced memory footprint)

### Execution Speed
- **Before**: Inter-module communication overhead
- **After**: Direct method calls (improved performance)

### Bundle Size
- **Before**: Multiple packages
- **After**: Single optimized package (smaller bundle)

## Support and Resources

### Documentation
- [API Reference](./docs/api-reference.md)
- [Configuration Guide](./docs/configuration.md)
- [Examples](./examples/)

### Community
- [Discord Server](https://discord.gg/voltagent)
- [GitHub Discussions](https://github.com/VoltAgent/voltagent/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/voltagent)

### Migration Support
- **Timeline**: 6-month support period for legacy APIs
- **Assistance**: Migration support available via Discord
- **Tools**: Automated migration scripts (coming soon)

## Timeline

### Immediate (Week 1-2)
- Review migration guide
- Plan migration approach
- Set up testing environment

### Short-term (Week 3-6)
- Implement code changes
- Update configuration
- Comprehensive testing

### Medium-term (Week 7-12)
- Deploy to staging
- Performance optimization
- Team training

### Long-term (Month 4-6)
- Production deployment
- Monitor performance
- Deprecate legacy APIs

---

**Need Help?** Join our [Discord community](https://discord.gg/voltagent) for migration support!

