import 'dotenv/config';
import { VoltAgent, Agent } from '@voltagent/core';
import { ClaudeCodeProvider } from '@voltagent/claude-code';

// Initialize Claude Code Provider
const claudeCodeProvider = new ClaudeCodeProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  claudeCodeConfig: {
    agentapi: {
      url: process.env.AGENTAPI_URL || 'http://localhost:8000',
      apiKey: process.env.CLAUDE_CODE_API_KEY,
    },
    validation: {
      enableSecurityAnalysis: true,
      enablePerformanceAnalysis: true,
      codeQualityWeight: 0.3,
      functionalityWeight: 0.4,
      testingWeight: 0.2,
      documentationWeight: 0.1,
    },
  },
});

// Create Code Validation Agent
const codeValidatorAgent = new Agent({
  name: 'code-validator',
  instructions: `You are an expert code validation assistant powered by Claude Code.

Your capabilities include:
- Analyzing code quality, security, and performance
- Validating Pull Requests with comprehensive feedback
- Providing actionable improvement suggestions
- Scoring code across multiple dimensions

When validating code:
1. Use the validate_pr tool to analyze the code
2. Explain the validation results in detail
3. Highlight both strengths and areas for improvement
4. Provide specific, actionable recommendations
5. Explain the scoring methodology

Always be constructive and helpful in your feedback.`,
  
  llm: claudeCodeProvider,
  
  tools: [
    {
      name: 'validate_pr',
      description: 'Validate a Pull Request using Claude Code analysis',
      parameters: {
        type: 'object',
        properties: {
          prUrl: {
            type: 'string',
            description: 'The Git repository URL for the PR'
          },
          branchName: {
            type: 'string',
            description: 'The branch name to validate'
          },
          prNumber: {
            type: 'number',
            description: 'The Pull Request number'
          },
          repository: {
            type: 'string',
            description: 'The repository name'
          },
          owner: {
            type: 'string',
            description: 'The repository owner/organization'
          },
          title: {
            type: 'string',
            description: 'Optional PR title for context'
          },
          enableSecurityAnalysis: {
            type: 'boolean',
            description: 'Enable security vulnerability analysis',
            default: true
          },
          enablePerformanceAnalysis: {
            type: 'boolean',
            description: 'Enable performance analysis',
            default: true
          }
        },
        required: ['prUrl', 'branchName', 'repository', 'owner']
      },
      handler: async (params) => {
        try {
          const { prUrl, branchName, prNumber, repository, owner, title, enableSecurityAnalysis, enablePerformanceAnalysis } = params;
          
          console.log(`🚀 Starting validation for PR #${prNumber || 'unknown'}: ${title || branchName}`);
          
          const session = await claudeCodeProvider.validatePR(
            {
              url: prUrl,
              branchName,
              number: prNumber || 0,
              repository,
              owner,
              title
            },
            {
              taskId: `validation-${Date.now()}`,
              title: title || `Validate ${branchName}`,
              priority: 1
            },
            {
              enableSecurityAnalysis,
              enablePerformanceAnalysis
            }
          );
          
          return {
            success: true,
            sessionId: session.id,
            status: session.status,
            message: `Validation started for ${repository}/${branchName}. Session ID: ${session.id}`
          };
        } catch (error) {
          console.error('Validation failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
      }
    },
    
    {
      name: 'get_validation_status',
      description: 'Get the status of a validation session',
      parameters: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'The validation session ID'
          }
        },
        required: ['sessionId']
      },
      handler: async ({ sessionId }) => {
        try {
          const session = await claudeCodeProvider.getClaudeCodeIntegration().getValidationSession(sessionId);
          return {
            success: true,
            session
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
      }
    },
    
    {
      name: 'get_validation_history',
      description: 'Get recent validation history',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent validations to retrieve',
            default: 10
          }
        }
      },
      handler: async ({ limit = 10 }) => {
        try {
          const history = await claudeCodeProvider.getValidationHistory(limit);
          return {
            success: true,
            history
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
      }
    },
    
    {
      name: 'check_system_health',
      description: 'Check the health status of the Claude Code system',
      parameters: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        try {
          const health = await claudeCodeProvider.getClaudeCodeHealth();
          return {
            success: true,
            health
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
      }
    }
  ]
});

// Initialize VoltAgent
const voltAgent = new VoltAgent({
  agents: {
    codeValidator: codeValidatorAgent
  }
});

console.log('🎯 Claude Code Integration Example Started!');
console.log('📝 Available endpoints:');
console.log('  - POST /agents/codeValidator/chat - Chat with the code validator');
console.log('  - GET /health - System health check');
console.log('');
console.log('💡 Example usage:');
console.log('  "Please validate the PR at https://github.com/owner/repo.git, branch feature/new-feature"');
console.log('  "Check the system health status"');
console.log('  "Show me the recent validation history"');

// Set up event handlers for validation events
const claudeCodeIntegration = claudeCodeProvider.getClaudeCodeIntegration();

claudeCodeIntegration.addEventListener('validation_started', (event) => {
  console.log(`🚀 Validation started: ${event.sessionId}`);
});

claudeCodeIntegration.addEventListener('validation_progress', (event) => {
  console.log(`⏳ Validation progress: ${event.data.step} (${event.data.percentage}%)`);
});

claudeCodeIntegration.addEventListener('validation_completed', (event) => {
  const result = event.data.result;
  console.log(`✅ Validation completed: ${result.overallScore}/100 (${result.grade})`);
});

claudeCodeIntegration.addEventListener('validation_failed', (event) => {
  console.error(`❌ Validation failed: ${event.data.error}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await claudeCodeProvider.dispose();
  process.exit(0);
});

