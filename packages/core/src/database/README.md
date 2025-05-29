# VoltAgent Database Event Storage System

**Phase 1.3: Setup Database Event Storage System**

A comprehensive PostgreSQL-based event storage system for tracking all development activities, AI interactions, and system events with high-throughput capabilities (1000+ events per minute).

## 🏗️ Architecture

The database system consists of four main components:

### 📊 Database Schema
- **Events**: Store all system activities with JSONB data and correlation tracking
- **Requirements**: Manage PRD breakdown with complexity scoring and dependencies
- **Tasks**: Hierarchical task management with parent-child relationships
- **Correlations**: Cross-platform relationship mapping (Linear, GitHub, etc.)

### 🔧 Models
- **EventsModel**: Full CRUD operations for events with batch processing
- **RequirementsModel**: Requirement management with dependency tracking
- **TasksModel**: Hierarchical task operations with circular reference prevention
- **CorrelationsModel**: Cross-platform correlation management

### 🚀 Services
- **EventStorageService**: High-throughput event storage with batch processing
- **RequirementParserService**: PRD analysis and automatic task generation
- **AnalyticsService**: Development metrics and performance insights

### 🔄 Migration System
- Versioned database migrations with rollback support
- Automated schema setup and index optimization
- Data integrity constraints and validation

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Database configuration
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=voltagent
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_SSL=false

# Optional: Connection pool settings
export DB_POOL_MAX=20
export DB_IDLE_TIMEOUT=30000
export DB_CONNECTION_TIMEOUT=2000
```

### 2. Install Dependencies

```bash
cd packages/core
npm install
```

### 3. Run Migrations

```bash
npm run migrate
```

### 4. Initialize Database Manager

```typescript
import { createDatabaseManager } from '@voltagent/core';

// Initialize with environment variables
const dbManager = await createDatabaseManager();

// Or with custom config
const dbManager = await createDatabaseManager({
  host: 'localhost',
  port: 5432,
  database: 'voltagent',
  user: 'postgres',
  password: 'password',
  ssl: false
});
```

## 📖 Usage Examples

### Event Storage

```typescript
const eventService = dbManager.getEventStorageService();

// Store single event
const event = await eventService.storeEvent({
  event_type: 'agent_activity',
  source: 'agent',
  agent_id: 'agent-123',
  data: {
    action: 'task_completed',
    task_id: 'task-456',
    duration: 1200
  }
});

// High-throughput batch storage
const events = await eventService.storeEventsBatch([
  {
    event_type: 'tool_usage',
    source: 'tool',
    agent_id: 'agent-123',
    data: { tool: 'search', query: 'example' }
  },
  // ... more events
]);

// Queue events for batch processing (recommended for high volume)
eventService.queueEvent({
  event_type: 'memory_operation',
  source: 'memory',
  data: { operation: 'store', key: 'user_123' }
});
```

### Requirement Management

```typescript
const requirementsModel = dbManager.getRequirementsModel();

// Create requirement
const requirement = await requirementsModel.create({
  title: 'User Authentication System',
  description: 'Implement secure user login and registration',
  complexity_score: 75,
  status: 'pending',
  dependencies: ['req-001', 'req-002']
});

// Update complexity score automatically
await requirementsModel.updateComplexityScore(requirement.id);
```

### Task Hierarchy Management

```typescript
const tasksModel = dbManager.getTasksModel();

// Create parent task
const parentTask = await tasksModel.create({
  requirement_id: requirement.id,
  title: 'Implement Authentication API',
  description: 'Build REST API for user authentication',
  status: 'todo',
  priority: 8
});

// Create child task
const childTask = await tasksModel.create({
  requirement_id: requirement.id,
  parent_task_id: parentTask.id,
  title: 'Design API endpoints',
  description: 'Define authentication API endpoints',
  status: 'todo',
  priority: 7
});

// Get task hierarchy
const hierarchy = await tasksModel.getTaskHierarchy(parentTask.id);
```

### PRD Parsing and Analysis

```typescript
const parserService = dbManager.getRequirementParserService();

// Parse PRD document
const prdDocument = {
  title: 'User Management System',
  content: `
    # User Management System

    ## Requirements
    - User registration with email verification
    - Secure password authentication
    - Role-based access control
    - User profile management

    ## Technical Requirements
    - RESTful API design
    - PostgreSQL database
    - JWT token authentication
    - Rate limiting and security
  `,
  sections: []
};

const breakdown = await parserService.parsePRD(prdDocument, {
  include_task_breakdown: true,
  generate_subtasks: true,
  estimate_effort: true
});

// Store parsed requirements and tasks
const { requirements, tasks } = await parserService.storeRequirements(
  breakdown,
  'project-123'
);
```

### Analytics and Insights

```typescript
const analyticsService = dbManager.getAnalyticsService();

// Get development metrics
const metrics = await analyticsService.getDevelopmentMetrics({
  start_date: new Date('2024-01-01'),
  end_date: new Date(),
  agent_id: 'agent-123'
});

// Get agent performance
const agentMetrics = await analyticsService.getAgentPerformanceMetrics('agent-123');

