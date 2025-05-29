import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { z } from 'zod';

// Test configuration schemas
const TestSuiteSchema = z.object({
  name: z.string(),
  command: z.string(),
  pattern: z.string().optional(),
  timeout: z.number().default(300000), // 5 minutes
  retries: z.number().default(1),
  parallel: z.boolean().default(false),
  coverage: z.boolean().default(false),
  environment: z.record(z.string()).default({}),
  tags: z.array(z.string()).default([]),
});

const TestConfigSchema = z.object({
  suites: z.array(TestSuiteSchema),
  parallelJobs: z.number().default(4),
  timeout: z.number().default(1800000), // 30 minutes
  coverage: z.object({
    enabled: z.boolean().default(true),
    threshold: z.number().default(80),
    formats: z.array(z.enum(['lcov', 'json', 'html', 'text'])).default(['lcov', 'json']),
    outputDir: z.string().default('coverage'),
  }),
  reporting: z.object({
    formats: z.array(z.enum(['junit', 'json', 'tap', 'spec'])).default(['junit', 'json']),
    outputDir: z.string().default('test-results'),
  }),
});

export type TestConfig = z.infer<typeof TestConfigSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;

export interface TestResult {
  success: boolean;
  environmentId: string;
  totalTime: number;
  suiteResults: TestSuiteResult[];
  coverage: CoverageResult;
  summary: TestSummary;
  logs: string[];
  errors: string[];
}

export interface TestSuiteResult {
  name: string;
  success: boolean;
  duration: number;
  tests: TestCaseResult[];
  coverage?: SuiteCoverageResult;
  output: string;
  error?: string;
  retries: number;
}

export interface TestCaseResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  skipped: boolean;
  file: string;
  line?: number;
}

export interface CoverageResult {
  overall: CoverageMetrics;
  files: FileCoverageResult[];
  threshold: number;
  passed: boolean;
}

export interface CoverageMetrics {
  lines: { covered: number; total: number; percentage: number };
  functions: { covered: number; total: number; percentage: number };
  branches: { covered: number; total: number; percentage: number };
  statements: { covered: number; total: number; percentage: number };
}

export interface FileCoverageResult {
  file: string;
  metrics: CoverageMetrics;
}

export interface SuiteCoverageResult {
  metrics: CoverageMetrics;
  files: string[];
}

export interface TestSummary {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  overallSuccess: boolean;
}

export class WSL2TestOrchestrator extends EventEmitter {
  private config: TestConfig;

  constructor(config: TestConfig) {
    super();
    this.config = TestConfigSchema.parse(config);
  }

