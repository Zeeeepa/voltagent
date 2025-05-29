import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { z } from 'zod';

// Quality gate configuration schemas
const QualityGateSchema = z.object({
  name: z.string(),
  type: z.enum(['coverage', 'complexity', 'duplication', 'security', 'performance']),
  threshold: z.number(),
  operator: z.enum(['gte', 'lte', 'eq']).default('gte'),
  required: z.boolean().default(true),
  command: z.string().optional(),
});

const QualityConfigSchema = z.object({
  gates: z.array(QualityGateSchema),
  failFast: z.boolean().default(false),
  timeout: z.number().default(600000), // 10 minutes
});

export type QualityConfig = z.infer<typeof QualityConfigSchema>;
export type QualityGate = z.infer<typeof QualityGateSchema>;

export interface QualityResult {
  success: boolean;
  environmentId: string;
  gateResults: QualityGateResult[];
  summary: QualitySummary;
  logs: string[];
  errors: string[];
  totalTime: number;
}

export interface QualityGateResult {
  name: string;
  type: string;
  success: boolean;
  value: number;
  threshold: number;
  operator: string;
  required: boolean;
  details: any;
}

export interface QualitySummary {
  totalGates: number;
  passedGates: number;
  failedGates: number;
  requiredGatesPassed: boolean;
  overallSuccess: boolean;
}

export class WSL2QualityGates extends EventEmitter {
  private config: QualityConfig;

  constructor(config: QualityConfig) {
    super();
    this.config = QualityConfigSchema.parse(config);
  }