// Get activity trends
const trends = await analyticsService.getActivityTrends({
  start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  include_trends: true
});

// Get performance insights
const insights = await analyticsService.getPerformanceInsights({
  include_insights: true
});
```

### Correlation Management

```typescript
const correlationsModel = dbManager.getCorrelationsModel();

// Create Linear issue correlation
const correlation = await correlationsModel.createLinearIssueCorrelation(
  'task-123',
  'ZAM-854',
  { issue_title: 'Database Event Storage System' }
);

// Create GitHub PR correlation
await correlationsModel.createGithubPrCorrelation(
  'task-123',
  130,
  { pr_title: 'Implement database event storage' }
);

// Find task by Linear issue
const taskId = await correlationsModel.findTaskByLinearIssue('ZAM-854');
```

## 🔧 Configuration

### Database Connection

```typescript
import { DatabaseConfig } from '@voltagent/core';

const config: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'voltagent',
  user: 'postgres',
  password: 'password',
  ssl: false,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 2000 // 2 seconds
};
```

### Event Storage Configuration

```typescript
// High-throughput configuration
const eventService = new EventStorageService(connection);

// Events are automatically batched and processed every 1 second
// or when batch reaches 100 events, whichever comes first

// Get performance metrics
const metrics = eventService.getMetrics();
console.log(`Events per minute: ${metrics.eventsPerMinute}`);
console.log(`Average processing time: ${metrics.averageProcessingTime}ms`);
```

## 📊 Database Schema

### Events Table
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB NOT NULL,
    correlation_id UUID,
    agent_id VARCHAR(100),
    history_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Requirements Table
```sql
CREATE TABLE requirements (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    complexity_score INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    dependencies JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    requirement_id UUID REFERENCES requirements(id),
    parent_task_id UUID REFERENCES tasks(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    assigned_agent VARCHAR(50),
    priority INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Correlations Table
```sql
CREATE TABLE correlations (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    linear_issue_id VARCHAR(100),
    github_pr_number INTEGER,
    correlation_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Performance Features

### High-Throughput Event Storage
- **Batch Processing**: Events are automatically batched for optimal performance
- **Connection Pooling**: Configurable connection pool with up to 20 concurrent connections
- **Async Operations**: Non-blocking event queuing and processing
- **Performance Monitoring**: Built-in metrics tracking for events per minute

### Optimized Queries
- **Indexed Fields**: All frequently queried fields have optimized indexes
- **JSONB Support**: Efficient JSON querying with GIN indexes
- **Composite Indexes**: Optimized for common query patterns
- **Query Performance**: Sub-millisecond query times for most operations

### Scalability
- **Horizontal Scaling**: Connection pooling supports multiple application instances
- **Data Partitioning**: Ready for table partitioning by date/agent
- **Cleanup Utilities**: Built-in old data cleanup for maintenance
- **Monitoring**: Comprehensive analytics and performance insights

## 🔍 Monitoring and Analytics

### Built-in Metrics
- Total events, requirements, tasks, and correlations
- Events per minute and processing times
- Task completion rates and average durations
- Agent activity scores and performance metrics

### Performance Insights
- Bottleneck identification
- Productivity trend analysis
- Risk factor detection
- Automated recommendations

### Trend Analysis
- Events over time
- Task completion trends
- Requirements progress
- Agent activity patterns

## 🛠️ Maintenance

### Database Cleanup
```typescript
// Clean up old events (older than 30 days)
const deletedCount = await eventService.cleanupOldEvents(30);
console.log(`Cleaned up ${deletedCount} old events`);
```

### Migration Management
```bash
# Run migrations
npm run migrate

# Check migration status
node -e "
const { MigrationRunner } = require('./dist/database/migrations/runner');
const runner = new MigrationRunner(config);
runner.getMigrationStatus().then(console.log);
"
```

### Performance Monitoring
```typescript
// Get database statistics
const stats = await dbManager.getStatistics();
console.log('Database Stats:', stats);

// Get connection pool stats
const poolStats = dbManager.getConnection().getPoolStats();
console.log('Pool Stats:', poolStats);
```

## 🔒 Security Features

- **SQL Injection Prevention**: Parameterized queries throughout
- **Data Validation**: Comprehensive input validation and constraints
- **Connection Security**: SSL support and secure connection handling
- **Access Control**: Role-based access patterns ready for implementation

## 🧪 Testing

```bash
# Run database tests
npm test

# Test database connection
node -e "
const { createDatabaseManager } = require('./dist/database');
createDatabaseManager().then(db => db.testConnection()).then(console.log);
"
```

## 📚 API Reference

For detailed API documentation, see the TypeScript interfaces and JSDoc comments in the source files:

- [Models API](./models/)
- [Services API](./services/)
- [Migration API](./migrations/)
- [Connection API](./connection.ts)

## 🤝 Contributing

When contributing to the database module:

1. **Migrations**: Always create new migration files for schema changes
2. **Testing**: Add tests for new models and services
3. **Documentation**: Update this README for new features
4. **Performance**: Consider performance impact of new queries
5. **Validation**: Add proper input validation and error handling

## 📄 License

This database module is part of VoltAgent and follows the same MIT license.

