# 🚀 Comprehensive CI/CD System with Codegen Integration

A powerful, AI-driven CI/CD system that transforms natural language requirements into validated, production-ready code through intelligent prompt generation and seamless PR creation.

## 🎯 Overview

This system integrates the Codegen Integration and Prompt Generation capabilities into a comprehensive CI/CD framework, enabling:

- **Intelligent Prompt Generation**: Convert atomic tasks into effective codegen prompts
- **Seamless API Communication**: Direct integration with Codegen APIs
- **Complete PR Lifecycle Tracking**: From creation to validation
- **Robust Error Handling**: Configurable retry logic with exponential backoff
- **Comprehensive Monitoring**: Real-time metrics and performance tracking
- **Workflow Orchestration**: End-to-end automation from task to validated PR

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Server    │    │ Codegen Service │    │ Task Storage    │
│                 │◄──►│                 │◄──►│   (PostgreSQL)  │
│ Express + REST  │    │ Prompt Gen + PR │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Workflow        │    │ Metrics         │    │ External APIs   │
│ Orchestrator    │    │ Collector       │    │ (Codegen, etc.) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (for containerized deployment)

### Installation

1. **Clone and navigate to the CI/CD system:**
   ```bash
   cd src/comprehensive_cicd
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp ../../.env.comprehensive_cicd .env
   # Edit .env with your configuration
   ```

3. **Initialize database:**
   ```bash
   npm run init-db
   ```

4. **Start the system:**
   ```bash
   npm start
   ```

### Docker Deployment

1. **Using Docker Compose:**
   ```bash
   # From project root
   docker-compose -f docker-compose.comprehensive-cicd.yml up -d
   ```

2. **With monitoring stack:**
   ```bash
   COMPOSE_PROFILES=default,with-monitoring docker-compose -f docker-compose.comprehensive-cicd.yml up -d
   ```

## 📋 API Reference

### Core Endpoints

#### Generate Prompt
```http
POST /api/v1/codegen/generate-prompt
Content-Type: application/json

{
  "task_id": "uuid",
  "context_options": {
    "includeCodebaseContext": true,
    "includeDependencies": true,
    "includeValidationCriteria": true,
    "promptStyle": "comprehensive"
  }
}
```

#### Create PR
```http
POST /api/v1/codegen/create-pr
Content-Type: application/json

{
  "task_id": "uuid",
  "prompt_data": {
    "prompt": "Generated prompt content",
    "context_used": { ... }
  },
  "options": {
    "branchName": "feature/task-implementation",
    "prTitle": "Implement feature X",
    "autoMerge": false
  }
}
```

#### Get Status
```http
GET /api/v1/codegen/status/{task_id}
```

#### Retry Request
```http
POST /api/v1/codegen/retry/{task_id}
Content-Type: application/json

{
  "retry_options": {
    "strategy": "regenerate_prompt"
  }
}
```

### Task Management

#### Create Task
```http
POST /api/v1/tasks
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "requirements": [
    "Support email/password login",
    "Include password reset functionality",
    "Implement role-based access control"
  ],
  "acceptance_criteria": [
    "Users can register with email/password",
    "Login returns valid JWT token",
    "Protected routes require authentication"
  ],
  "priority": "high",
  "estimated_complexity": "medium"
}
```

#### Get Task
```http
GET /api/v1/tasks/{task_id}
```

### System Monitoring

#### Health Check
```http
GET /health
```

#### Metrics
```http
GET /metrics
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CODEGEN_API_KEY` | Codegen API authentication key | Required |
| `CODEGEN_ORG_ID` | Codegen organization ID | Required |
| `CODEGEN_API_URL` | Codegen API base URL | `https://api.codegen.sh` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Optional |
| `MAX_CONCURRENT_WORKFLOWS` | Maximum parallel workflows | `5` |
| `WORKFLOW_TIMEOUT` | Workflow timeout in ms | `300000` |

### Database Schema

The system automatically creates the following tables:

- **`tasks`**: Store task definitions and context
- **`codegen_requests`**: Track prompt generation and PR creation
- **`workflow_executions`**: Monitor workflow progress and results

## 🔄 Workflow Types

### Complete Task-to-PR Workflow

1. **Validate Task**: Ensure task has required information
2. **Generate Prompt**: Create intelligent prompt from task context
3. **Create PR**: Submit to Codegen API and create pull request
4. **Validate PR**: Run automated tests and code review
5. **Notify Completion**: Send notifications to stakeholders

### PR Validation Workflow

1. **Analyze PR**: Extract metadata and complexity metrics
2. **Run Tests**: Execute automated test suite
3. **Code Review**: Perform automated code quality analysis
4. **Security Scan**: Check for vulnerabilities
5. **Generate Feedback**: Compile comprehensive feedback report

## 📊 Monitoring & Metrics

### Key Performance Indicators

- **Prompt Quality Score**: Success rate of generated prompts
- **Response Time**: Average time from task to PR creation
- **Error Rate**: Percentage of failed requests
- **Retry Success Rate**: Effectiveness of retry mechanisms

### Metrics Dashboard

Access real-time metrics at:
- **API Metrics**: `http://localhost:3000/metrics`
- **Prometheus**: `http://localhost:9091` (if enabled)
- **Grafana**: `http://localhost:3001` (if enabled)

### Health Monitoring

```bash
# Check system health
curl http://localhost:3000/health

# CLI health check
npm run health
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Coverage Report
```bash
npm run test:coverage
```

### Mock Mode

For development and testing without external APIs:

```bash
CODEGEN_ENABLE_MOCK_MODE=true npm start
```

## 🔒 Security

### Authentication

The system supports multiple authentication methods:
- API key authentication for service-to-service communication
- JWT tokens for user authentication (if enabled)
- Internal service authentication for component communication

### Data Protection

- All sensitive data is encrypted at rest
- API communications use HTTPS/TLS
- Database connections are secured with SSL
- Secrets are managed through environment variables

### Rate Limiting

Built-in rate limiting protects against abuse:
- 100 requests per 15-minute window (configurable)
- Per-IP and per-API-key limits
- Graceful degradation under load

## 🚨 Error Handling

### Retry Strategies

1. **Regenerate Prompt**: Try with different prompt parameters
2. **Different Approach**: Use alternative implementation strategy
3. **Simplified Scope**: Reduce complexity and retry

### Error Recovery

- Exponential backoff for failed requests
- Automatic retry with configurable limits
- Comprehensive error logging and metrics
- Graceful degradation when services are unavailable

## 📈 Performance Optimization

### Caching

- Redis caching for frequently accessed data
- In-memory caching for configuration and metadata
- Intelligent cache invalidation strategies

### Database Optimization

- Connection pooling with configurable limits
- Optimized queries with proper indexing
- Automatic cleanup of old metrics and logs

### Scaling

- Horizontal scaling support through Docker Compose
- Load balancing with Nginx reverse proxy
- Microservice architecture for independent scaling

## 🔧 Development

### Local Development

```bash
# Start in development mode
npm run dev

# Watch for changes
npm run test:watch

# Lint and format
npm run lint:fix
npm run format
```

### Docker Development

```bash
# Build and start services
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## 📚 API Documentation

### OpenAPI Specification

The system provides OpenAPI/Swagger documentation at:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

### Postman Collection

Import the Postman collection for easy API testing:
```bash
curl -o comprehensive-cicd.postman_collection.json \
  http://localhost:3000/postman-collection
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/Zeeeepa/voltagent/wiki)
- **Issues**: [GitHub Issues](https://github.com/Zeeeepa/voltagent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Zeeeepa/voltagent/discussions)

## 🙏 Acknowledgments

- Built on the [Voltagent](https://github.com/Zeeeepa/voltagent) AI Agent Framework
- Integrates with [Codegen](https://codegen.sh) for intelligent code generation
- Inspired by modern CI/CD best practices and AI-driven development workflows