  /**
   * Execute all quality gates
   */
  async executeQualityGates(environmentId: string, projectPath: string): Promise<QualityResult> {
    const startTime = Date.now();
    const result: QualityResult = {
      success: false,
      environmentId,
      gateResults: [],
      summary: {
        totalGates: this.config.gates.length,
        passedGates: 0,
        failedGates: 0,
        requiredGatesPassed: false,
        overallSuccess: false,
      },
      logs: [],
      errors: [],
      totalTime: 0,
    };

    try {
      this.emit('quality:started', { environmentId, gateCount: this.config.gates.length });

      for (const gate of this.config.gates) {
        const gateResult = await this.executeQualityGate(environmentId, projectPath, gate);
        result.gateResults.push(gateResult);

        if (this.config.failFast && !gateResult.success && gate.required) {
          result.errors.push(`Quality gate '${gate.name}' failed and failFast is enabled`);
          break;
        }
      }

      result.summary = this.calculateSummary(result);
      result.success = result.summary.overallSuccess;

      this.emit('quality:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('quality:failed', result, error);
    } finally {
      result.totalTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute a single quality gate
   */
  private async executeQualityGate(
    environmentId: string,
    projectPath: string,
    gate: QualityGate
  ): Promise<QualityGateResult> {
    this.emit('gate:started', { environmentId, gate: gate.name });

    try {
      let value: number;
      let details: any = {};

      switch (gate.type) {
        case 'coverage':
          ({ value, details } = await this.checkCoverage(environmentId, projectPath, gate));
          break;
        case 'complexity':
          ({ value, details } = await this.checkComplexity(environmentId, projectPath, gate));
          break;
        case 'duplication':
          ({ value, details } = await this.checkDuplication(environmentId, projectPath, gate));
          break;
        case 'security':
          ({ value, details } = await this.checkSecurity(environmentId, projectPath, gate));
          break;
        case 'performance':
          ({ value, details } = await this.checkPerformance(environmentId, projectPath, gate));
          break;
        default:
          throw new Error(`Unknown quality gate type: ${gate.type}`);
      }

      const success = this.evaluateThreshold(value, gate.threshold, gate.operator);

      const result: QualityGateResult = {
        name: gate.name,
        type: gate.type,
        success,
        value,
        threshold: gate.threshold,
        operator: gate.operator,
        required: gate.required,
        details,
      };

      this.emit('gate:completed', { environmentId, gate: gate.name, result });
      return result;
    } catch (error) {
      const result: QualityGateResult = {
        name: gate.name,
        type: gate.type,
        success: false,
        value: 0,
        threshold: gate.threshold,
        operator: gate.operator,
        required: gate.required,
        details: { error: error instanceof Error ? error.message : String(error) },
      };

      this.emit('gate:failed', { environmentId, gate: gate.name, error });
      return result;
    }
  }

  /**
   * Check code coverage
   */
  private async checkCoverage(
    environmentId: string,
    projectPath: string,
    gate: QualityGate
  ): Promise<{ value: number; details: any }> {
    const coverageFile = `${projectPath}/coverage/coverage-summary.json`;
    
    try {
      const coverageData = await this.executeWSLCommand(environmentId, `cat ${coverageFile}`);
      const coverage = JSON.parse(coverageData);
      
      const totalCoverage = coverage.total;
      const value = totalCoverage.lines.pct;
      
      return {
        value,
        details: {
          lines: totalCoverage.lines,
          functions: totalCoverage.functions,
          branches: totalCoverage.branches,
          statements: totalCoverage.statements,
        },
      };
    } catch (error) {
      throw new Error(`Coverage check failed: ${error}`);
    }
  }

  /**
   * Check code complexity
   */
  private async checkComplexity(
    environmentId: string,
    projectPath: string,
    gate: QualityGate
  ): Promise<{ value: number; details: any }> {
    const command = gate.command || 'npx complexity-report --format json src/';
    
    try {
      const output = await this.executeWSLCommand(environmentId, `cd ${projectPath} && ${command}`);
      const complexity = JSON.parse(output);
      
      // Calculate average complexity
      const totalComplexity = complexity.reports.reduce((sum: number, report: any) => 
        sum + report.complexity.cyclomatic, 0
      );
      const value = totalComplexity / complexity.reports.length;
      
      return {
        value,
        details: {
          averageComplexity: value,
          totalFiles: complexity.reports.length,
          highComplexityFiles: complexity.reports.filter((r: any) => r.complexity.cyclomatic > 10),
        },
      };
    } catch (error) {
      throw new Error(`Complexity check failed: ${error}`);
    }
  }

  /**
   * Check code duplication
   */
  private async checkDuplication(
    environmentId: string,
    projectPath: string,
    gate: QualityGate
  ): Promise<{ value: number; details: any }> {
    const command = gate.command || 'npx jscpd --format json src/';
    
    try {
      const output = await this.executeWSLCommand(environmentId, `cd ${projectPath} && ${command}`);
      const duplication = JSON.parse(output);
      
      const value = duplication.statistics.total.percentage;
      
      return {
        value,
        details: {
          percentage: value,
          duplicatedLines: duplication.statistics.total.duplicatedLines,
          totalLines: duplication.statistics.total.totalLines,
          clones: duplication.duplicates?.length || 0,
        },
      };
    } catch (error) {
      throw new Error(`Duplication check failed: ${error}`);
    }
  }

  /**
   * Check security vulnerabilities
   */
  private async checkSecurity(
    environmentId: string,
    projectPath: string,
    gate: QualityGate
  ): Promise<{ value: number; details: any }> {
    const command = gate.command || 'npm audit --json';
    
    try {
      const output = await this.executeWSLCommand(environmentId, `cd ${projectPath} && ${command}`);
      const audit = JSON.parse(output);
      
      const vulnerabilities = audit.metadata?.vulnerabilities || {};
      const totalVulns = Object.values(vulnerabilities).reduce((sum: number, count: any) => sum + count, 0);
      
      return {
        value: totalVulns,
        details: {
          total: totalVulns,
          critical: vulnerabilities.critical || 0,
          high: vulnerabilities.high || 0,
          moderate: vulnerabilities.moderate || 0,
          low: vulnerabilities.low || 0,
          advisories: audit.advisories || {},
        },
      };
    } catch (error) {
      throw new Error(`Security check failed: ${error}`);
    }
  }

  /**
   * Check performance metrics
   */
  private async checkPerformance(
    environmentId: string,
    projectPath: string,
    gate: QualityGate
  ): Promise<{ value: number; details: any }> {
    const command = gate.command || 'npm run perf:test';
    
    try {
      const output = await this.executeWSLCommand(environmentId, `cd ${projectPath} && ${command}`);
      
      // Extract performance metrics from output
      const responseTimeMatch = output.match(/response time: (\d+(?:\.\d+)?)ms/i);
      const value = responseTimeMatch ? parseFloat(responseTimeMatch[1]) : 0;
      
      return {
        value,
        details: {
          responseTime: value,
          output: output.substring(0, 1000), // Truncate for storage
        },
      };
    } catch (error) {
      throw new Error(`Performance check failed: ${error}`);
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Calculate quality summary
   */
  private calculateSummary(result: QualityResult): QualitySummary {
    const totalGates = result.gateResults.length;
    const passedGates = result.gateResults.filter(g => g.success).length;
    const failedGates = totalGates - passedGates;
    
    const requiredGates = result.gateResults.filter(g => g.required);
    const requiredGatesPassed = requiredGates.every(g => g.success);
    
    return {
      totalGates,
      passedGates,
      failedGates,
      requiredGatesPassed,
      overallSuccess: requiredGatesPassed,
    };
  }

  /**
   * Execute a command in WSL2
   */
  private async executeWSLCommand(
    environmentId: string,
    command: string,
    timeout: number = 300000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('wsl', ['--', 'bash', '-c', command]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`WSL command failed with code ${code}: ${stderr}`));
        }
      });

      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}

export default WSL2QualityGates;

