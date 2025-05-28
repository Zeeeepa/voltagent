/**
 * Codegen SDK Integration Example
 * 
 * This example demonstrates the unified Codegen SDK integration that consolidates
 * PRs #52, #54, #55, #82, #86, #87 into a single cohesive system.
 */

import { config } from 'dotenv';
import { 
  createCodegenSDK,
  CodegenSDKClient,
  createDefaultConfig
} from '@voltagent/codegen-sdk';

// Load environment variables
config();

async function demonstrateUnifiedSDK() {
  console.log('🚀 Codegen SDK Integration Consolidation Demo');
  console.log('=' .repeat(60));

  // Validate required environment variables
  const requiredEnvVars = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER || 'your-org',
    GITHUB_REPO: process.env.GITHUB_REPO || 'your-repo',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
  };

  console.log('📋 Environment Configuration:');
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    console.log(`   ${key}: ${value ? '✅ Set' : '❌ Missing'}`);
  });
  console.log();

  if (!requiredEnvVars.GITHUB_TOKEN) {
    console.log('⚠️  GitHub token is required for PR automation');
    console.log('   Set GITHUB_TOKEN environment variable');
    return;
  }

  try {
    // Initialize the unified SDK
    console.log('🔧 Initializing Unified Codegen SDK...');
    const sdk = await createCodegenSDK(
      requiredEnvVars.GITHUB_TOKEN,
      requiredEnvVars.GITHUB_OWNER,
      requiredEnvVars.GITHUB_REPO,
      requiredEnvVars.ANTHROPIC_API_KEY
    );

    // Display SDK status
    const status = sdk.getSDKStatus();
    console.log('✅ SDK Initialized Successfully');
    console.log('   Components:', Object.entries(status.components)
      .map(([name, enabled]) => `${name}: ${enabled ? '✅' : '❌'}`)
      .join(', '));
    console.log();

    // Demonstrate NLP Processing (from PR #54)
    await demonstrateNLPProcessing(sdk);

    // Demonstrate Code Generation (from PR #52, #86, #87)
    await demonstrateCodeGeneration(sdk);

    // Demonstrate PR Automation (from PR #55)
    await demonstratePRAutomation(sdk);

    // Demonstrate Claude Code Orchestration (from PR #82)
    await demonstrateClaudeCodeOrchestration(sdk);

    // Demonstrate Complete Workflows
    await demonstrateCompleteWorkflows(sdk);

    // Display final metrics
    await displayMetrics(sdk);

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  }
}

