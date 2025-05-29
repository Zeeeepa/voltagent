/**
 * Example integration of Data Flow Analysis with PR Analysis System
 * 
 * This file demonstrates how the Data Flow & Variable Tracking Module
 * integrates with the broader PR analysis and CI/CD automation system.
 */

import { Agent } from "../agent";
import { createDataFlowAnalysisToolkit, DataFlowTracker } from "./index";
import { DataFlowAnalysisResult, AnalysisSeverity } from "./types";

/**
 * PR Analysis Agent that uses data flow analysis
 */
export class PRAnalysisAgent extends Agent {
  private dataFlowTracker: DataFlowTracker;

  constructor() {
    super({
      name: "PR Data Flow Analyzer",
      description: "Analyzes pull requests for data flow and variable tracking issues",
      instructions: `
        You are a specialized code analysis agent focused on data flow and variable tracking.
        
        When analyzing pull requests, you should:
        1. Examine all changed files for data flow issues
        2. Identify critical and high-severity problems
        3. Provide specific suggestions for fixes
        4. Create detailed reports with actionable insights
        5. Integrate findings with the broader PR analysis system
        
        Focus on:
        - Uninitialized variable usage
        - Unused variables and assignments
        - Potential data races in async code
        - Memory leak patterns
        - Scope violations
        - Null/undefined access issues
      `,
      tools: createDataFlowAnalysisToolkit().tools
    });

    this.dataFlowTracker = new DataFlowTracker({
      strictMode: true,
      confidenceThreshold: 0.8,
      enableUninitializedVariableDetection: true,
      enableUnusedVariableDetection: true,
      enableDataRaceDetection: true,
      enableMemoryLeakDetection: true,
      enableScopeViolationDetection: true,
      enableNullPointerDetection: true
    });
  }

  /**
   * Analyze a pull request for data flow issues
   */
  async analyzePR(prData: {
    files: Array<{
      path: string;
      content: string;
      status: 'added' | 'modified' | 'deleted';
    }>;
    prNumber: number;
    repository: string;
    author: string;
  }): Promise<PRAnalysisReport> {
    const startTime = Date.now();

    // Filter files to analyze (only added/modified TypeScript/JavaScript files)
    const filesToAnalyze = prData.files
      .filter(file => 
        (file.status === 'added' || file.status === 'modified') &&
        /\.(ts|tsx|js|jsx)$/.test(file.path) &&
        !file.path.includes('node_modules') &&
        !file.path.includes('.test.') &&
        !file.path.includes('.spec.')
      )
      .map(file => ({
        path: file.path,
        content: file.content
      }));

    if (filesToAnalyze.length === 0) {
      return {
        prNumber: prData.prNumber,
        repository: prData.repository,
        author: prData.author,
        analysisTime: Date.now() - startTime,
        filesAnalyzed: 0,
        dataFlowResult: null,
        summary: {
          hasIssues: false,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          recommendations: []
        },
        linearIssues: [],
        cicdActions: []
      };
    }

    // Perform data flow analysis
    const dataFlowResult = await this.dataFlowTracker.analyze({
      files: filesToAnalyze
    });

    // Generate recommendations and actions
    const recommendations = this.generateRecommendations(dataFlowResult);
    const linearIssues = this.createLinearIssues(dataFlowResult, prData);
    const cicdActions = this.determineCICDActions(dataFlowResult);

    return {
      prNumber: prData.prNumber,
      repository: prData.repository,
      author: prData.author,
      analysisTime: Date.now() - startTime,
      filesAnalyzed: filesToAnalyze.length,
      dataFlowResult,
      summary: {
        hasIssues: dataFlowResult.findings.length > 0,
        criticalIssues: dataFlowResult.summary.criticalIssues,
        highIssues: dataFlowResult.summary.highIssues,
        mediumIssues: dataFlowResult.summary.mediumIssues,
        lowIssues: dataFlowResult.summary.lowIssues,
        recommendations
      },
      linearIssues,
      cicdActions
    };
  }

