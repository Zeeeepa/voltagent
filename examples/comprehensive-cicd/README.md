# VoltAgent Comprehensive CI/CD System

This example demonstrates the complete PostgreSQL Task Storage Integration and Comprehensive CI/CD system for VoltAgent. It showcases how to build AI-driven development pipelines with comprehensive context preservation, atomic task management, and advanced analytics capabilities.

## 🎯 Features

### Core Task Storage
- **Atomic Task Management**: Store tasks with complete context and metadata
- **Dependency Graphs**: Maintain complex task relationships and dependencies
- **Lifecycle Tracking**: Track task states and transitions with audit trails
- **AI Interaction History**: Preserve all AI agent communications and context
- **Context Preservation Engine**: Comprehensive context storage and retrieval
- **Performance Optimization**: Efficient querying and indexing strategies

### CI/CD Integration
- **RESTful API**: Complete task management API with filtering and pagination
- **Real-time Updates**: WebSocket support for live task status updates
- **Validation Engine**: Store and track validation results from multiple validators
- **Performance Metrics**: Comprehensive metrics collection and analysis
- **Analytics Dashboard**: Real-time analytics and reporting capabilities

### Advanced Features
- **Context Intelligence**: AI-powered context analysis and suggestions
- **Advanced Query Builder**: Flexible query system for complex analytics
- **Real-time Analytics**: WebSocket-based real-time analytics streaming
- **Backup & Recovery**: Automated backup and disaster recovery procedures
- **Monitoring**: Comprehensive monitoring with Prometheus and Grafana

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VoltAgent     │    │   CI/CD API     │    │  Task Storage   │
│   Agents        │◄──►│   Server        │◄──►│   Manager       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   WebSocket     │    │   Context       │
                       │   Real-time     │    │   Engine        │
                       │   Updates       │    │                 │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   PostgreSQL    │
                                              │   Database      │
                                              │                 │
                                              └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)

### 1. Environment Setup

```bash
# Copy environment configuration
cp .env.example .env

# Edit the configuration as needed
nano .env
```

### 2. Database Setup (Docker)

```bash
# Start the complete CI/CD infrastructure
npm run docker:up

# Check logs
npm run docker:logs

# Stop infrastructure
npm run docker:down
```

### 3. Local Development

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Or build and run production
pnpm build
pnpm start
```

## 📊 Database Schema

The system uses a comprehensive PostgreSQL schema with the following core tables:

### Core Tables

- **`tasks`**: Main task storage with metadata, status, and relationships
- **`task_dependencies`**: Task dependency relationships and types
- **`ai_interactions`**: AI agent interaction history and context
- **`task_context`**: Versioned context storage for comprehensive state management
- **`validation_results`**: Validation results from various validators
- **`performance_metrics`**: Performance and execution metrics

### Key Features

- **JSONB Support**: Flexible metadata and context storage
- **Full-text Search**: Advanced search capabilities across all content
- **Indexing Strategy**: Optimized indexes for high-performance queries
- **Audit Trails**: Complete history tracking with timestamps
- **Referential Integrity**: Proper foreign key relationships with cascading

## 🔧 API Endpoints

### Task Management

```http
POST   /api/v1/tasks                    # Create task
GET    /api/v1/tasks                    # List tasks (with filtering)
GET    /api/v1/tasks/:id                # Get task by ID
PUT    /api/v1/tasks/:id                # Update task
DELETE /api/v1/tasks/:id                # Delete task
PUT    /api/v1/tasks/:id/status         # Update task status
POST   /api/v1/tasks/:id/dependencies   # Create task dependency
```

### Context Management

```http
POST   /api/v1/tasks/:id/context        # Store task context
GET    /api/v1/tasks/:id/context/:type  # Get specific context
GET    /api/v1/tasks/:id/context/full   # Get all context
GET    /api/v1/tasks/:id/context/latest # Get latest context versions
GET    /api/v1/tasks/:id/context/:type/history # Get context history
GET    /api/v1/tasks/search             # Search context
DELETE /api/v1/tasks/:id/context/:type  # Delete context
```

### AI Interactions

```http
POST   /api/v1/tasks/:id/interactions   # Store AI interaction
```

### Validation & Metrics

```http
POST   /api/v1/tasks/:id/validation     # Store validation result
POST   /api/v1/tasks/:id/metrics        # Store performance metric
```

### Analytics

```http
GET    /api/v1/analytics/tasks          # Get task analytics
GET    /api/v1/analytics/context/:taskId # Get context statistics
```

### System

```http
GET    /health                          # Health check
```

## 🧠 Context Engine

The Context Engine provides intelligent context management with:

### Context Types

- **`requirements`**: Business and technical requirements
- **`codebase_analysis`**: Code structure and dependencies analysis
- **`dependencies`**: External dependencies and integrations
- **`test_results`**: Testing outcomes and coverage reports
- **`deployment_config`**: Deployment and infrastructure configuration
- **`performance_metrics`**: Performance benchmarks and metrics
- **`user_feedback`**: User feedback and acceptance criteria
- **`ai_analysis`**: AI-generated insights and recommendations

### Features

- **Versioning**: Complete version history for all context types
- **Caching**: Intelligent caching with configurable TTL
- **Compression**: Optional compression for large context data
- **Search**: Full-text search across all context data
- **Analytics**: Context usage statistics and trends

## 📈 Analytics & Monitoring

### Task Analytics

- Total tasks and distribution by status/priority
- Average completion times and success rates
- Most common tags and project trends
- Performance trends over time

### Performance Metrics

- Database query performance monitoring
- Connection pool utilization tracking
- Context engine cache hit rates
- API response time metrics

### Real-time Updates

WebSocket endpoint provides real-time updates for:

- Task creation, updates, and status changes
- Context storage and modifications
- AI interaction completions
- Validation results
- Performance metric recordings

## 🔒 Security Features

- **Input Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **SQL Injection Protection**: Parameterized queries and ORM protection
- **CORS Configuration**: Configurable CORS policies
- **Health Checks**: Comprehensive health monitoring
- **Error Handling**: Secure error handling without information leakage

## 🐳 Docker Deployment

The system includes complete Docker configuration:

### Services

- **PostgreSQL**: Database with initialization scripts
- **Redis**: Caching and session management
- **Task Storage Service**: Core task storage microservice
- **CI/CD API Server**: Main API server with WebSocket support
- **Nginx**: Reverse proxy with load balancing
- **Prometheus**: Metrics collection (optional)
- **Grafana**: Visualization dashboard (optional)

### Configuration

```bash
# Start all services
docker-compose up -d