  /**
   * Execute all test suites
   */
  async runTests(environmentId: string, projectPath: string): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      success: false,
      environmentId,
      totalTime: 0,
      suiteResults: [],
      coverage: {
        overall: this.createEmptyMetrics(),
        files: [],
        threshold: this.config.coverage.threshold,
        passed: false,
      },
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        overallSuccess: false,
      },
      logs: [],
      errors: [],
    };

    try {
      this.emit('tests:started', { environmentId, projectPath, suiteCount: this.config.suites.length });

      // Prepare test environment
      await this.prepareTestEnvironment(environmentId, projectPath, result);

      // Execute test suites
      result.suiteResults = await this.executeTestSuites(environmentId, projectPath);

      // Collect coverage if enabled
      if (this.config.coverage.enabled) {
        result.coverage = await this.collectCoverage(environmentId, projectPath);
      }

      // Generate test reports
      await this.generateReports(environmentId, projectPath, result);

      // Calculate summary
      result.summary = this.calculateSummary(result);
      result.success = result.summary.overallSuccess && result.coverage.passed;

      this.emit('tests:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('tests:failed', result, error);
    } finally {
      result.totalTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute test suites with parallel support
   */
  private async executeTestSuites(environmentId: string, projectPath: string): Promise<TestSuiteResult[]> {
    this.emit('suites:started', { environmentId, count: this.config.suites.length });

    const results: TestSuiteResult[] = [];

    // Group suites by parallel capability
    const parallelSuites = this.config.suites.filter(suite => suite.parallel);
    const sequentialSuites = this.config.suites.filter(suite => !suite.parallel);

    // Execute parallel suites in batches
    if (parallelSuites.length > 0) {
      const batches = this.chunkArray(parallelSuites, this.config.parallelJobs);
      
      for (const batch of batches) {
        const batchPromises = batch.map(suite => 
          this.executeTestSuite(environmentId, projectPath, suite)
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    }

    // Execute sequential suites one by one
    for (const suite of sequentialSuites) {
      const result = await this.executeTestSuite(environmentId, projectPath, suite);
      results.push(result);
    }

    this.emit('suites:completed', { environmentId, results });
    return results;
  }

  /**
   * Execute a single test suite
   */
  private async executeTestSuite(
    environmentId: string,
    projectPath: string,
    suite: TestSuite
  ): Promise<TestSuiteResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: string | undefined;

    while (retries <= suite.retries) {
      try {
        this.emit('suite:started', { environmentId, suite: suite.name, attempt: retries + 1 });

        const output = await this.executeSuiteCommand(environmentId, projectPath, suite);
        const tests = this.parseTestOutput(output, suite);
        const coverage = suite.coverage ? await this.collectSuiteCoverage(environmentId, projectPath, suite) : undefined;

        const result: TestSuiteResult = {
          name: suite.name,
          success: tests.every(test => test.success || test.skipped),
          duration: Date.now() - startTime,
          tests,
          coverage,
          output,
          retries,
        };

        this.emit('suite:completed', { environmentId, suite: suite.name, result });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retries++;
        
        if (retries <= suite.retries) {
          this.emit('suite:retry', { 
            environmentId, 
            suite: suite.name, 
            attempt: retries + 1, 
            error: lastError 
          });
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        }
      }
    }

    const result: TestSuiteResult = {
      name: suite.name,
      success: false,
      duration: Date.now() - startTime,
      tests: [],
      output: '',
      error: lastError,
      retries,
    };

    this.emit('suite:failed', { environmentId, suite: suite.name, result });
    return result;
  }

  /**
   * Execute suite command with environment setup
   */
  private async executeSuiteCommand(
    environmentId: string,
    projectPath: string,
    suite: TestSuite
  ): Promise<string> {
    // Prepare environment variables
    const envVars = Object.entries(suite.environment)
      .map(([key, value]) => `export ${key}="${value}"`)
      .join(' && ');

    // Add coverage instrumentation if needed
    let command = suite.command;
    if (suite.coverage && this.config.coverage.enabled) {
      command = this.addCoverageInstrumentation(command);
    }

    const fullCommand = envVars 
      ? `${envVars} && cd ${projectPath} && ${command}`
      : `cd ${projectPath} && ${command}`;

    return this.executeWSLCommand(environmentId, fullCommand, suite.timeout);
  }

  /**
   * Parse test output to extract individual test results
   */
  private parseTestOutput(output: string, suite: TestSuite): TestCaseResult[] {
    const tests: TestCaseResult[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse Jest-style output
      const jestMatch = line.match(/^\s*(✓|✗|○)\s+(.+?)\s+\((\d+)ms\)$/);
      if (jestMatch) {
        const [, status, name, duration] = jestMatch;
        tests.push({
          name: name.trim(),
          success: status === '✓',
          duration: parseInt(duration),
          skipped: status === '○',
          file: suite.name, // Default to suite name
        });
        continue;
      }

      // Parse Mocha-style output
      const mochaMatch = line.match(/^\s*(✓|✗|\-)\s+(.+?)(?:\s+\((\d+)ms\))?$/);
      if (mochaMatch) {
        const [, status, name, duration] = mochaMatch;
        tests.push({
          name: name.trim(),
          success: status === '✓',
          duration: duration ? parseInt(duration) : 0,
          skipped: status === '-',
          file: suite.name,
        });
        continue;
      }

      // Parse TAP output
      const tapMatch = line.match(/^(ok|not ok)\s+\d+\s+(.+)$/);
      if (tapMatch) {
        const [, status, name] = tapMatch;
        tests.push({
          name: name.trim(),
          success: status === 'ok',
          duration: 0,
          skipped: false,
          file: suite.name,
        });
      }
    }

    return tests;
  }

  /**
   * Prepare test environment
   */
  private async prepareTestEnvironment(
    environmentId: string,
    projectPath: string,
    result: TestResult
  ): Promise<void> {
    try {
      // Create test output directories
      const commands = [
        `mkdir -p ${projectPath}/${this.config.reporting.outputDir}`,
        `mkdir -p ${projectPath}/${this.config.coverage.outputDir}`,
      ];

      for (const command of commands) {
        await this.executeWSLCommand(environmentId, command);
      }

      result.logs.push('Test environment prepared');
    } catch (error) {
      result.errors.push(`Test environment preparation failed: ${error}`);
    }
  }

  /**
   * Add coverage instrumentation to command
   */
  private addCoverageInstrumentation(command: string): string {
    // Add nyc (Istanbul) coverage for Node.js projects
    if (command.includes('jest')) {
      return command.replace('jest', 'jest --coverage');
    }
    
    if (command.includes('mocha')) {
      return `nyc ${command}`;
    }

    // Default coverage wrapper
    return `nyc ${command}`;
  }

  /**
   * Collect coverage for a specific suite
   */
  private async collectSuiteCoverage(
    environmentId: string,
    projectPath: string,
    suite: TestSuite
  ): Promise<SuiteCoverageResult> {
    try {
      const coverageFile = `${projectPath}/${this.config.coverage.outputDir}/coverage-${suite.name}.json`;
      const coverageExists = await this.executeWSLCommand(
        environmentId,
        `test -f ${coverageFile} && echo "exists" || echo "not found"`
      );

      if (coverageExists.includes('exists')) {
        const coverageData = await this.executeWSLCommand(environmentId, `cat ${coverageFile}`);
        const parsed = JSON.parse(coverageData);
        return this.parseCoverageData(parsed);
      }
    } catch (error) {
      // Coverage collection failed, return empty result
    }

    return {
      metrics: this.createEmptyMetrics(),
      files: [],
    };
  }

  /**
   * Collect overall coverage
   */
  private async collectCoverage(environmentId: string, projectPath: string): Promise<CoverageResult> {
    try {
      const coverageFile = `${projectPath}/${this.config.coverage.outputDir}/coverage-final.json`;
      const coverageExists = await this.executeWSLCommand(
        environmentId,
        `test -f ${coverageFile} && echo "exists" || echo "not found"`
      );

      if (coverageExists.includes('exists')) {
        const coverageData = await this.executeWSLCommand(environmentId, `cat ${coverageFile}`);
        const parsed = JSON.parse(coverageData);
        
        const overall = this.calculateOverallCoverage(parsed);
        const files = this.parseCoverageFiles(parsed);
        
        return {
          overall,
          files,
          threshold: this.config.coverage.threshold,
          passed: overall.lines.percentage >= this.config.coverage.threshold,
        };
      }
    } catch (error) {
      // Coverage collection failed
    }

    return {
      overall: this.createEmptyMetrics(),
      files: [],
      threshold: this.config.coverage.threshold,
      passed: false,
    };
  }

  /**
   * Generate test reports
   */
  private async generateReports(
    environmentId: string,
    projectPath: string,
    result: TestResult
  ): Promise<void> {
    try {
      for (const format of this.config.reporting.formats) {
        await this.generateReport(environmentId, projectPath, format, result);
      }
    } catch (error) {
      result.errors.push(`Report generation failed: ${error}`);
    }
  }

  /**
   * Generate a specific report format
   */
  private async generateReport(
    environmentId: string,
    projectPath: string,
    format: string,
    result: TestResult
  ): Promise<void> {
    const outputFile = `${projectPath}/${this.config.reporting.outputDir}/test-results.${format}`;
    
    switch (format) {
      case 'junit':
        await this.generateJUnitReport(environmentId, outputFile, result);
        break;
      case 'json':
        await this.generateJSONReport(environmentId, outputFile, result);
        break;
      case 'tap':
        await this.generateTAPReport(environmentId, outputFile, result);
        break;
      case 'spec':
        await this.generateSpecReport(environmentId, outputFile, result);
        break;
    }
  }

  /**
   * Generate JUnit XML report
   */
  private async generateJUnitReport(environmentId: string, outputFile: string, result: TestResult): Promise<void> {
    const xml = this.createJUnitXML(result);
    await this.executeWSLCommand(environmentId, `echo '${xml}' > ${outputFile}`);
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(environmentId: string, outputFile: string, result: TestResult): Promise<void> {
    const json = JSON.stringify(result, null, 2);
    await this.executeWSLCommand(environmentId, `echo '${json}' > ${outputFile}`);
  }

  /**
   * Generate TAP report
   */
  private async generateTAPReport(environmentId: string, outputFile: string, result: TestResult): Promise<void> {
    const tap = this.createTAPOutput(result);
    await this.executeWSLCommand(environmentId, `echo '${tap}' > ${outputFile}`);
  }

  /**
   * Generate spec report
   */
  private async generateSpecReport(environmentId: string, outputFile: string, result: TestResult): Promise<void> {
    const spec = this.createSpecOutput(result);
    await this.executeWSLCommand(environmentId, `echo '${spec}' > ${outputFile}`);
  }

  /**
   * Create JUnit XML format
   */
  private createJUnitXML(result: TestResult): string {
    const testsuites = result.suiteResults.map(suite => {
      const testcases = suite.tests.map(test => {
        let testcase = `<testcase name="${test.name}" classname="${suite.name}" time="${test.duration / 1000}"`;
        
        if (test.skipped) {
          testcase += '><skipped/></testcase>';
        } else if (!test.success) {
          testcase += `><failure message="${test.error || 'Test failed'}">${test.error || ''}</failure></testcase>`;
        } else {
          testcase += '/>';
        }
        
        return testcase;
      }).join('\n');

      return `<testsuite name="${suite.name}" tests="${suite.tests.length}" failures="${suite.tests.filter(t => !t.success && !t.skipped).length}" skipped="${suite.tests.filter(t => t.skipped).length}" time="${suite.duration / 1000}">
${testcases}
</testsuite>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
${testsuites}
</testsuites>`;
  }

  /**
   * Create TAP output format
   */
  private createTAPOutput(result: TestResult): string {
    let output = `1..${result.summary.totalTests}\n`;
    let testNumber = 1;

    for (const suite of result.suiteResults) {
      for (const test of suite.tests) {
        const status = test.success ? 'ok' : 'not ok';
        const skip = test.skipped ? ' # SKIP' : '';
        output += `${status} ${testNumber} ${test.name}${skip}\n`;
        testNumber++;
      }
    }

    return output;
  }

  /**
   * Create spec output format
   */
  private createSpecOutput(result: TestResult): string {
    let output = '';

    for (const suite of result.suiteResults) {
      output += `\n${suite.name}\n`;
      
      for (const test of suite.tests) {
        const symbol = test.success ? '✓' : test.skipped ? '-' : '✗';
        const color = test.success ? '\x1b[32m' : test.skipped ? '\x1b[33m' : '\x1b[31m';
        output += `  ${color}${symbol}\x1b[0m ${test.name} (${test.duration}ms)\n`;
      }
    }

    output += `\n${result.summary.passedTests} passing (${result.totalTime}ms)\n`;
    if (result.summary.failedTests > 0) {
      output += `${result.summary.failedTests} failing\n`;
    }
    if (result.summary.skippedTests > 0) {
      output += `${result.summary.skippedTests} pending\n`;
    }

    return output;
  }

  /**
   * Calculate test summary
   */
  private calculateSummary(result: TestResult): TestSummary {
    const totalSuites = result.suiteResults.length;
    const passedSuites = result.suiteResults.filter(s => s.success).length;
    const failedSuites = totalSuites - passedSuites;

    const allTests = result.suiteResults.flatMap(s => s.tests);
    const totalTests = allTests.length;
    const passedTests = allTests.filter(t => t.success).length;
    const failedTests = allTests.filter(t => !t.success && !t.skipped).length;
    const skippedTests = allTests.filter(t => t.skipped).length;

    return {
      totalSuites,
      passedSuites,
      failedSuites,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      overallSuccess: failedSuites === 0 && failedTests === 0,
    };
  }

  /**
   * Parse coverage data from Istanbul/nyc format
   */
  private parseCoverageData(coverageData: any): SuiteCoverageResult {
    const files = Object.keys(coverageData);
    const metrics = this.calculateOverallCoverage(coverageData);

    return { metrics, files };
  }

  /**
   * Calculate overall coverage metrics
   */
  private calculateOverallCoverage(coverageData: any): CoverageMetrics {
    let totalLines = 0, coveredLines = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalStatements = 0, coveredStatements = 0;

    for (const file of Object.values(coverageData) as any[]) {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter((count: any) => count > 0).length;
      }
      
      if (file.f) {
        totalFunctions += Object.keys(file.f).length;
        coveredFunctions += Object.values(file.f).filter((count: any) => count > 0).length;
      }
      
      if (file.b) {
        for (const branch of Object.values(file.b) as any[]) {
          totalBranches += branch.length;
          coveredBranches += branch.filter((count: any) => count > 0).length;
        }
      }
    }

    return {
      lines: {
        covered: coveredStatements,
        total: totalStatements,
        percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
      },
      functions: {
        covered: coveredFunctions,
        total: totalFunctions,
        percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      },
      branches: {
        covered: coveredBranches,
        total: totalBranches,
        percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      },
      statements: {
        covered: coveredStatements,
        total: totalStatements,
        percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
      },
    };
  }

  /**
   * Parse coverage files
   */
  private parseCoverageFiles(coverageData: any): FileCoverageResult[] {
    return Object.entries(coverageData).map(([file, data]: [string, any]) => ({
      file,
      metrics: this.calculateOverallCoverage({ [file]: data }),
    }));
  }

  /**
   * Create empty coverage metrics
   */
  private createEmptyMetrics(): CoverageMetrics {
    return {
      lines: { covered: 0, total: 0, percentage: 0 },
      functions: { covered: 0, total: 0, percentage: 0 },
      branches: { covered: 0, total: 0, percentage: 0 },
      statements: { covered: 0, total: 0, percentage: 0 },
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
}

export default WSL2TestOrchestrator;