  /**
   * Generate actionable recommendations based on findings
   */
  private generateRecommendations(result: DataFlowAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (result.summary.criticalIssues > 0) {
      recommendations.push("🚨 Critical data flow issues found - immediate attention required");
    }

    if (result.summary.highIssues > 0) {
      recommendations.push("⚠️ High-severity issues detected - review before merging");
    }

    // Specific recommendations based on issue types
    const issueTypes = new Set(result.findings.map(f => f.type));

    if (issueTypes.has('uninitialized_variable')) {
      recommendations.push("Initialize all variables before use to prevent runtime errors");
    }

    if (issueTypes.has('unused_variable')) {
      recommendations.push("Remove unused variables to improve code clarity");
    }

    if (issueTypes.has('memory_leak')) {
      recommendations.push("Add proper cleanup for event listeners and timers");
    }

    if (issueTypes.has('data_race')) {
      recommendations.push("Add synchronization for concurrent variable access");
    }

    if (result.summary.totalIssues === 0) {
      recommendations.push("✅ No data flow issues detected - good code quality!");
    }

    return recommendations;
  }

  /**
   * Create Linear issues for significant findings
   */
  private createLinearIssues(result: DataFlowAnalysisResult, prData: any): LinearIssueRequest[] {
    const issues: LinearIssueRequest[] = [];

    // Create issues for critical and high-severity findings
    const significantFindings = result.findings.filter(
      f => f.severity === AnalysisSeverity.CRITICAL || f.severity === AnalysisSeverity.HIGH
    );

    for (const finding of significantFindings) {
      issues.push({
        title: `Data Flow Issue: ${finding.type} in ${finding.location.file}`,
        description: `
**PR**: #${prData.prNumber} in ${prData.repository}
**Author**: ${prData.author}
**File**: ${finding.location.file}
**Line**: ${finding.location.line}

**Issue Type**: ${finding.type}
**Severity**: ${finding.severity}
**Confidence**: ${(finding.confidence * 100).toFixed(1)}%

**Description**: ${finding.message}

**Variable**: ${finding.variable || 'N/A'}

**Suggestion**: ${finding.suggestion}

**Context**:
\`\`\`typescript
// Line ${finding.location.line}
// ${finding.message}
\`\`\`

**Next Steps**:
1. Review the identified issue
2. Apply the suggested fix
3. Test the changes
4. Update the PR

**Related Locations**:
${finding.relatedLocations?.map(loc => `- ${loc.file}:${loc.line}`).join('\n') || 'None'}
        `.trim(),
        priority: finding.severity === AnalysisSeverity.CRITICAL ? 'urgent' : 'high',
        labels: ['data-flow', 'pr-analysis', finding.type],
        assignee: prData.author
      });
    }

    return issues;
  }

  /**
   * Determine CI/CD actions based on analysis results
   */
  private determineCICDActions(result: DataFlowAnalysisResult): CICDAction[] {
    const actions: CICDAction[] = [];

    // Block merge for critical issues
    if (result.summary.criticalIssues > 0) {
      actions.push({
        type: 'block_merge',
        reason: `Critical data flow issues found (${result.summary.criticalIssues} issues)`,
        details: result.findings
          .filter(f => f.severity === AnalysisSeverity.CRITICAL)
          .map(f => `${f.type} in ${f.location.file}:${f.location.line}`)
      });
    }

    // Require review for high-severity issues
    if (result.summary.highIssues > 0) {
      actions.push({
        type: 'require_review',
        reason: `High-severity data flow issues detected (${result.summary.highIssues} issues)`,
        reviewers: ['data-flow-experts', 'senior-developers']
      });
    }

    // Add status check
    actions.push({
      type: 'status_check',
      name: 'data-flow-analysis',
      status: result.summary.criticalIssues > 0 ? 'failure' : 
              result.summary.highIssues > 0 ? 'pending' : 'success',
      description: `Found ${result.summary.totalIssues} data flow issues`,
      details: {
        critical: result.summary.criticalIssues,
        high: result.summary.highIssues,
        medium: result.summary.mediumIssues,
        low: result.summary.lowIssues
      }
    });

    // Auto-fix suggestions for simple issues
    const autoFixableIssues = result.findings.filter(
      f => f.type === 'unused_variable' && f.confidence > 0.9
    );

    if (autoFixableIssues.length > 0) {
      actions.push({
        type: 'auto_fix_suggestion',
        reason: 'Simple unused variable issues can be auto-fixed',
        fixes: autoFixableIssues.map(f => ({
          file: f.location.file,
          line: f.location.line,
          type: 'remove_unused_variable',
          variable: f.variable!
        }))
      });
    }

    return actions;
  }
}

