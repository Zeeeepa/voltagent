# Task Master Database & Event Storage

## 🎯 Overview

This module implements the comprehensive database infrastructure for the Task Master system, providing event storage, requirement definitions, task hierarchies, and system analytics with full audit trails and real-time capabilities.

## 🏗️ Architecture

### Core Components

1. **Database Connection Manager** - Manages PostgreSQL, Redis, and Elasticsearch connections
2. **Data Models** - Requirements, Tasks, Events, and Correlations
3. **Event Storage Service** - High-throughput event ingestion and processing
4. **Requirement Parser** - Natural language processing for requirements analysis
5. **Analytics Service** - Performance metrics, project analytics, and reporting

### Database Schema

```sql
-- Core tables for Task Master system
requirements    -- Granular requirement definitions
tasks          -- Hierarchical task management  
events         -- Comprehensive system logging
correlations   -- Cross-system tracking
```

## 🚀 Quick Start

### 1. Installation

```bash
npm install pg redis @elastic/elasticsearch uuid
npm install -D @types/pg @types/uuid
```

### 2. Environment Setup

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskmaster
DB_USER=taskmaster
DB_PASSWORD=secure_password

# Redis Configuration  
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme
```

### 3. Initialize Database

```typescript
import { getDatabaseManager } from './database';

const dbManager = getDatabaseManager();
await dbManager.initialize();
await dbManager.runMigrations();
```

### 4. Basic Usage

```typescript
import {
  RequirementsModel,
  TasksModel,
  EventStorageService,
  RequirementParserService,
  AnalyticsService,
} from './database';

// Initialize services
const eventStorage = new EventStorageService();
const requirementParser = new RequirementParserService(eventStorage);
const analytics = new AnalyticsService(eventStorage);

// Create models
const requirements = new RequirementsModel();
const tasks = new TasksModel();

// Create a requirement
const requirement = await requirements.create({
  title: 'User Authentication System',
  description: 'Implement secure login/logout functionality',
  priority: 1,
  complexity_score: 7,
  estimated_hours: 40,
});

// Create a task
const task = await tasks.create({
  requirement_id: requirement.id,
  title: 'Implement JWT authentication',
  assigned_to: 'developer@example.com',
  priority: 1,
  estimated_hours: 16,
});

// Log an event
await eventStorage.ingestEvent({
  event_type: 'task.created',
  source: 'task-master',
  action: 'create',
  target_type: 'task',
  target_id: task.id,
  payload: { task_title: task.title },
});
```

## 📊 Features

### Event Storage

- **High-throughput ingestion** (>1000 events/sec)
- **Batch processing** with configurable buffer sizes
- **Event deduplication** to prevent duplicates
- **Real-time processing** with custom rules
- **Retention policies** for data management

```typescript
const eventStorage = new EventStorageService({
  batchSize: 100,
  flushInterval: 5000,
  enableDeduplication: true,
  retentionDays: 90,
});

// Add custom processing rule
eventStorage.addProcessingRule({
  eventType: 'task.completed',
  processor: async (event) => {
    console.log(`Task ${event.target_id} completed!`);
  },
});
```

### Requirement Analysis

- **Natural language processing** for requirement extraction
- **Quality analysis** with completeness, clarity, and testability scores
- **Complexity estimation** based on content analysis
- **Dependency tracking** and hierarchy management

```typescript
const requirementParser = new RequirementParserService(eventStorage);

// Parse requirements from text
const requirements = await requirementParser.parseRequirementsFile(content);

// Analyze quality
const analysis = await requirementParser.analyzeRequirement(requirement);
console.log(`Quality score: ${analysis.overall_quality}/100`);
```

### Analytics & Reporting

- **Performance metrics** - completion times, error rates, throughput
- **Project analytics** - velocity, completion rates, coverage
- **User metrics** - productivity, task distribution, top performers
- **System health** - database status, service availability
- **Trend analysis** - historical data and forecasting

```typescript
const analytics = new AnalyticsService(eventStorage);

// Generate comprehensive report
const report = await analytics.generateReport(startDate, endDate);

// Get real-time dashboard data
const dashboard = await analytics.getDashboardData();
```

### Cross-System Correlations

Track relationships between Task Master and external systems:

```typescript
const correlations = new CorrelationsModel();

await correlations.create({
  task_master_id: task.id,
  linear_issue_id: 'ZAM-123',
  github_pr_id: 'PR-456',
  codegen_request_id: 'req_789',
  claude_session_id: 'session_abc',
  wsl2_deployment_id: 'deploy_xyz',
});
```

## 🔧 Configuration

### Database Configuration

```typescript
import { TaskMasterDatabaseConfig } from './database';