# Start with monitoring
docker-compose --profile monitoring up -d

# Scale API servers
docker-compose up -d --scale cicd-api-server=3

# View logs
docker-compose logs -f cicd-api-server
```

## 🧪 Example Usage

```typescript
import { TaskStorageManager, ContextEngine } from '@voltagent/task-storage';
import { ApiServer } from '@voltagent/ci-cd-core';

// Initialize components
const taskStorage = TaskStorageManager.fromEnvironment();
await taskStorage.initialize();

const contextEngine = new ContextEngine(taskStorage);

// Create a task
const task = await taskStorage.createTask({
  title: 'Implement User Authentication',
  description: 'Build JWT-based authentication system',
  complexity_score: 8,
  priority: 'high',
  estimated_hours: 40,
  tags: ['authentication', 'security'],
});

// Store context
await contextEngine.storeTaskContext(task.id, 'requirements', {
  security_requirements: ['JWT tokens', 'Password hashing', 'Rate limiting'],
  performance_requirements: ['< 200ms response time', '99.9% uptime'],
});

// Track AI interaction
await taskStorage.storeAIInteraction(
  task.id,
  'CodeGenAgent',
  'code_generation',
  { prompt: 'Generate authentication middleware' },
  { code: '...', explanation: '...' },
  1500,
  true
);

// Get analytics
const analytics = await taskStorage.getTaskAnalytics();
console.log('Success rate:', analytics.success_rate);
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for complete configuration options including:

- Database connection settings
- Performance tuning parameters
- Context engine configuration
- API server options
- Security settings

### Performance Tuning

- **Connection Pooling**: Configurable pool sizes and timeouts
- **Query Optimization**: Slow query logging and analysis
- **Context Caching**: TTL-based caching with compression
- **Index Strategy**: Optimized indexes for common query patterns

## 📚 Documentation

- [Task Storage API Reference](../../packages/task-storage/README.md)
- [CI/CD Core Documentation](../../packages/ci-cd-core/README.md)
- [Database Schema Reference](../../packages/task-storage/src/database/schema.sql)
- [Docker Configuration Guide](../../docker/comprehensive-cicd/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**🎯 This implementation provides the foundational data layer for the comprehensive CI/CD system, focusing on performance, reliability, and comprehensive context preservation to enable all downstream components.**

