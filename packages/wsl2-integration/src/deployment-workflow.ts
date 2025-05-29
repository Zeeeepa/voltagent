import { EventEmitter } from 'events';
import WSL2DeploymentEngine from './integrations/wsl2/deployment-engine';
import WSL2EnvironmentSetup from './integrations/wsl2/environment-setup';
import WSL2BranchCloner from './integrations/wsl2/branch-cloner';
import WSL2BuildSystem from './integrations/wsl2/build-system';
import WSL2TestOrchestrator from './integrations/wsl2/test-orchestrator';
import WSL2QualityGates from './integrations/wsl2/quality-gates';
import WSL2ValidationRunner from './integrations/wsl2/validation-runner';
import WSL2DeploymentMonitor from './integrations/wsl2/deployment-monitor';
import WSL2ClaudeIntegration from './integrations/wsl2/claude-integration';
import WSL2CodegenFallback from './integrations/wsl2/codegen-fallback';

export interface WorkflowConfig {
  deployment: any;
  environment: any;
  clone: any;
  build: any;
  test: any;
  quality: any;
  validation: any;
  monitor: any;
  claude: any;
  codegen: any;
}

export interface WorkflowResult {
  success: boolean;
  environmentId: string;
  prNumber: number;
  repoUrl: string;
  branch: string;
  stages: {
    clone: any;
    setup: any;
    build: any;
    test: any;
    quality: any;
    validation: any;
    review: any;
  };
  totalTime: number;
  logs: string[];
  errors: string[];
}

/**
 * Complete WSL2 PR Deployment and Validation Workflow
 * 
 * This class orchestrates the entire deployment pipeline:
 * 1. Clone PR branch to WSL2 environment
 * 2. Setup development environment
 * 3. Install dependencies and build
 * 4. Run test suite and validation
 * 5. Generate deployment report
 * 6. Update PR with results
 */
export class WSL2DeploymentWorkflow extends EventEmitter {
  private deploymentEngine: WSL2DeploymentEngine;
  private environmentSetup: WSL2EnvironmentSetup;
  private branchCloner: WSL2BranchCloner;
  private buildSystem: WSL2BuildSystem;
  private testOrchestrator: WSL2TestOrchestrator;
  private qualityGates: WSL2QualityGates;
  private validationRunner: WSL2ValidationRunner;
  private deploymentMonitor: WSL2DeploymentMonitor;
  private claudeIntegration: WSL2ClaudeIntegration;
  private codegenFallback: WSL2CodegenFallback;

  constructor(config: WorkflowConfig) {
    super();
    
    this.deploymentEngine = new WSL2DeploymentEngine(config.deployment);
    this.environmentSetup = new WSL2EnvironmentSetup(config.environment);
    this.branchCloner = new WSL2BranchCloner(config.clone);
    this.buildSystem = new WSL2BuildSystem(config.build);
    this.testOrchestrator = new WSL2TestOrchestrator(config.test);
    this.qualityGates = new WSL2QualityGates(config.quality);
    this.validationRunner = new WSL2ValidationRunner(config.validation);
    this.deploymentMonitor = new WSL2DeploymentMonitor(config.monitor);
    this.claudeIntegration = new WSL2ClaudeIntegration(config.claude);
    this.codegenFallback = new WSL2CodegenFallback(config.codegen);

    this.setupEventForwarding();
  }

