# CI/CD Integration Example Usage

This document provides comprehensive examples of how to use the VoltAgent CI/CD Integration system.

## Basic Setup

```typescript
import { CICDIntegration } from '@voltagent/cicd-integration';

// Initialize the CI/CD integration system
const cicd = new CICDIntegration({
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/voltagent_cicd',
    maxConnections: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    enableLogging: true
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  nlp: {
    confidenceThreshold: 0.7,
    maxTokens: 1000,
    enableEntityExtraction: true,
    enableIntentClassification: true,
    enableComplexityAnalysis: true
  },
  codegen: {
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4000,
    temperature: 0.1,
    enableCodeReview: true,
    enableTestGeneration: true,
    enableDocumentationGeneration: true,
    codeStyle: {
      language: 'typescript',
      framework: 'react',
      indentation: 'spaces',
      indentSize: 2,
      lineLength: 100,
      namingConvention: 'camelCase',
      includeComments: true,
      includeTypeAnnotations: true
    }
  },
  validation: {
    model: 'claude-3-sonnet-20240229',
    enableStaticAnalysis: true,
    enableSecurityScan: true,
    enablePerformanceAnalysis: true,
    enableBestPracticesCheck: true,
    customRules: [],
    severityThresholds: {
      error: 0,
      warning: 10
    }
  },
  workflow: {
    maxConcurrentWorkflows: 5,
    stepTimeout: 300000,
    retryAttempts: 3,
    enableMetrics: true,
    enableNotifications: true
  },
  enableCyclicalImprovement: true,
  enableParallelExecution: true,
  enableRealTimeMonitoring: true
});

// Initialize the system
await cicd.initialize();
```

## Example 1: Simple React Component Generation

```typescript
async function createReactComponent() {
  const requirements = `
    Create a React component called UserProfile that displays user information.
    It should show the user's name, email, avatar, and a bio section.
    Include props for editing mode and a save callback.
    Use TypeScript and include proper prop types.
  `;

  try {
    const result = await cicd.processRequirements(requirements);
    
    console.log('✅ Pipeline completed successfully!');
    console.log('Generated files:', result.generatedCode?.files.map(f => f.path));
    console.log('Validation status:', result.validationResult?.overall);
    console.log('Total duration:', result.metrics.totalDuration, 'ms');
    
    // Access generated files
    result.generatedCode?.files.forEach(file => {
      console.log(`\n--- ${file.path} ---`);
      console.log(file.content);
    });
    
  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
  }
}

createReactComponent();
```

## Example 2: Backend API with Database Integration

```typescript
async function createBackendAPI() {
  const requirements = `
    Build a REST API for a task management system with the following endpoints:
    - GET /api/tasks - List all tasks with pagination
    - POST /api/tasks - Create a new task
    - PUT /api/tasks/:id - Update a task
    - DELETE /api/tasks/:id - Delete a task
    
    Use Express.js with TypeScript, include input validation with Zod,
    implement proper error handling, and add PostgreSQL database integration.
    Include unit tests for all endpoints.
  `;

  const projectContext = {
    projectType: 'backend',
    framework: 'express',
    database: 'postgresql',
    authentication: 'jwt'
  };

  try {
    const result = await cicd.processRequirements(requirements, projectContext);
    
    console.log('🚀 Backend API generated successfully!');
    
    // Show generated structure
    const files = result.generatedCode?.files || [];
    const tests = result.generatedCode?.tests || [];
    const docs = result.generatedCode?.documentation || [];
    
    console.log('\n📁 Generated Structure:');
    console.log('Code files:', files.map(f => f.path));
    console.log('Test files:', tests.map(f => f.path));
    console.log('Documentation:', docs.map(f => f.path));
    
    // Show validation results
    if (result.validationResult) {
      console.log('\n🔍 Validation Results:');
      console.log('Overall status:', result.validationResult.overall);
      console.log('Code quality score:', result.validationResult.metrics.codeQualityScore);
      console.log('Security score:', result.validationResult.metrics.securityScore);
      
      if (result.validationResult.issues.length > 0) {
        console.log('\n⚠️ Issues found:');
        result.validationResult.issues.forEach(issue => {
          console.log(`${issue.severity}: ${issue.message} (${issue.file})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ API generation failed:', error.message);
  }
}

