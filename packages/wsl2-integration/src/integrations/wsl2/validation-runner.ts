import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { z } from 'zod';

// Validation configuration schemas
const TestSuiteConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  timeout: z.number().default(300000), // 5 minutes
  retries: z.number().default(1),
  parallel: z.boolean().default(false),
  required: z.boolean().default(true),
});

const QualityCheckConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  threshold: z.number().optional(),
  required: z.boolean().default(true),
});

const SecurityScanConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  required: z.boolean().default(true),
});

const PerformanceBenchmarkConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  metric: z.string(),
  threshold: z.number(),
  unit: z.string(),
});

const ValidationConfigSchema = z.object({
  testSuites: z.array(TestSuiteConfigSchema).default([]),
  qualityChecks: z.array(QualityCheckConfigSchema).default([]),
  securityScans: z.array(SecurityScanConfigSchema).default([]),
  performanceBenchmarks: z.array(PerformanceBenchmarkConfigSchema).default([]),
  parallelJobs: z.number().default(2),
  timeout: z.number().default(1800000), // 30 minutes
});

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;
export type TestSuiteConfig = z.infer<typeof TestSuiteConfigSchema>;
export type QualityCheckConfig = z.infer<typeof QualityCheckConfigSchema>;
export type SecurityScanConfig = z.infer<typeof SecurityScanConfigSchema>;
export type PerformanceBenchmarkConfig = z.infer<typeof PerformanceBenchmarkConfigSchema>;

export interface ValidationResult {
  success: boolean;
  environmentId: string;
  testResults: TestResult[];
  qualityResults: QualityResult[];
  securityResults: SecurityResult[];
  performanceResults: PerformanceResult[];
  summary: ValidationSummary;
  logs: string[];
  errors: string[];
  totalTime: number;
}

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  coverage?: number;
  retries: number;
}

export interface QualityResult {
  name: string;
  success: boolean;
  score?: number;
  threshold?: number;
  issues: QualityIssue[];
  output: string;
}

export interface QualityIssue {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
}

export interface SecurityResult {
  name: string;
  success: boolean;
  vulnerabilities: SecurityVulnerability[];
  output: string;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  file?: string;
  line?: number;
  cwe?: string;
}

export interface PerformanceResult {
  name: string;
  success: boolean;
  value: number;
  threshold: number;
  unit: string;
  output: string;
}

export interface ValidationSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  qualityScore: number;
  securityIssues: number;
  criticalSecurityIssues: number;
  performanceIssues: number;
  overallSuccess: boolean;
}

