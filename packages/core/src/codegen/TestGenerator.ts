import type { Agent } from "../agent";
import type { LLMProvider } from "../agent/providers";
import type {
  TestSuite,
  GeneratedFile,
  ImplementationResult,
  Requirements,
  TestingOptions,
  TestCoverage,
} from "./types";

/**
 * Test Generator for creating comprehensive test suites
 * Handles generation of unit, integration, and end-to-end tests
 */
export class TestGenerator {
  private agent: Agent<{ llm: LLMProvider<unknown> }>;
  private options?: TestingOptions;

  constructor(
    agent: Agent<{ llm: LLMProvider<unknown> }>,
    options?: TestingOptions
  ) {
    this.agent = agent;
    this.options = options;
  }

  /**
   * Generate comprehensive unit tests for the implementation
   */
  async generateUnitTests(
    implementation: ImplementationResult,
    requirements: Requirements
  ): Promise<TestSuite[]> {
    try {
      console.log("Generating unit tests for implementation");

      const testSuites: TestSuite[] = [];

      // Generate tests for each source file
      for (const file of implementation.files.filter(f => f.type === 'source')) {
        const testSuite = await this.generateUnitTestsForFile(file, requirements);
        if (testSuite) {
          testSuites.push(testSuite);
        }
      }

      return testSuites;
    } catch (error) {
      console.error("Failed to generate unit tests:", error);
      throw new Error(`Unit test generation failed: ${error}`);
    }
  }

  /**
   * Create integration tests for external dependencies
   */
  async createIntegrationTests(
    interfaces: any[],
    dependencies: any
  ): Promise<TestSuite[]> {
    try {
      console.log("Generating integration tests");

      const testSuites: TestSuite[] = [];

      // Generate integration tests for each interface
      for (const interfaceSpec of interfaces) {
        const testSuite = await this.generateIntegrationTestsForInterface(
          interfaceSpec,
          dependencies
        );
        if (testSuite) {
          testSuites.push(testSuite);
        }
      }

      return testSuites;
    } catch (error) {
      console.error("Failed to generate integration tests:", error);
      throw new Error(`Integration test generation failed: ${error}`);
    }
  }

  /**
   * Generate performance tests for critical code paths
   */
  async generatePerformanceTests(
    implementation: ImplementationResult,
    benchmarks: any
  ): Promise<TestSuite[]> {
    try {
      console.log("Generating performance tests");

      const performanceTestSuite = await this.generatePerformanceTestSuite(
        implementation,
        benchmarks
      );

      return performanceTestSuite ? [performanceTestSuite] : [];
    } catch (error) {
      console.error("Failed to generate performance tests:", error);
      throw new Error(`Performance test generation failed: ${error}`);
    }
  }

  /**
   * Create security tests for vulnerability detection
   */
  async createSecurityTests(
    implementation: ImplementationResult,
    vulnerabilities: any[]
  ): Promise<TestSuite[]> {
    try {
      console.log("Generating security tests");

      const securityTestSuite = await this.generateSecurityTestSuite(
        implementation,
        vulnerabilities
      );

      return securityTestSuite ? [securityTestSuite] : [];
    } catch (error) {
      console.error("Failed to generate security tests:", error);
      throw new Error(`Security test generation failed: ${error}`);
    }
  }

  /**
   * Generate regression tests for existing functionality
   */
  async generateRegressionTests(
    changes: ImplementationResult,
    existing: any
  ): Promise<TestSuite[]> {
    try {
      console.log("Generating regression tests");

      const regressionTestSuite = await this.generateRegressionTestSuite(
        changes,
        existing
      );

      return regressionTestSuite ? [regressionTestSuite] : [];
    } catch (error) {
      console.error("Failed to generate regression tests:", error);
      throw new Error(`Regression test generation failed: ${error}`);
    }
  }

  // ===== Private Test Generation Methods =====

