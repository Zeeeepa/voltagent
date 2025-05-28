import { AnthropicProvider } from '@voltagent/anthropic-ai';
import { ClaudeCodeIntegration } from '../integration/claude-code-integration.js';
import { ClaudeCodeConfig } from '../types/index.js';

/**
 * Claude Code Provider - extends AnthropicProvider with code validation capabilities
 */
export class ClaudeCodeProvider extends AnthropicProvider {
  private claudeCodeIntegration: ClaudeCodeIntegration;

  constructor(options: {
    apiKey?: string;
    claudeCodeConfig?: Partial<ClaudeCodeConfig>;
  } = {}) {
    super({ apiKey: options.apiKey });
    
    this.claudeCodeIntegration = new ClaudeCodeIntegration({
      config: options.claudeCodeConfig,
    });
  }

  /**
   * Get the Claude Code integration instance
   */
  getClaudeCodeIntegration(): ClaudeCodeIntegration {
    return this.claudeCodeIntegration;
  }

  /**
   * Validate code using Claude Code
   */
  async validateCode(deploymentPath: string, options = {}) {
    return this.claudeCodeIntegration.analyzeCode(deploymentPath, options);
  }

  /**
   * Validate a PR using Claude Code
   */
  async validatePR(prInfo: any, taskContext: any, options = {}) {
    return this.claudeCodeIntegration.validatePR(prInfo, taskContext, options);
  }

  /**
   * Deploy a PR for validation
   */
  async deployPR(prUrl: string, branchName: string, options = {}) {
    return this.claudeCodeIntegration.deployPR(prUrl, branchName, options);
  }

  /**
   * Get validation history
   */
  async getValidationHistory(limit = 10) {
    return this.claudeCodeIntegration.getValidationHistory(limit);
  }

  /**
   * Test Claude Code connection
   */
  async testClaudeCodeConnection(): Promise<boolean> {
    return this.claudeCodeIntegration.testConnection();
  }

  /**
   * Get Claude Code health status
   */
  async getClaudeCodeHealth() {
    return this.claudeCodeIntegration.getHealthStatus();
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    await this.claudeCodeIntegration.dispose();
  }
}