export class WSL2ValidationRunner extends EventEmitter {
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    super();
    this.config = ValidationConfigSchema.parse(config);
  }

  /**
   * Run complete validation suite
   */
  async runValidation(environmentId: string, workspaceDir: string): Promise<ValidationResult> {
    const startTime = Date.now();
    const result: ValidationResult = {
      success: false,
      environmentId,
      testResults: [],
      qualityResults: [],
      securityResults: [],
      performanceResults: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        qualityScore: 0,
        securityIssues: 0,
        criticalSecurityIssues: 0,
        performanceIssues: 0,
        overallSuccess: false,
      },
      logs: [],
      errors: [],
      totalTime: 0,
    };

    try {
      this.emit('validation:started', { environmentId, workspaceDir });

      // Run test suites
      if (this.config.testSuites.length > 0) {
        result.testResults = await this.runTestSuites(environmentId, workspaceDir);
      }

      // Run quality checks
      if (this.config.qualityChecks.length > 0) {
        result.qualityResults = await this.runQualityChecks(environmentId, workspaceDir);
      }

      // Run security scans
      if (this.config.securityScans.length > 0) {
        result.securityResults = await this.runSecurityScans(environmentId, workspaceDir);
      }

      // Run performance benchmarks
      if (this.config.performanceBenchmarks.length > 0) {
        result.performanceResults = await this.runPerformanceBenchmarks(environmentId, workspaceDir);
      }

      // Calculate summary
      result.summary = this.calculateSummary(result);
      result.success = result.summary.overallSuccess;

      this.emit('validation:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('validation:failed', result, error);
    } finally {
      result.totalTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Run test suites
   */
  private async runTestSuites(environmentId: string, workspaceDir: string): Promise<TestResult[]> {
    this.emit('validation:tests:started', { environmentId, count: this.config.testSuites.length });

    const results: TestResult[] = [];

    if (this.config.parallelJobs > 1) {
      // Run tests in parallel batches
      const batches = this.chunkArray(this.config.testSuites, this.config.parallelJobs);
      
      for (const batch of batches) {
        const batchPromises = batch.map(testSuite => 
          this.runSingleTestSuite(environmentId, workspaceDir, testSuite)
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    } else {
      // Run tests sequentially
      for (const testSuite of this.config.testSuites) {
        const result = await this.runSingleTestSuite(environmentId, workspaceDir, testSuite);
        results.push(result);
      }
    }

    this.emit('validation:tests:completed', { environmentId, results });
    return results;
  }

  /**
   * Run a single test suite
   */
  private async runSingleTestSuite(
    environmentId: string,
    workspaceDir: string,
    testSuite: TestSuiteConfig
  ): Promise<TestResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: string | undefined;

    while (retries <= testSuite.retries) {
      try {
        this.emit('test:started', { environmentId, test: testSuite.name, attempt: retries + 1 });

        const output = await this.executeCommand(
          environmentId,
          testSuite.command,
          workspaceDir,
          testSuite.timeout
        );

        const coverage = this.extractCoverage(output);

        const result: TestResult = {
          name: testSuite.name,
          success: true,
          duration: Date.now() - startTime,
          output,
          coverage,
          retries,
        };

        this.emit('test:passed', { environmentId, test: testSuite.name, result });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retries++;
        
        if (retries <= testSuite.retries) {
          this.emit('test:retry', { environmentId, test: testSuite.name, attempt: retries + 1, error: lastError });
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }

    const result: TestResult = {
      name: testSuite.name,
      success: false,
      duration: Date.now() - startTime,
      output: '',
      error: lastError,
      retries,
    };

    this.emit('test:failed', { environmentId, test: testSuite.name, result });
    return result;
  }

  /**
   * Run quality checks
   */
  private async runQualityChecks(environmentId: string, workspaceDir: string): Promise<QualityResult[]> {
    this.emit('validation:quality:started', { environmentId, count: this.config.qualityChecks.length });

    const results: QualityResult[] = [];

    for (const qualityCheck of this.config.qualityChecks) {
      try {
        const output = await this.executeCommand(environmentId, qualityCheck.command, workspaceDir);
        const issues = this.parseQualityIssues(output);
        const score = this.calculateQualityScore(issues);

        const result: QualityResult = {
          name: qualityCheck.name,
          success: qualityCheck.threshold ? score >= qualityCheck.threshold : issues.length === 0,
          score,
          threshold: qualityCheck.threshold,
          issues,
          output,
        };

        results.push(result);
        this.emit('quality:completed', { environmentId, check: qualityCheck.name, result });
      } catch (error) {
        const result: QualityResult = {
          name: qualityCheck.name,
          success: false,
          issues: [],
          output: error instanceof Error ? error.message : String(error),
        };
        results.push(result);
        this.emit('quality:failed', { environmentId, check: qualityCheck.name, error });
      }
    }

    this.emit('validation:quality:completed', { environmentId, results });
    return results;
  }

  /**
   * Run security scans
   */
  private async runSecurityScans(environmentId: string, workspaceDir: string): Promise<SecurityResult[]> {
    this.emit('validation:security:started', { environmentId, count: this.config.securityScans.length });

    const results: SecurityResult[] = [];

    for (const securityScan of this.config.securityScans) {
      try {
        const output = await this.executeCommand(environmentId, securityScan.command, workspaceDir);
        const vulnerabilities = this.parseSecurityVulnerabilities(output);
        
        const criticalVulns = vulnerabilities.filter(v => 
          this.getSeverityLevel(v.severity) >= this.getSeverityLevel(securityScan.severity)
        );

        const result: SecurityResult = {
          name: securityScan.name,
          success: criticalVulns.length === 0,
          vulnerabilities,
          output,
        };

        results.push(result);
        this.emit('security:completed', { environmentId, scan: securityScan.name, result });
      } catch (error) {
        const result: SecurityResult = {
          name: securityScan.name,
          success: false,
          vulnerabilities: [],
          output: error instanceof Error ? error.message : String(error),
        };
        results.push(result);
        this.emit('security:failed', { environmentId, scan: securityScan.name, error });
      }
    }

    this.emit('validation:security:completed', { environmentId, results });
    return results;
  }

  /**
   * Run performance benchmarks
   */
  private async runPerformanceBenchmarks(
    environmentId: string,
    workspaceDir: string
  ): Promise<PerformanceResult[]> {
    this.emit('validation:performance:started', { environmentId, count: this.config.performanceBenchmarks.length });

    const results: PerformanceResult[] = [];

    for (const benchmark of this.config.performanceBenchmarks) {
      try {
        const output = await this.executeCommand(environmentId, benchmark.command, workspaceDir);
        const value = this.extractPerformanceMetric(output, benchmark.metric);

        const result: PerformanceResult = {
          name: benchmark.name,
          success: value <= benchmark.threshold,
          value,
          threshold: benchmark.threshold,
          unit: benchmark.unit,
          output,
        };

        results.push(result);
        this.emit('performance:completed', { environmentId, benchmark: benchmark.name, result });
      } catch (error) {
        const result: PerformanceResult = {
          name: benchmark.name,
          success: false,
          value: 0,
          threshold: benchmark.threshold,
          unit: benchmark.unit,
          output: error instanceof Error ? error.message : String(error),
        };
        results.push(result);
        this.emit('performance:failed', { environmentId, benchmark: benchmark.name, error });
      }
    }

    this.emit('validation:performance:completed', { environmentId, results });
    return results;
  }

  /**
   * Execute a command with timeout
   */
  private async executeCommand(
    environmentId: string,
    command: string,
    workingDir: string,
    timeout: number = 300000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const fullCommand = `cd ${workingDir} && ${command}`;
      const process = spawn('wsl', ['--', 'bash', '-c', fullCommand]);
      
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
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Extract test coverage from output
   */
  private extractCoverage(output: string): number | undefined {
    const coverageMatch = output.match(/coverage[:\s]+(\d+(?:\.\d+)?)%/i);
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
  }

  /**
   * Parse quality issues from linter output
   */
  private parseQualityIssues(output: string): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse ESLint-style output
      const eslintMatch = line.match(/^(.+):(\d+):(\d+):\s+(error|warning|info)\s+(.+?)(?:\s+(.+))?$/);
      if (eslintMatch) {
        issues.push({
          file: eslintMatch[1],
          line: parseInt(eslintMatch[2]),
          column: parseInt(eslintMatch[3]),
          severity: eslintMatch[4] as 'error' | 'warning' | 'info',
          message: eslintMatch[5],
          rule: eslintMatch[6],
        });
      }
    }

    return issues;
  }

  /**
   * Calculate quality score based on issues
   */
  private calculateQualityScore(issues: QualityIssue[]): number {
    if (issues.length === 0) return 100;

    const weights = { error: 3, warning: 2, info: 1 };
    const totalWeight = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
    
    // Score decreases based on weighted issues
    return Math.max(0, 100 - totalWeight);
  }

  /**
   * Parse security vulnerabilities from scanner output
   */
  private parseSecurityVulnerabilities(output: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      // Try to parse as JSON (common for security scanners)
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        for (const vuln of parsed) {
          vulnerabilities.push({
            id: vuln.id || vuln.cve || 'unknown',
            severity: vuln.severity || 'medium',
            title: vuln.title || vuln.name || 'Unknown vulnerability',
            description: vuln.description || '',
            file: vuln.file,
            line: vuln.line,
            cwe: vuln.cwe,
          });
        }
      }
    } catch {
      // If not JSON, try to parse text output
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('vulnerability') || line.includes('security')) {
          vulnerabilities.push({
            id: 'text-parsed',
            severity: 'medium',
            title: line.trim(),
            description: line.trim(),
          });
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Extract performance metric from output
   */
  private extractPerformanceMetric(output: string, metric: string): number {
    const regex = new RegExp(`${metric}[:\\s]+([\\d.]+)`, 'i');
    const match = output.match(regex);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Get numeric severity level
   */
  private getSeverityLevel(severity: string): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity as keyof typeof levels] || 2;
  }

  /**
   * Calculate validation summary
   */
  private calculateSummary(result: ValidationResult): ValidationSummary {
    const totalTests = result.testResults.length;
    const passedTests = result.testResults.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;

    const qualityScore = result.qualityResults.length > 0
      ? result.qualityResults.reduce((sum, q) => sum + (q.score || 0), 0) / result.qualityResults.length
      : 100;

    const allVulnerabilities = result.securityResults.flatMap(s => s.vulnerabilities);
    const securityIssues = allVulnerabilities.length;
    const criticalSecurityIssues = allVulnerabilities.filter(v => v.severity === 'critical').length;

    const performanceIssues = result.performanceResults.filter(p => !p.success).length;

    const requiredTestsPassed = result.testResults
      .filter(t => this.config.testSuites.find(ts => ts.name === t.name)?.required)
      .every(t => t.success);

    const requiredQualityPassed = result.qualityResults
      .filter(q => this.config.qualityChecks.find(qc => qc.name === q.name)?.required)
      .every(q => q.success);

    const requiredSecurityPassed = result.securityResults
      .filter(s => this.config.securityScans.find(ss => ss.name === s.name)?.required)
      .every(s => s.success);

    const overallSuccess = requiredTestsPassed && requiredQualityPassed && requiredSecurityPassed;

    return {
      totalTests,
      passedTests,
      failedTests,
      qualityScore,
      securityIssues,
      criticalSecurityIssues,
      performanceIssues,
      overallSuccess,
    };
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export default WSL2ValidationRunner;

