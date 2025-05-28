# Codegen SDK Integration Example

This example demonstrates the unified Codegen SDK integration that consolidates PRs #52, #54, #55, #82, #86, #87 into a single cohesive system.

## Features Demonstrated

### From PR #52: SDK Client Implementation
- Unified SDK client with standardized interfaces
- Configuration management and validation
- Error handling and retry logic

### From PR #54: Natural Language Processing Engine
- Sentiment analysis and entity extraction
- Intent classification and keyword extraction
- Code-specific text processing

### From PR #55: Automated PR Creation Logic
- GitHub PR automation with comprehensive metadata
- Batch PR creation capabilities
- Template-based PR descriptions

### From PR #82: AgentAPI Middleware
- Request/response processing pipeline
- Caching and rate limiting
- Metrics collection and monitoring

### From PR #86: Comprehensive SDK Integration
- Unified configuration system
- Component orchestration
- Health checks and status monitoring

### From PR #87: Real SDK Integration & NLP Engine
- Production-ready implementations
- Performance optimizations
- Security considerations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Run the example:
```bash
npm run dev
```

## Environment Variables

```bash
# Required for PR automation
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name

# Optional for Claude Code features
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## What the Example Shows

1. **Unified SDK Initialization** - Single entry point for all functionality
2. **NLP Processing** - Comprehensive text analysis with multiple engines
3. **Code Generation** - Claude-powered code generation with context
4. **PR Automation** - Automated GitHub PR creation with metadata
5. **Code Orchestration** - Claude Code review, explanation, and refactoring
6. **Complete Workflows** - End-to-end automation combining all features
7. **Metrics and Monitoring** - Performance tracking and health checks

## Key Consolidation Benefits

- **Zero Duplication** - All overlapping functionality unified
- **Consistent Interfaces** - Standardized API across all components
- **Unified Configuration** - Single configuration system
- **Integrated Workflows** - Seamless component interaction
- **Comprehensive Monitoring** - Unified metrics and health checks

## Usage Patterns

### Quick Setup
```typescript
import { createCodegenSDK } from '@voltagent/codegen-sdk';

const sdk = await createCodegenSDK(
  'github-token',
  'owner',
  'repo',
  'anthropic-key'
);
```

### Complete Workflow
```typescript
const result = await sdk.completeCodeGenerationWorkflow(
  'Create a TypeScript function for email validation',
  'typescript',
  {
    baseBranch: 'main',
    headBranch: 'feature/email-validation',
    labels: ['enhancement']
  }
);
```

### Individual Components
```typescript
// NLP processing
const nlpResult = await sdk.processNaturalLanguage(text);

// Code generation
const codeResult = await sdk.generateCode(request);

// PR creation
const prResult = await sdk.createAutomatedPR(options);
```

This example showcases how the consolidation successfully eliminates duplication while providing a powerful, unified interface for all Codegen SDK functionality.