  /**
   * Execute the complete deployment workflow
   */
  async deployPR(prNumber: number, repoUrl: string, branch: string): Promise<WorkflowResult> {
    const startTime = Date.now();
    const result: WorkflowResult = {
      success: false,
      environmentId: '',
      prNumber,
      repoUrl,
      branch,
      stages: {
        clone: null,
        setup: null,
        build: null,
        test: null,
        quality: null,
        validation: null,
        review: null,
      },
      totalTime: 0,
      logs: [],
      errors: [],
    };

    try {
      this.emit('workflow:started', { prNumber, repoUrl, branch });

      // Step 1: Create deployment environment
      result.environmentId = await this.deploymentEngine.createEnvironment({
        prNumber,
        repoUrl,
        branch,
      });

      // Step 2: Start monitoring
      await this.deploymentMonitor.startMonitoring(result.environmentId);

      // Step 3: Clone repository branch
      result.stages.clone = await this.branchCloner.cloneBranch(
        result.environmentId,
        { url: repoUrl, branch },
        '/workspace'
      );

      // Step 4: Setup environment
      result.stages.setup = await this.environmentSetup.setupEnvironment(
        result.environmentId,
        '/workspace'
      );

      // Step 5: Build project
      result.stages.build = await this.buildSystem.build(
        result.environmentId,
        '/workspace'
      );

      // Step 6: Run tests
      result.stages.test = await this.testOrchestrator.runTests(
        result.environmentId,
        '/workspace'
      );

      // Step 7: Execute quality gates
      result.stages.quality = await this.qualityGates.executeQualityGates(
        result.environmentId,
        '/workspace'
      );

      // Step 8: Run validation
      result.stages.validation = await this.validationRunner.runValidation(
        result.environmentId,
        '/workspace'
      );

      // Step 9: Perform Claude Code review
      try {
        result.stages.review = await this.claudeIntegration.reviewCode(result.environmentId, {
          prNumber,
          repoUrl,
          branch,
          files: result.stages.clone.metadata?.lfsFiles || [],
          diff: '', // Would need to get actual diff
        });
      } catch (error) {
        // Fallback to Codegen if Claude fails
        result.logs.push('Claude review failed, falling back to Codegen');
        result.stages.review = await this.codegenFallback.handleComplexIssue(result.environmentId, {
          type: 'analyze',
          context: `PR ${prNumber} analysis`,
          files: result.stages.clone.metadata?.lfsFiles || [],
        });
      }

      // Determine overall success
      result.success = this.evaluateOverallSuccess(result);

      this.emit('workflow:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('workflow:failed', result, error);
    } finally {
      // Cleanup
      await this.deploymentMonitor.stopMonitoring();
      if (result.environmentId) {
        await this.deploymentEngine.destroyEnvironment(result.environmentId);
      }
      result.totalTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Setup event forwarding from all components
   */
  private setupEventForwarding(): void {
    const components = [
      this.deploymentEngine,
      this.environmentSetup,
      this.branchCloner,
      this.buildSystem,
      this.testOrchestrator,
      this.qualityGates,
      this.validationRunner,
      this.deploymentMonitor,
      this.claudeIntegration,
      this.codegenFallback,
    ];

    components.forEach(component => {
      component.on('*', (event, data) => {
        this.emit(`component:${event}`, data);
      });
    });
  }

  /**
   * Evaluate overall workflow success
   */
  private evaluateOverallSuccess(result: WorkflowResult): boolean {
    // Check if all critical stages succeeded
    const criticalStages = [
      result.stages.clone?.success,
      result.stages.setup?.success,
      result.stages.build?.success,
      result.stages.test?.success,
      result.stages.quality?.success,
      result.stages.validation?.success,
    ];

    return criticalStages.every(stage => stage === true);
  }

  /**
   * Generate deployment report
   */
  generateReport(result: WorkflowResult): string {
    let report = `# WSL2 Deployment Report\n\n`;
    report += `**PR:** #${result.prNumber}\n`;
    report += `**Repository:** ${result.repoUrl}\n`;
    report += `**Branch:** ${result.branch}\n`;
    report += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    report += `**Duration:** ${Math.round(result.totalTime / 1000)}s\n\n`;

    // Stage results
    report += `## Stage Results\n\n`;
    
    const stages = [
      { name: 'Clone', result: result.stages.clone },
      { name: 'Setup', result: result.stages.setup },
      { name: 'Build', result: result.stages.build },
      { name: 'Test', result: result.stages.test },
      { name: 'Quality', result: result.stages.quality },
      { name: 'Validation', result: result.stages.validation },
      { name: 'Review', result: result.stages.review },
    ];

    stages.forEach(stage => {
      const status = stage.result?.success ? '✅' : '❌';
      report += `- **${stage.name}:** ${status}\n`;
    });

    // Test results
    if (result.stages.test) {
      report += `\n## Test Results\n\n`;
      report += `- **Total Tests:** ${result.stages.test.summary.totalTests}\n`;
      report += `- **Passed:** ${result.stages.test.summary.passedTests}\n`;
      report += `- **Failed:** ${result.stages.test.summary.failedTests}\n`;
      report += `- **Coverage:** ${result.stages.test.coverage.overall.lines.percentage.toFixed(1)}%\n`;
    }

    // Quality results
    if (result.stages.quality) {
      report += `\n## Quality Gates\n\n`;
      report += `- **Passed:** ${result.stages.quality.summary.passedGates}/${result.stages.quality.summary.totalGates}\n`;
    }

    // Errors
    if (result.errors.length > 0) {
      report += `\n## Errors\n\n`;
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }

    return report;
  }
}

export default WSL2DeploymentWorkflow;

