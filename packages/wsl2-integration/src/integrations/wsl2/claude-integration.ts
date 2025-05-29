import { EventEmitter } from 'events';
import { z } from 'zod';

const ClaudeConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string().default('claude-3-sonnet-20240229'),
  maxTokens: z.number().default(4000),
  temperature: z.number().default(0.1),
  agentApiUrl: z.string().default('http://localhost:3000'),
});

export type ClaudeConfig = z.infer<typeof ClaudeConfigSchema>;

export interface CodeReviewRequest {
  prNumber: number;
  repoUrl: string;
  branch: string;
  files: string[];
  diff: string;
}

export interface CodeReviewResult {
  success: boolean;
  suggestions: CodeSuggestion[];
  issues: CodeIssue[];
  summary: string;
  score: number;
}

export interface CodeSuggestion {
  file: string;
  line: number;
  type: 'improvement' | 'optimization' | 'best-practice';
  message: string;
  suggestedCode?: string;
}

export interface CodeIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'bug' | 'security' | 'performance' | 'maintainability';
  message: string;
  fix?: string;
}

export class WSL2ClaudeIntegration extends EventEmitter {
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    super();
    this.config = ClaudeConfigSchema.parse(config);
  }

  /**
   * Perform automated code review using Claude
   */
  async reviewCode(environmentId: string, request: CodeReviewRequest): Promise<CodeReviewResult> {
    this.emit('review:started', { environmentId, prNumber: request.prNumber });

    try {
      const prompt = this.buildReviewPrompt(request);
      const response = await this.callClaudeAPI(prompt);
      const result = this.parseReviewResponse(response);

      this.emit('review:completed', { environmentId, prNumber: request.prNumber, result });
      return result;
    } catch (error) {
      this.emit('review:failed', { environmentId, prNumber: request.prNumber, error });
      throw error;
    }
  }

  /**
   * Generate debugging suggestions
   */
  async generateDebuggingSuggestions(
    environmentId: string,
    errorLog: string,
    codeContext: string
  ): Promise<string[]> {
    const prompt = `
Analyze this error and provide debugging suggestions:

Error Log:
${errorLog}

Code Context:
${codeContext}

Please provide specific, actionable debugging steps.
`;

    try {
      const response = await this.callClaudeAPI(prompt);
      return this.parseDebuggingSuggestions(response);
    } catch (error) {
      this.emit('debugging:failed', { environmentId, error });
      return [];
    }
  }

  /**
   * Generate code improvements
   */
  async generateCodeImprovements(
    environmentId: string,
    code: string,
    language: string
  ): Promise<CodeSuggestion[]> {
    const prompt = `
Review this ${language} code and suggest improvements:

\`\`\`${language}
${code}
\`\`\`

Focus on:
- Performance optimizations
- Code readability
- Best practices
- Security considerations

Provide specific suggestions with line numbers and improved code examples.
`;

    try {
      const response = await this.callClaudeAPI(prompt);
      return this.parseCodeImprovements(response);
    } catch (error) {
      this.emit('improvements:failed', { environmentId, error });
      return [];
    }
  }

  private buildReviewPrompt(request: CodeReviewRequest): string {
    return `
You are an expert code reviewer. Please review this pull request:

Repository: ${request.repoUrl}
Branch: ${request.branch}
PR Number: ${request.prNumber}

Files changed: ${request.files.join(', ')}

Diff:
${request.diff}

Please provide:
1. Overall assessment and score (0-100)
2. Specific issues found (bugs, security, performance, maintainability)
3. Improvement suggestions
4. Summary of the review

Format your response as JSON with the following structure:
{
  "score": number,
  "summary": "string",
  "issues": [
    {
      "file": "string",
      "line": number,
      "severity": "low|medium|high|critical",
      "type": "bug|security|performance|maintainability",
      "message": "string",
      "fix": "string (optional)"
    }
  ],
  "suggestions": [
    {
      "file": "string",
      "line": number,
      "type": "improvement|optimization|best-practice",
      "message": "string",
      "suggestedCode": "string (optional)"
    }
  ]
}
`;
  }

  private async callClaudeAPI(prompt: string): Promise<string> {
    try {
      // Use AgentAPI middleware to call Claude
      const response = await fetch(`${this.config.agentApiUrl}/claude/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      throw new Error(`Failed to call Claude API: ${error}`);
    }
  }

  private parseReviewResponse(response: string): CodeReviewResult {
    try {
      const parsed = JSON.parse(response);
      return {
        success: true,
        score: parsed.score || 0,
        summary: parsed.summary || '',
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      // Fallback parsing if JSON is malformed
      return {
        success: false,
        score: 0,
        summary: 'Failed to parse review response',
        issues: [],
        suggestions: [],
      };
    }
  }

  private parseDebuggingSuggestions(response: string): string[] {
    const lines = response.split('\n');
    const suggestions: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
        suggestions.push(trimmed.replace(/^[-*\d.]\s*/, ''));
      }
    }

    return suggestions.filter(s => s.length > 0);
  }

  private parseCodeImprovements(response: string): CodeSuggestion[] {
    // Simplified parsing - in a real implementation, this would be more sophisticated
    const suggestions: CodeSuggestion[] = [];
    const lines = response.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Line') && line.includes(':')) {
        const lineMatch = line.match(/Line (\d+)/);
        if (lineMatch) {
          suggestions.push({
            file: 'unknown',
            line: parseInt(lineMatch[1]),
            type: 'improvement',
            message: line,
          });
        }
      }
    }

    return suggestions;
  }
}

export default WSL2ClaudeIntegration;

