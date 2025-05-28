# @voltagent/codegen-sdk

> Unified Codegen SDK Integration for VoltAgent - Natural language processing, automated PR creation, and Claude Code orchestration

## 🎯 Overview

This package represents the consolidation of PRs #52, #54, #55, #82, #86, #87 into a single, unified Codegen SDK integration. It provides a comprehensive solution for:

- **Natural Language Processing** - Unified NLP engine with sentiment analysis, entity extraction, and intent classification
- **Automated PR Creation** - Streamlined GitHub PR automation with comprehensive metadata
- **Claude Code Orchestration** - AgentAPI middleware for seamless Claude Code interactions
- **Zero Duplication** - Consolidated functionality with standardized interfaces

## 🚀 Quick Start

### Installation

```bash
npm install @voltagent/codegen-sdk
```

### Basic Usage

```typescript
import { createCodegenSDK } from '@voltagent/codegen-sdk';

// Quick setup with minimal configuration
const sdk = await createCodegenSDK(
  'your-github-token',
  'your-github-owner',
  'your-repo-name',
  'your-anthropic-api-key' // optional
);

// Complete workflow: NLP → Code Generation → PR Creation
const result = await sdk.completeCodeGenerationWorkflow(
  'Create a TypeScript function that validates email addresses',
  'typescript',
  {
    baseBranch: 'main',
    headBranch: 'feature/email-validation',
    assignees: ['developer1'],
    labels: ['enhancement', 'auto-generated']
  }
);

console.log('Generated code:', result.codeResult.code);
console.log('PR created:', result.prResult.prUrl);
```

## 📋 Consolidated Features

### From PR #52: SDK Client Implementation
- Unified SDK client with standardized interfaces
- Configuration management and validation
- Error handling and retry logic

### From PR #54: Natural Language Processing Engine
- Sentiment analysis and entity extraction
- Intent classification and keyword extraction
- Code-specific text processing
- Multi-language support

### From PR #55: Automated PR Creation Logic
- GitHub PR automation with comprehensive metadata
- Batch PR creation capabilities
- PR status tracking and management
- Template-based PR descriptions

### From PR #82: AgentAPI Middleware
- Request/response processing pipeline
- Caching and rate limiting
- Metrics collection and monitoring
- Logging and debugging support

### From PR #86: Comprehensive SDK Integration
- Unified configuration system
- Component orchestration
- Health checks and status monitoring
- Resource cleanup and disposal

### From PR #87: Real SDK Integration & NLP Engine
- Production-ready implementations
- Performance optimizations
- Security considerations
- Comprehensive testing support

## 🔧 Advanced Usage

### Custom Configuration

```typescript
import { CodegenSDKClient, createDefaultConfig } from '@voltagent/codegen-sdk';

const config = createDefaultConfig(
  'github-token',
  'owner',
  'repo',
  'anthropic-key'
);

// Customize configuration
config.nlp.enableIntentClassification = true;
config.middleware.rateLimiting.enabled = true;
config.claudeCode.temperature = 0.2;

const sdk = new CodegenSDKClient(config);
```

### Individual Component Usage

```typescript
import { 
  UnifiedNLPEngine,
  UnifiedPRCreator,
  ClaudeCodeOrchestrator,
  AgentAPIMiddleware
} from '@voltagent/codegen-sdk';

// Use components individually
const nlpEngine = new UnifiedNLPEngine();
const prCreator = new UnifiedPRCreator('github-token');
const claudeOrchestrator = new ClaudeCodeOrchestrator('anthropic-key');
const middleware = new AgentAPIMiddleware({ enableLogging: true });
```

### Natural Language Processing

```typescript
// Process natural language with comprehensive analysis
const nlpResult = await sdk.processNaturalLanguage(
  'I need a function that sorts an array of users by their registration date',
  {
    enableSentimentAnalysis: true,
    enableEntityExtraction: true,
    enableIntentClassification: true
  }
);

console.log('Detected intent:', nlpResult.intent);
console.log('Extracted entities:', nlpResult.entities);
console.log('Keywords:', nlpResult.keywords);
```

### Code Generation with Claude

```typescript
// Generate code with Claude Code orchestration
const codeResult = await sdk.generateCode({
  prompt: 'Create a REST API endpoint for user authentication',
  language: 'typescript',
  context: 'Express.js application with JWT tokens',
  includeComments: true,
  includeTests: true
});

console.log('Generated code:', codeResult.code);
console.log('Explanation:', codeResult.explanation);
console.log('Tests:', codeResult.tests);
```

### Automated PR Creation

```typescript
// Create PR with comprehensive automation
const prResult = await sdk.createAutomatedPR({
  repository: 'owner/repo',
  baseBranch: 'main',
  headBranch: 'feature/new-endpoint',
  title: 'Add user authentication endpoint',
  description: 'Implements JWT-based authentication with comprehensive tests',
  assignees: ['developer1', 'developer2'],
  reviewers: ['senior-dev'],
  labels: ['feature', 'authentication', 'needs-review'],
  draft: false
});

console.log('PR created:', prResult.prUrl);
```