/**
 * Types for PR analysis integration
 */
interface PRAnalysisReport {
  prNumber: number;
  repository: string;
  author: string;
  analysisTime: number;
  filesAnalyzed: number;
  dataFlowResult: DataFlowAnalysisResult | null;
  summary: {
    hasIssues: boolean;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    recommendations: string[];
  };
  linearIssues: LinearIssueRequest[];
  cicdActions: CICDAction[];
}

interface LinearIssueRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  labels: string[];
  assignee: string;
}

interface CICDAction {
  type: 'block_merge' | 'require_review' | 'status_check' | 'auto_fix_suggestion';
  reason: string;
  [key: string]: any;
}

/**
 * Example usage in a webhook handler
 */
export async function handlePRWebhook(prData: any): Promise<void> {
  const analyzer = new PRAnalysisAgent();
  
  try {
    const report = await analyzer.analyzePR(prData);
    
    console.log(`Data Flow Analysis completed for PR #${report.prNumber}`);
    console.log(`Files analyzed: ${report.filesAnalyzed}`);
    console.log(`Issues found: ${report.summary.criticalIssues + report.summary.highIssues + report.summary.mediumIssues + report.summary.lowIssues}`);
    
    // Create Linear issues for significant problems
    for (const issue of report.linearIssues) {
      await createLinearIssue(issue);
    }
    
    // Execute CI/CD actions
    for (const action of report.cicdActions) {
      await executeCICDAction(action, prData);
    }
    
    // Post summary comment on PR
    await postPRComment(prData.prNumber, generatePRComment(report));
    
  } catch (error) {
    console.error('Error in data flow analysis:', error);
    
    // Create error issue in Linear
    await createLinearIssue({
      title: `Data Flow Analysis Failed for PR #${prData.prNumber}`,
      description: `Analysis failed with error: ${error.message}`,
      priority: 'high',
      labels: ['data-flow', 'analysis-error'],
      assignee: 'system'
    });
  }
}

/**
 * Generate PR comment with analysis results
 */
function generatePRComment(report: PRAnalysisReport): string {
  const { summary } = report;
  
  let comment = `## 🔍 Data Flow Analysis Results\n\n`;
  
  if (!summary.hasIssues) {
    comment += `✅ **No data flow issues detected!** Great job maintaining clean code.\n\n`;
  } else {
    comment += `📊 **Analysis Summary:**\n`;
    comment += `- 🚨 Critical: ${summary.criticalIssues}\n`;
    comment += `- ⚠️ High: ${summary.highIssues}\n`;
    comment += `- 🔶 Medium: ${summary.mediumIssues}\n`;
    comment += `- 🔵 Low: ${summary.lowIssues}\n\n`;
  }
  
  if (summary.recommendations.length > 0) {
    comment += `### 💡 Recommendations:\n`;
    summary.recommendations.forEach(rec => {
      comment += `- ${rec}\n`;
    });
    comment += `\n`;
  }
  
  if (report.linearIssues.length > 0) {
    comment += `### 📋 Linear Issues Created:\n`;
    comment += `${report.linearIssues.length} issues have been created in Linear for tracking and resolution.\n\n`;
  }
  
  comment += `---\n`;
  comment += `*Analysis completed in ${report.analysisTime}ms | Files analyzed: ${report.filesAnalyzed}*`;
  
  return comment;
}

// Placeholder functions for external integrations
async function createLinearIssue(issue: LinearIssueRequest): Promise<void> {
  console.log('Creating Linear issue:', issue.title);
}

async function executeCICDAction(action: CICDAction, prData: any): Promise<void> {
  console.log('Executing CI/CD action:', action.type);
}

async function postPRComment(prNumber: number, comment: string): Promise<void> {
  console.log(`Posting comment on PR #${prNumber}`);
}