createBackendAPI();
```

## Example 3: Cyclical Improvement Workflow

```typescript
async function improveCodeQuality() {
  const requirements = `
    Create a user authentication service with login, logout, and password reset functionality.
    Include proper security measures, rate limiting, and comprehensive error handling.
  `;

  try {
    // Process with up to 3 improvement iterations
    const result = await cicd.processWithImprovement(requirements, 3);
    
    console.log('🔄 Improvement process completed!');
    console.log('Final validation status:', result.validationResult?.overall);
    console.log('Code quality score:', result.validationResult?.metrics.codeQualityScore);
    
    // Show improvement suggestions that were applied
    if (result.validationResult?.suggestions) {
      console.log('\n💡 Applied improvements:');
      result.validationResult.suggestions.forEach(suggestion => {
        console.log(`- ${suggestion.description} (Impact: ${suggestion.impact})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Improvement process failed:', error.message);
  }
}

improveCodeQuality();
```

## Example 4: Real-time Monitoring

```typescript
async function monitorPipeline() {
  // Set up comprehensive event monitoring
  cicd.on('pipeline-started', (data) => {
    console.log('🚀 Pipeline started:', data.requirementsText.substring(0, 100) + '...');
  });

  cicd.on('requirements-processed', (requirements) => {
    console.log('🧠 Requirements processed:');
    console.log('  Intent:', requirements.intent);
    console.log('  Complexity:', requirements.complexity);
    console.log('  Confidence:', requirements.confidence);
    console.log('  Estimated effort:', requirements.estimatedEffort.hours, 'hours');
  });

  cicd.on('workflow-started', (execution) => {
    console.log('⚙️ Workflow started:', execution.id);
  });

  cicd.on('step-started', (execution, step) => {
    console.log(`📋 Step started: ${step.name} (${step.type})`);
  });

  cicd.on('step-completed', (execution, step, result) => {
    console.log(`✅ Step completed: ${step.name}`);
    if (result.artifacts) {
      console.log(`   Generated ${result.artifacts.length} artifacts`);
    }
  });

  cicd.on('step-failed', (execution, step, error) => {
    console.error(`❌ Step failed: ${step.name} - ${error.message}`);
  });

  cicd.on('workflow-completed', (execution) => {
    console.log('🎉 Workflow completed:', execution.id);
    console.log('   Duration:', execution.completedAt!.getTime() - execution.startedAt.getTime(), 'ms');
  });

  cicd.on('pipeline-completed', (result) => {
    console.log('🏁 Pipeline completed successfully!');
    console.log('   Total files generated:', result.generatedCode?.files.length || 0);
    console.log('   Validation status:', result.validationResult?.overall);
  });

  cicd.on('pipeline-failed', (error) => {
    console.error('💥 Pipeline failed:', error.message);
  });

  // Now run a pipeline with monitoring
  const requirements = `
    Create a React dashboard component with charts and data visualization.
    Include responsive design and dark mode support.
  `;

  await cicd.processRequirements(requirements);
}

monitorPipeline();
```

## Example 5: Custom Validation Rules

```typescript
async function customValidationExample() {
  // Add custom validation rules before processing
  const customRules = [
    {
      id: 'no-any-types',
      name: 'No Any Types',
      type: 'BEST_PRACTICE' as any,
      severity: 'warning' as const,
      description: 'Avoid using "any" type in TypeScript',
      pattern: ':\\s*any\\b'
    },
    {
      id: 'require-error-handling',
      name: 'Require Error Handling',
      type: 'BEST_PRACTICE' as any,
      severity: 'error' as const,
      description: 'All async functions should have error handling',
      pattern: 'async\\s+function.*{[^}]*}(?!.*catch)'
    }
  ];

  // Update configuration with custom rules
  const customCICD = new CICDIntegration({
    // ... other config
    validation: {
      model: 'claude-3-sonnet-20240229',
      enableStaticAnalysis: true,
      enableSecurityScan: true,
      enablePerformanceAnalysis: true,
      enableBestPracticesCheck: true,
      customRules,
      severityThresholds: {
        error: 0,
        warning: 5
      }
    },
    // ... rest of config
  } as any);

  await customCICD.initialize();

  const requirements = `
    Create a TypeScript service for handling user data with async operations.
    Include functions for fetching, creating, and updating user records.
  `;

  const result = await customCICD.processRequirements(requirements);
  
  console.log('Custom validation results:');
  result.validationResult?.issues.forEach(issue => {
    if (customRules.some(rule => rule.id === issue.rule)) {
      console.log(`Custom rule violation: ${issue.message}`);
    }
  });
}

customValidationExample();
```

## Example 6: Metrics and Analytics

```typescript
async function analyticsExample() {
  // Run several pipelines
  const requirements = [
    "Create a login component with form validation",
    "Build a data table with sorting and filtering",
    "Implement a file upload component with progress tracking"
  ];

  for (const req of requirements) {
    await cicd.processRequirements(req);
  }

  // Get comprehensive metrics
  const metrics = await cicd.getMetrics();
  
  console.log('📊 System Analytics:');
  console.log('Total pipelines:', metrics.totalPipelines);
  console.log('Success rate:', metrics.successRate.toFixed(2) + '%');
  console.log('Average execution time:', (metrics.averageExecutionTime / 1000).toFixed(2) + 's');
  console.log('Code quality score:', metrics.codeQualityScore.toFixed(1));
  console.log('Task decomposition accuracy:', metrics.taskDecompositionAccuracy.toFixed(1) + '%');
  console.log('Validation success rate:', metrics.validationSuccessRate.toFixed(1) + '%');

  // Get active pipelines
  const activePipelines = await cicd.getActivePipelines();
  console.log('Currently active pipelines:', activePipelines.length);
}

analyticsExample();
```

## Example 7: Error Handling and Recovery

```typescript
async function errorHandlingExample() {
  try {
    // Intentionally problematic requirements to test error handling
    const requirements = `
      Create a component that uses eval() and document.write() 
      with hardcoded API keys and no error handling.
    `;

    const result = await cicd.processRequirements(requirements);
    
    // Even if generation succeeds, validation should catch issues
    if (result.validationResult?.overall === 'failed') {
      console.log('🛡️ Validation caught security issues:');
      result.validationResult.issues
        .filter(issue => issue.severity === 'error')
        .forEach(issue => {
          console.log(`- ${issue.message}`);
          if (issue.suggestion) {
            console.log(`  Suggestion: ${issue.suggestion}`);
          }
        });
    }
    
  } catch (error) {
    console.error('Pipeline error:', error.message);
    
    // Implement recovery logic
    console.log('🔄 Attempting recovery...');
    
    // Retry with improved requirements
    const improvedRequirements = `
      Create a secure React component with proper error handling,
      environment-based configuration, and no dangerous functions.
    `;
    
    const recoveryResult = await cicd.processRequirements(improvedRequirements);
    console.log('✅ Recovery successful:', recoveryResult.validationResult?.overall);
  }
}

errorHandlingExample();
```

## Example 8: Integration with Existing Workflow

```typescript
import { CICDIntegration } from '@voltagent/cicd-integration';
import { createPullRequest, deployToStaging } from './deployment-utils';

async function integratedWorkflow() {
  const cicd = new CICDIntegration({
    // ... configuration
  } as any);

  await cicd.initialize();

  // Hook into the pipeline completion
  cicd.on('pipeline-completed', async (result) => {
    if (result.validationResult?.overall === 'passed') {
      try {
        // Create a pull request with generated code
        const prUrl = await createPullRequest({
          title: 'AI-generated feature implementation',
          files: result.generatedCode?.files || [],
          description: 'Generated by VoltAgent CI/CD pipeline'
        });
        
        console.log('📝 Pull request created:', prUrl);
        
        // Deploy to staging environment
        const deploymentUrl = await deployToStaging(result.generatedCode?.files || []);
        console.log('🚀 Deployed to staging:', deploymentUrl);
        
      } catch (error) {
        console.error('❌ Integration step failed:', error.message);
      }
    }
  });

  // Process requirements
  const requirements = `
    Create a new feature for user notifications with real-time updates.
    Include email and in-app notification options.
  `;

  await cicd.processRequirements(requirements);
}

integratedWorkflow();
```

## Best Practices

### 1. Environment Configuration

```typescript
// Use environment variables for sensitive configuration
const config = {
  database: {
    connectionString: process.env.DATABASE_URL,
    // ... other settings
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  // ... other config
};
```

### 2. Error Handling

```typescript
// Always wrap pipeline execution in try-catch
try {
  const result = await cicd.processRequirements(requirements);
  // Handle success
} catch (error) {
  // Log error and implement recovery logic
  console.error('Pipeline failed:', error);
  // Notify monitoring systems
  // Implement fallback behavior
}
```

### 3. Resource Management

```typescript
// Properly shutdown the system when done
process.on('SIGINT', async () => {
  console.log('Shutting down CI/CD system...');
  await cicd.shutdown();
  process.exit(0);
});
```

### 4. Monitoring and Logging

```typescript
// Set up comprehensive logging
cicd.on('step-started', (execution, step) => {
  logger.info(`Step started: ${step.name}`, {
    executionId: execution.id,
    stepType: step.type
  });
});

cicd.on('step-failed', (execution, step, error) => {
  logger.error(`Step failed: ${step.name}`, {
    executionId: execution.id,
    error: error.message,
    stepType: step.type
  });
});
```

These examples demonstrate the full capabilities of the VoltAgent CI/CD Integration system, from basic usage to advanced scenarios with monitoring, error handling, and integration with existing workflows.