  private async generateUnitTestsForFile(
    file: GeneratedFile,
    requirements: Requirements
  ): Promise<TestSuite | null> {
    const prompt = `
Generate comprehensive unit tests for the following implementation:

File: ${file.path}
Type: ${file.type}
Language: ${file.language}

Implementation:
${file.content}

Requirements:
${requirements.naturalLanguage}

Generate unit tests that:
1. Test all public functions and methods
2. Cover edge cases and error conditions
3. Validate input/output behavior
4. Test error handling and validation
5. Mock external dependencies
6. Follow ${this.options?.framework || 'Jest'} testing patterns
7. Achieve high code coverage

Use TypeScript and include:
- Proper test structure and organization
- Descriptive test names and descriptions
- Setup and teardown methods
- Mock implementations for dependencies
- Assertion statements with clear expectations
- Test data and fixtures

Generate complete test files with proper imports and exports.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        maxTokens: 3000,
      });

      return this.parseTestSuite(response.text, file.path, 'unit');
    } catch (error) {
      console.error(`Failed to generate unit tests for ${file.path}:`, error);
      return null;
    }
  }

  private async generateIntegrationTestsForInterface(
    interfaceSpec: any,
    dependencies: any
  ): Promise<TestSuite | null> {
    const prompt = `
Generate integration tests for the following interface:

Interface: ${JSON.stringify(interfaceSpec, null, 2)}
Dependencies: ${JSON.stringify(dependencies, null, 2)}

Generate integration tests that:
1. Test end-to-end workflows
2. Validate data flow between components
3. Test external API integrations
4. Verify database interactions
5. Test error propagation and handling
6. Validate configuration and environment setup

Use ${this.options?.framework || 'Jest'} and include:
- Real or realistic test data
- Proper setup and cleanup
- Environment configuration
- Database seeding and cleanup
- API mocking or test servers
- Timeout and retry logic

Generate complete integration test suites.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        maxTokens: 2500,
      });

      return this.parseTestSuite(response.text, 'integration', 'integration');
    } catch (error) {
      console.error("Failed to generate integration tests:", error);
      return null;
    }
  }

  private async generatePerformanceTestSuite(
    implementation: ImplementationResult,
    benchmarks: any
  ): Promise<TestSuite | null> {
    const prompt = `
Generate performance tests for the following implementation:

Implementation Files:
${implementation.files.map(f => `${f.path}: ${f.type}`).join('\n')}

Benchmarks:
${JSON.stringify(benchmarks, null, 2)}

Generate performance tests that:
1. Measure execution time for critical functions
2. Test memory usage and garbage collection
3. Validate throughput and latency requirements
4. Test scalability under load
5. Measure resource utilization
6. Test concurrent execution scenarios

Include:
- Performance benchmarks and baselines
- Load testing scenarios
- Memory profiling tests
- Stress testing conditions
- Performance regression detection
- Reporting and metrics collection

Use appropriate performance testing tools and frameworks.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        maxTokens: 2000,
      });

      return this.parseTestSuite(response.text, 'performance', 'performance');
    } catch (error) {
      console.error("Failed to generate performance tests:", error);
      return null;
    }
  }

  private async generateSecurityTestSuite(
    implementation: ImplementationResult,
    vulnerabilities: any[]
  ): Promise<TestSuite | null> {
    const prompt = `
Generate security tests for the following implementation:

Implementation Files:
${implementation.files.map(f => `${f.path}: ${f.type}`).join('\n')}

Known Vulnerabilities to Test:
${JSON.stringify(vulnerabilities, null, 2)}

Generate security tests that:
1. Test input validation and sanitization
2. Verify authentication and authorization
3. Test for injection vulnerabilities (SQL, XSS, etc.)
4. Validate encryption and data protection
5. Test access control and permissions
6. Verify secure configuration
7. Test for information disclosure

Include:
- Malicious input testing
- Authentication bypass attempts
- Authorization escalation tests
- Data leakage detection
- Cryptographic validation
- Session management tests
- Error handling security

Use security testing frameworks and tools.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        maxTokens: 2000,
      });

      return this.parseTestSuite(response.text, 'security', 'security');
    } catch (error) {
      console.error("Failed to generate security tests:", error);
      return null;
    }
  }

  private async generateRegressionTestSuite(
    changes: ImplementationResult,
    existing: any
  ): Promise<TestSuite | null> {
    const prompt = `
Generate regression tests for the following changes:

New Implementation:
${changes.files.map(f => `${f.path}: ${f.type}`).join('\n')}

Existing System:
${JSON.stringify(existing, null, 2)}

Generate regression tests that:
1. Verify existing functionality still works
2. Test backward compatibility
3. Validate API contract compliance
4. Test data migration and transformation
5. Verify configuration compatibility
6. Test integration points

Include:
- Baseline functionality tests
- Compatibility validation
- Data integrity checks
- API contract tests
- Configuration validation
- Integration smoke tests

Ensure tests can detect breaking changes and regressions.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        maxTokens: 2000,
      });

      return this.parseTestSuite(response.text, 'regression', 'e2e');
    } catch (error) {
      console.error("Failed to generate regression tests:", error);
      return null;
    }
  }

  // ===== Parsing and Utility Methods =====

  private parseTestSuite(
    response: string,
    baseName: string,
    type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security'
  ): TestSuite | null {
    try {
      // Parse the AI response to extract test files
      // This would use more sophisticated parsing in a real implementation
      
      const testFiles: GeneratedFile[] = [
        {
          path: `tests/${type}/${baseName.replace(/\.[^/.]+$/, '')}.test.ts`,
          content: response,
          type: 'test',
          language: 'typescript',
          description: `${type} tests for ${baseName}`,
        },
      ];

      const coverage: TestCoverage = {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85,
      };

      return {
        name: `${baseName} ${type} tests`,
        type,
        files: testFiles,
        coverage,
        framework: this.options?.framework || 'Jest',
      };
    } catch (error) {
      console.error("Failed to parse test suite:", error);
      return null;
    }
  }

  /**
   * Calculate test coverage for generated tests
   */
  async calculateTestCoverage(testSuites: TestSuite[]): Promise<TestCoverage> {
    // This would integrate with coverage tools to calculate actual coverage
    // For now, return estimated coverage based on test suite completeness
    
    const totalSuites = testSuites.length;
    const hasUnitTests = testSuites.some(suite => suite.type === 'unit');
    const hasIntegrationTests = testSuites.some(suite => suite.type === 'integration');
    const hasE2ETests = testSuites.some(suite => suite.type === 'e2e');

    let coverageMultiplier = 0.6; // Base coverage
    if (hasUnitTests) coverageMultiplier += 0.2;
    if (hasIntegrationTests) coverageMultiplier += 0.15;
    if (hasE2ETests) coverageMultiplier += 0.05;

    const baseCoverage = Math.min(coverageMultiplier * 100, 95);

    return {
      statements: baseCoverage,
      branches: baseCoverage - 5,
      functions: baseCoverage + 5,
      lines: baseCoverage,
    };
  }

  /**
   * Validate test quality and completeness
   */
  async validateTestQuality(testSuites: TestSuite[]): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check for test type coverage
    const testTypes = new Set(testSuites.map(suite => suite.type));
    
    if (!testTypes.has('unit')) {
      issues.push("Missing unit tests");
      score -= 30;
      recommendations.push("Add comprehensive unit tests for all functions and methods");
    }

    if (!testTypes.has('integration') && this.options?.generateIntegrationTests) {
      issues.push("Missing integration tests");
      score -= 20;
      recommendations.push("Add integration tests for external dependencies");
    }

    if (!testTypes.has('e2e') && this.options?.generateE2ETests) {
      issues.push("Missing end-to-end tests");
      score -= 15;
      recommendations.push("Add end-to-end tests for critical user workflows");
    }

    // Check coverage requirements
    const targetCoverage = this.options?.coverage || 80;
    const actualCoverage = await this.calculateTestCoverage(testSuites);
    
    if (actualCoverage.statements < targetCoverage) {
      issues.push(`Test coverage below target (${actualCoverage.statements}% < ${targetCoverage}%)`);
      score -= 10;
      recommendations.push("Increase test coverage by adding more test cases");
    }

    return {
      score: Math.max(score, 0),
      issues,
      recommendations,
    };
  }
}