### Code Review Workflow

```typescript
// Complete code review workflow
const reviewResult = await sdk.completeCodeReviewWorkflow(
  sourceCode,
  'typescript',
  {
    baseBranch: 'main',
    headBranch: 'review/code-improvements',
    labels: ['code-review', 'improvements']
  }
);

console.log('Review feedback:', reviewResult.reviewResult.explanation);
console.log('Suggestions:', reviewResult.reviewResult.suggestions);
```

## 🛠️ API Reference

### CodegenSDKClient

The main SDK client that orchestrates all components.

#### Methods

- `processNaturalLanguage(text, options?)` - Process text with NLP analysis
- `processCodeText(text)` - Process code-specific text
- `generateCode(request)` - Generate code using Claude
- `createAutomatedPR(options)` - Create GitHub PR with automation
- `reviewCode(code, language, criteria?)` - Review code with Claude
- `explainCode(code, language, level?)` - Explain code functionality
- `refactorCode(code, language, goals)` - Refactor code with improvements
- `completeCodeGenerationWorkflow(prompt, language, prOptions)` - End-to-end workflow
- `completeCodeReviewWorkflow(code, language, prOptions)` - Review workflow
- `getSDKStatus()` - Get comprehensive status and metrics

### UnifiedNLPEngine

Consolidated natural language processing engine.

#### Methods

- `processText(text, options?)` - Comprehensive text analysis
- `processCodeText(text)` - Code-specific text processing
- `trainIntentClassifier(trainingData)` - Train custom intent classifier

### UnifiedPRCreator

Automated GitHub PR creation system.

#### Methods

- `createPR(options)` - Create new PR with automation
- `createBatchPRs(optionsArray)` - Create multiple PRs
- `createPRFromCodeGeneration(codeResult, options)` - PR from generated code
- `createPRFromNLPAnalysis(nlpResult, options)` - PR from NLP analysis
- `getPRStatus(owner, repo, prNumber)` - Get PR status and metadata

### ClaudeCodeOrchestrator

AgentAPI middleware for Claude Code interactions.

#### Methods

- `generateCode(request)` - Generate code with Claude
- `reviewCode(code, language, criteria?)` - Review code
- `explainCode(code, language, level?)` - Explain code
- `refactorCode(code, language, goals)` - Refactor code
- `getRequestHistory()` - Get request history
- `updateConfig(newConfig)` - Update configuration

### AgentAPIMiddleware

Request processing middleware with caching and monitoring.

#### Methods

- `processRequest(request, handler)` - Process request through middleware
- `getMetrics()` - Get performance metrics
- `getCacheStats()` - Get cache statistics
- `healthCheck()` - Middleware health check
- `clearCache()` - Clear cached data

## 🔒 Security Considerations

- **API Key Management** - Store API keys securely using environment variables
- **Code Validation** - Generated code is analyzed for potential security issues
- **Rate Limiting** - Built-in rate limiting to prevent API abuse
- **Input Sanitization** - All text inputs are sanitized before processing
- **Access Control** - GitHub token permissions should follow principle of least privilege

## 📊 Monitoring and Metrics

The SDK provides comprehensive monitoring capabilities:

```typescript
// Get SDK status and metrics
const status = sdk.getSDKStatus();
console.log('Success rate:', status.metrics.successRate);
console.log('Average response time:', status.metrics.averageResponseTime);
console.log('Cache hit rate:', status.metrics.cacheHitRate);

// Health check
const health = sdk.agentMiddleware.healthCheck();
console.log('System health:', health.status);
```

## 🧪 Testing

```typescript
import { CodegenSDKClient } from '@voltagent/codegen-sdk';

// Mock configuration for testing
const testConfig = {
  sdk: { timeout: 5000 },
  nlp: { language: 'en' },
  prAutomation: {
    github: {
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    }
  },
  claudeCode: { model: 'claude-3-sonnet' },
  middleware: { enableLogging: false }
};

const sdk = new CodegenSDKClient(testConfig);
```

## 🤝 Contributing

This package consolidates multiple PRs into a unified system. When contributing:

1. Ensure zero duplication with existing functionality
2. Follow established patterns and interfaces
3. Add comprehensive tests for new features
4. Update documentation for API changes
5. Consider impact on all integrated components

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Packages

- `@voltagent/core` - Core VoltAgent framework
- `@voltagent/anthropic-ai` - Anthropic AI provider
- `@voltagent/vercel-ai` - Vercel AI integration

## 📈 Roadmap

- [ ] Enhanced code generation templates
- [ ] Multi-language NLP support expansion
- [ ] Advanced PR automation workflows
- [ ] Real-time collaboration features
- [ ] Performance optimizations
- [ ] Extended Claude Code capabilities

---

**Note**: This package represents the successful consolidation of PRs #52, #54, #55, #82, #86, #87 with zero duplication and unified interfaces as specified in the consolidation requirements.

