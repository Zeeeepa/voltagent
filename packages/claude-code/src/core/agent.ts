import { Agent } from '@voltagent/core';
import { ClaudeCodeProvider } from './provider.js';
import { ClaudeCodeIntegration } from '../integration/claude-code-integration.js';

/**
 * Claude Code Agent - A specialized agent for code validation and analysis
 */
export class ClaudeCodeAgent extends Agent {
  private claudeCodeIntegration: ClaudeCodeIntegration;

  constructor(options: {
    name: string;
    instructions?: string;
    claudeCodeProvider: ClaudeCodeProvider;
  }) {
    super({
      name: options.name,
      instructions: options.instructions || `You are a code validation expert powered by Claude Code.
      
Your capabilities include:
- Analyzing code quality, security, and performance
- Validating Pull Requests with comprehensive feedback
- Providing actionable improvement suggestions
- Scoring code across multiple dimensions

Always provide constructive and detailed feedback.`,
      llm: options.claudeCodeProvider,
    });

    this.claudeCodeIntegration = options.claudeCodeProvider.getClaudeCodeIntegration();
  }

  /**
   * Validate a PR using Claude Code
   */
  async validatePR(prInfo: any, taskContext: any, options = {}) {
    return this.claudeCodeIntegration.validatePR(prInfo, taskContext, options);
  }

  /**
   * Analyze code in a specific path
   */
  async analyzeCode(deploymentPath: string, options = {}) {
    return this.claudeCodeIntegration.analyzeCode(deploymentPath, options);
  }

  /**
   * Get validation history
   */
  async getValidationHistory(limit = 10) {
    return this.claudeCodeIntegration.getValidationHistory(limit);
  }

  /**
   * Get system health
   */
  async getSystemHealth() {
    return this.claudeCodeIntegration.getHealthStatus();
  }
}