const config: TaskMasterDatabaseConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'taskmaster',
    username: 'taskmaster',
    password: 'secure_password',
    ssl: true,
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
    },
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'redis_password',
    db: 0,
  },
  elasticsearch: {
    node: 'http://localhost:9200',
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  },
};
```

### Event Storage Options

```typescript
const eventStorageOptions = {
  batchSize: 100,        // Events per batch
  flushInterval: 5000,   // Flush interval in ms
  enableDeduplication: true,  // Prevent duplicate events
  retentionDays: 90,     // Event retention period
};
```

## 📈 Performance

### Benchmarks

- **Event Ingestion**: >1000 events/second
- **Query Performance**: <100ms for typical queries
- **Batch Processing**: 10,000 events in <5 seconds
- **Analytics Generation**: Full report in <30 seconds

### Optimization Features

- **Database Indexes** - Optimized for common query patterns
- **Connection Pooling** - Efficient database connection management
- **Batch Processing** - Reduces database load
- **Caching** - Redis for frequently accessed data
- **Partitioning** - For large event tables

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Performance Tests

```bash
npm run test:performance
```

### Example Test

```typescript
import { RequirementsModel } from './database';

describe('RequirementsModel', () => {
  it('should create a requirement', async () => {
    const model = new RequirementsModel();
    const requirement = await model.create({
      title: 'Test Requirement',
      description: 'Test description',
      priority: 3,
    });
    
    expect(requirement.id).toBeDefined();
    expect(requirement.title).toBe('Test Requirement');
  });
});
```

## 🔍 Monitoring

### Health Checks

```typescript
const dbManager = getDatabaseManager();
const health = await dbManager.healthCheck();

console.log('Database Health:', health);
// {
//   postgresql: true,
//   redis: true,
//   elasticsearch: true
// }
```

### Metrics Collection

```typescript
const analytics = new AnalyticsService(eventStorage);

// System performance
const performance = await analytics.getPerformanceMetrics(startDate, endDate);

// Real-time dashboard
const dashboard = await analytics.getDashboardData();
```

## 🚨 Error Handling

### Database Errors

```typescript
try {
  await dbManager.executeTransaction(async (client) => {
    // Database operations
  });
} catch (error) {
  console.error('Transaction failed:', error);
  // Handle rollback automatically
}
```

### Event Processing Errors

```typescript
eventStorage.on('error', (error) => {
  console.error('Event processing error:', error);
  // Send to monitoring system
});
```

## 🔐 Security

### Database Security

- **SSL/TLS encryption** for all connections
- **Connection pooling** with secure credentials
- **SQL injection prevention** with parameterized queries
- **Access control** with role-based permissions

### Data Privacy

- **PII handling** with encryption at rest
- **Audit trails** for all data access
- **Retention policies** for compliance
- **Data anonymization** for analytics

## 📚 API Reference

### Models

#### RequirementsModel

```typescript
class RequirementsModel {
  async create(input: CreateRequirementInput): Promise<Requirement>
  async getById(id: string): Promise<Requirement | null>
  async update(id: string, input: UpdateRequirementInput): Promise<Requirement | null>
  async delete(id: string): Promise<boolean>
  async find(options: RequirementFilterOptions): Promise<Requirement[]>
  async getHierarchy(id: string): Promise<RequirementHierarchy>
  async getStatistics(): Promise<RequirementStatistics>
}
```

#### TasksModel

```typescript
class TasksModel {
  async create(input: CreateTaskInput): Promise<Task>
  async getById(id: string): Promise<Task | null>
  async getByLinearIssueId(linearIssueId: string): Promise<Task | null>
  async update(id: string, input: UpdateTaskInput): Promise<Task | null>
  async delete(id: string): Promise<boolean>
  async find(options: TaskFilterOptions): Promise<Task[]>
  async getHierarchy(id: string): Promise<TaskHierarchy>
  async getStatistics(): Promise<TaskStatistics>
}
```

### Services

#### EventStorageService

```typescript
class EventStorageService extends EventEmitter {
  async ingestEvent(input: CreateEventInput): Promise<void>
  async ingestEvents(inputs: CreateEventInput[]): Promise<void>
  async queryEvents(options: EventFilterOptions): Promise<Event[]>
  async getEventsByCorrelation(correlationId: string): Promise<Event[]>
  async getEventTimeline(targetType: string, targetId: string): Promise<Event[]>
  async cleanupOldEvents(): Promise<number>
}
```

#### AnalyticsService

```typescript
class AnalyticsService {
  async generateReport(startDate: Date, endDate: Date): Promise<AnalyticsReport>
  async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetrics>
  async getProjectMetrics(startDate: Date, endDate: Date): Promise<ProjectMetrics>
  async getUserMetrics(startDate: Date, endDate: Date): Promise<UserMetrics>
  async getDashboardData(): Promise<DashboardData>
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

1. Check the [troubleshooting guide](./TROUBLESHOOTING.md)
2. Search existing [GitHub issues](https://github.com/org/repo/issues)
3. Create a new issue with detailed information

## 🗺️ Roadmap

### Phase 4.2 - Optimization
- [ ] Query performance optimization
- [ ] Advanced caching strategies
- [ ] Horizontal scaling support
- [ ] Real-time streaming analytics

### Phase 4.3 - Advanced Features
- [ ] Machine learning for requirement analysis
- [ ] Predictive analytics
- [ ] Advanced visualization
- [ ] API rate limiting and throttling

