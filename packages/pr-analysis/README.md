# @voltagent/pr-analysis

🔬 **Comprehensive PR Analysis & CI/CD Automation System**

A powerful, modular system for automated code analysis, issue detection, and automated fixing through Claude Code integration. Built for the VoltAgent framework.

## 🎯 Overview

This package provides a complete solution for:

- **Granular Analysis Engine** - 15+ atomic analysis modules
- **Linear Integration** - Automated issue creation and tracking  
- **AgentAPI Integration** - Claude Code deployment on WSL2
- **SQL Database** - Workflow orchestration and Codegen prompting
- **Webhook System** - PR event handling and automation
- **Error Recovery** - Automated issue resolution and PR updates

## 🏗️ Architecture

```
PR Created → Webhook Trigger → Analysis Engine → Linear Issues → 
AgentAPI/Claude Code → Validation → Error Resolution → Merge
```

### Analysis Categories

1. **Static Code Analysis** (5 modules)
   - Unused function detection
   - Parameter validation & type checking
   - Duplicate code detection
   - Code complexity & maintainability
   - Import & dependency validation

2. **Dynamic Flow Analysis** (4 modules)
   - Function call flow mapping
   - Data flow & variable tracking
   - Error handling & exception flow
   - Performance hotspot detection

3. **Security & Compliance** (3 modules)
   - Vulnerability detection
   - Access control & authentication
   - Code standards & best practices

4. **Performance & Optimization** (3 modules)
   - Performance hotspot detection
   - Memory analysis
   - Optimization recommendations

5. **Documentation & Standards** (2 modules)
   - Code standards compliance
   - Documentation completeness

## 🚀 Quick Start

### Installation

```bash
npm install @voltagent/pr-analysis
```

### Basic Usage

```typescript
import { PRAnalysisServer, createDefaultConfig } from '@voltagent/pr-analysis'

// Create configuration
const config = createDefaultConfig()

// Initialize server
const server = new PRAnalysisServer(config)

// Start the system
await server.start()
```

### Environment Variables

```bash
# GitHub Integration
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Linear Integration
LINEAR_API_KEY=your_linear_api_key
LINEAR_TEAM_ID=your_team_id

# AgentAPI Integration
AGENTAPI_BASE_URL=http://localhost:8080
AGENTAPI_KEY=your_agentapi_key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pr_analysis
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
```

## 📊 Success Metrics

- **Coverage**: 100% PR analysis automation
- **Speed**: < 5 minutes per PR analysis  
- **Accuracy**: > 95% issue detection rate
- **Resolution**: > 80% auto-fix success rate

## 🔧 Configuration

### Full Configuration Example

```typescript
import { PRAnalysisConfig } from '@voltagent/pr-analysis'

const config: PRAnalysisConfig = {
  analysis: {
    enabledModules: ['all'], // or specific modules
    timeoutMs: 300000,
    maxConcurrentAnalyses: 5
  },
  github: {
    token: process.env.GITHUB_TOKEN!,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!
  },
  linear: {
    apiKey: process.env.LINEAR_API_KEY!,
    teamId: process.env.LINEAR_TEAM_ID!
  },
  agentapi: {
    baseUrl: process.env.AGENTAPI_BASE_URL!,
    apiKey: process.env.AGENTAPI_KEY!,
    timeout: 300000,
    maxRetries: 3
  },
  features: {
    autoFix: true,
    linearIntegration: true,
    agentapiIntegration: true,
    webhookValidation: true
  }
}
```

### Module Selection

```typescript
// Enable specific modules only
const config = {
  analysis: {
    enabledModules: [
      'static-unused-functions',
      'static-parameter-validation',
      'security-vulnerability-detection',
      'performance-hotspot-detection'
    ]
  }
}
```

## 🔌 API Endpoints

### Webhook Endpoint
```
POST /webhooks/github
```
Receives GitHub webhook events for PR analysis.

### Manual Analysis
```
POST /analyze/:owner/:repo/:pr
```
Manually trigger analysis for a specific PR.

### Workflow Status
```
GET /workflow/:id
```
Get status of a running analysis workflow.

### System Metrics
```
GET /metrics
```
Get system performance and analysis metrics.

### Health Check
```
GET /health
```
System health status.

## 🧩 Custom Analysis Modules

### Creating a Custom Module

```typescript
import { StaticAnalysisModule, PRContext, AnalysisConfig, AnalysisResult } from '@voltagent/pr-analysis'

export class CustomAnalysisModule extends StaticAnalysisModule {
  readonly name = 'custom-analysis'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = []
    
    // Your analysis logic here
    for (const file of context.files) {
      // Analyze file and create results
      results.push(this.createResult(
        'custom-analysis',
        'medium',
        'Custom Issue Found',
        'Description of the issue',
        file.filename,
        10, // line number
        5,  // column number
        'Suggestion for fix',
        true // auto-fixable
      ))
    }
    
    return results
  }

  canAutoFix(result: AnalysisResult): boolean {
    return result.autoFixable
  }
}
```

### Registering Custom Modules

```typescript
import { AnalysisEngine } from '@voltagent/pr-analysis'

const engine = new AnalysisEngine(config, logger)
engine.registerModule(new CustomAnalysisModule())
```

## 🔄 Workflow Process

1. **PR Event** - GitHub webhook triggers analysis
2. **Context Extraction** - Extract PR files, changes, and metadata
3. **Module Execution** - Run enabled analysis modules in parallel
4. **Result Aggregation** - Collect and categorize all findings
5. **Linear Integration** - Create main issue and sub-issues
6. **Auto-fix Deployment** - Deploy Claude Code agents for fixable issues
7. **Validation** - Re-analyze to verify fixes
8. **Reporting** - Update Linear issues with results

## 🛡️ Security & Compliance

- **Webhook Validation** - Cryptographic verification of GitHub webhooks
- **API Authentication** - Secure integration with Linear and AgentAPI
- **Data Encryption** - Sensitive data encrypted at rest and in transit
- **Access Control** - Role-based access to analysis results
- **Audit Logging** - Comprehensive audit trail of all operations

## 📈 Monitoring & Metrics

### Built-in Metrics

- Analysis execution time
- Success/failure rates
- Auto-fix effectiveness
- Resource utilization
- Error rates and types

### Custom Metrics

```typescript
import { PRAnalysisOrchestrator } from '@voltagent/pr-analysis'

const orchestrator = new PRAnalysisOrchestrator(config, logger)
const metrics = await orchestrator.getSystemMetrics()

console.log(`Success rate: ${metrics.successRate}%`)
console.log(`Average analysis time: ${metrics.averageAnalysisTime}ms`)
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- --testNamePattern="AnalysisEngine"
```

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
EXPOSE 3000

CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pr-analysis
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pr-analysis
  template:
    metadata:
      labels:
        app: pr-analysis
    spec:
      containers:
      - name: pr-analysis
        image: voltagent/pr-analysis:latest
        ports:
        - containerPort: 3000
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: github-secrets
              key: token
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [VoltAgent Framework](https://github.com/Zeeeepa/voltagent)
- [Documentation](https://voltagent.dev/docs/pr-analysis)
- [API Reference](https://voltagent.dev/api/pr-analysis)
- [Examples](https://github.com/Zeeeepa/voltagent/tree/main/examples/pr-analysis)

## 🆘 Support

- [GitHub Issues](https://github.com/Zeeeepa/voltagent/issues)
- [Discord Community](https://discord.gg/voltagent)
- [Documentation](https://voltagent.dev/docs)

---

Built with ❤️ by the VoltAgent team