async function demonstrateNLPProcessing(sdk: CodegenSDKClient) {
  console.log('🧠 Natural Language Processing Engine (PR #54)');
  console.log('-'.repeat(50));

  const sampleTexts = [
    'Create a TypeScript function that validates email addresses and returns boolean',
    'I need help with sorting an array of user objects by registration date',
    'Fix the bug in the authentication middleware that causes memory leaks'
  ];

  for (const text of sampleTexts) {
    console.log(`📝 Processing: "${text.substring(0, 50)}..."`);
    
    try {
      const nlpResult = await sdk.processNaturalLanguage(text, {
        enableSentimentAnalysis: true,
        enableEntityExtraction: true,
        enableIntentClassification: true
      });

      console.log(`   Language: ${nlpResult.language}`);
      console.log(`   Confidence: ${(nlpResult.confidence * 100).toFixed(1)}%`);
      console.log(`   Keywords: ${nlpResult.keywords?.slice(0, 3).join(', ') || 'None'}`);
      console.log(`   Sentiment: ${nlpResult.sentiment?.label || 'N/A'}`);
      console.log(`   Entities: ${nlpResult.entities?.length || 0} found`);
      console.log();
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function demonstrateCodeGeneration(sdk: CodegenSDKClient) {
  console.log('💻 Code Generation with Claude (PRs #52, #86, #87)');
  console.log('-'.repeat(50));

  const codeRequests = [
    {
      prompt: 'Create a TypeScript interface for a User with id, name, email, and createdAt',
      language: 'typescript'
    },
    {
      prompt: 'Write a Python function to calculate the factorial of a number',
      language: 'python'
    }
  ];

  for (const request of codeRequests) {
    console.log(`🔨 Generating ${request.language} code...`);
    console.log(`   Prompt: ${request.prompt}`);
    
    try {
      const codeResult = await sdk.generateCode({
        ...request,
        includeComments: true,
        maxTokens: 1000,
        temperature: 0.1
      });

      console.log(`   ✅ Generated (${codeResult.metadata.tokensUsed} tokens, ${codeResult.metadata.processingTime}ms)`);
      console.log(`   Confidence: ${(codeResult.confidence * 100).toFixed(1)}%`);
      
      if (codeResult.code) {
        console.log('   Code Preview:');
        console.log('   ```' + request.language);
        console.log('   ' + codeResult.code.split('\n').slice(0, 5).join('\n   '));
        if (codeResult.code.split('\n').length > 5) {
          console.log('   ... (truncated)');
        }
        console.log('   ```');
      }
      console.log();
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function demonstratePRAutomation(sdk: CodegenSDKClient) {
  console.log('🔄 PR Automation System (PR #55)');
  console.log('-'.repeat(50));

  // Note: This is a demonstration - actual PR creation is commented out
  // to avoid creating real PRs during the demo
  
  const prOptions = {
    repository: `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`,
    baseBranch: 'main',
    headBranch: `demo/codegen-sdk-${Date.now()}`,
    title: 'Demo: Codegen SDK Integration',
    description: 'This is a demonstration PR created by the unified Codegen SDK',
    labels: ['demo', 'codegen-sdk', 'automated'],
    draft: true
  };

  console.log('📋 PR Configuration:');
  console.log(`   Repository: ${prOptions.repository}`);
  console.log(`   Base Branch: ${prOptions.baseBranch}`);
  console.log(`   Head Branch: ${prOptions.headBranch}`);
  console.log(`   Title: ${prOptions.title}`);
  console.log(`   Labels: ${prOptions.labels.join(', ')}`);
  console.log();

  console.log('ℹ️  PR creation skipped in demo mode');
  console.log('   To enable actual PR creation, uncomment the code below');
  console.log();

  /*
  try {
    const prResult = await sdk.createAutomatedPR(prOptions);
    console.log(`✅ PR Created: ${prResult.prUrl}`);
    console.log(`   PR Number: #${prResult.prNumber}`);
    console.log(`   Status: ${prResult.status}`);
  } catch (error) {
    console.log(`❌ PR Creation Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  */
}

async function demonstrateClaudeCodeOrchestration(sdk: CodegenSDKClient) {
  console.log('🎭 Claude Code Orchestration (PR #82)');
  console.log('-'.repeat(50));

  const sampleCode = `
function validateEmail(email: string): boolean {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
}
  `.trim();

  console.log('📖 Code Explanation:');
  try {
    const explanation = await sdk.explainCode(sampleCode, 'typescript', 'intermediate');
    console.log(`   ✅ Explanation generated (${explanation.metadata.tokensUsed} tokens)`);
    console.log(`   Confidence: ${(explanation.confidence * 100).toFixed(1)}%`);
    if (explanation.explanation) {
      console.log('   Summary:', explanation.explanation.substring(0, 100) + '...');
    }
    console.log();
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('🔍 Code Review:');
  try {
    const review = await sdk.reviewCode(sampleCode, 'typescript', [
      'security',
      'performance',
      'best practices'
    ]);
    console.log(`   ✅ Review completed (${review.metadata.tokensUsed} tokens)`);
    console.log(`   Confidence: ${(review.confidence * 100).toFixed(1)}%`);
    console.log(`   Suggestions: ${review.suggestions?.length || 0} found`);
    console.log();
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function demonstrateCompleteWorkflows(sdk: CodegenSDKClient) {
  console.log('🔄 Complete Integrated Workflows');
  console.log('-'.repeat(50));

  console.log('🎯 End-to-End Code Generation Workflow:');
  console.log('   NLP Analysis → Code Generation → PR Creation');
  
  // Note: Actual workflow execution is commented out to avoid creating real PRs
  console.log('   ℹ️  Workflow execution skipped in demo mode');
  console.log();

  /*
  try {
    const workflowResult = await sdk.completeCodeGenerationWorkflow(
      'Create a utility function for deep cloning objects in TypeScript',
      'typescript',
      {
        baseBranch: 'main',
        headBranch: `feature/deep-clone-${Date.now()}`,
        labels: ['utility', 'typescript', 'auto-generated']
      }
    );

    console.log('   ✅ Workflow completed successfully');
    console.log(`   NLP Confidence: ${(workflowResult.nlpResult.confidence * 100).toFixed(1)}%`);
    console.log(`   Code Generated: ${workflowResult.codeResult.code.length} characters`);
    console.log(`   PR Created: ${workflowResult.prResult.prUrl}`);
  } catch (error) {
    console.log(`   ❌ Workflow Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  */
}

async function displayMetrics(sdk: CodegenSDKClient) {
  console.log('📊 SDK Performance Metrics');
  console.log('-'.repeat(50));

  const status = sdk.getSDKStatus();
  
  if (status.metrics) {
    console.log('📈 Request Metrics:');
    console.log(`   Total Requests: ${status.metrics.totalRequests || 0}`);
    console.log(`   Successful: ${status.metrics.successfulRequests || 0}`);
    console.log(`   Failed: ${status.metrics.failedRequests || 0}`);
    console.log(`   Success Rate: ${((status.metrics.successfulRequests || 0) / Math.max(status.metrics.totalRequests || 1, 1) * 100).toFixed(1)}%`);
    console.log(`   Avg Response Time: ${(status.metrics.averageResponseTime || 0).toFixed(0)}ms`);
    console.log();

    if (status.metrics.requestsByType && Object.keys(status.metrics.requestsByType).length > 0) {
      console.log('📋 Requests by Type:');
      Object.entries(status.metrics.requestsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      console.log();
    }
  }

  console.log('🏥 Component Health:');
  Object.entries(status.components).forEach(([component, healthy]) => {
    console.log(`   ${component}: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  });
  console.log();

  console.log('⚙️  Configuration:');
  console.log(`   Repository: ${status.config.repository}`);
  console.log(`   Claude Model: ${status.config.claudeModel}`);
  console.log(`   Middleware Enabled: ${status.config.middlewareEnabled ? '✅' : '❌'}`);
  console.log();
}

// Run the demonstration
if (require.main === module) {
  demonstrateUnifiedSDK()
    .then(() => {
      console.log('🎉 Codegen SDK Integration Demo Completed!');
      console.log();
      console.log('📚 This demo showcased the consolidation of:');
      console.log('   • PR #52: Codegen SDK client implementation');
      console.log('   • PR #54: Natural language processing engine');
      console.log('   • PR #55: Automated PR creation logic');
      console.log('   • PR #82: AgentAPI middleware for Claude Code orchestration');
      console.log('   • PR #86: Comprehensive Codegen SDK integration');
      console.log('   • PR #87: Real Codegen SDK integration & NLP engine');
      console.log();
      console.log('✨ All functionality unified with zero duplication!');
    })
    .catch(error => {
      console.error('💥 Demo failed:', error);
      process.exit(1);
    });
}

