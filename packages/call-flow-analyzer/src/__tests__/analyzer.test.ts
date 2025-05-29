import { CallFlowAnalyzer } from '../analyzer';
import { FindingType, Severity } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CallFlowAnalyzer', () => {
  let tempDir: string;
  let analyzer: CallFlowAnalyzer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'call-flow-test-'));
    analyzer = new CallFlowAnalyzer();
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Basic Analysis', () => {
    it('should analyze a simple JavaScript file', async () => {
      const testFile = path.join(tempDir, 'test.js');
      const testCode = `
        function main() {
          console.log('Hello World');
          helper();
        }

        function helper() {
          return 42;
        }

        main();
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzer.analyze(testFile);

      expect(result.module).toBe('call_flow_mapping');
      expect(result.files_analyzed).toBe(1);
      expect(result.functions_analyzed).toBeGreaterThan(0);
      expect(result.analysis_duration_ms).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should detect unreachable code after return statement', async () => {
      const testFile = path.join(tempDir, 'unreachable.js');
      const testCode = `
        function testFunction() {
          console.log('Before return');
          return true;
          console.log('This is unreachable');
          const x = 42;
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzer.analyze(testFile);

      const unreachableFindings = result.findings.filter(
        f => f.type === FindingType.UNREACHABLE_CODE
      );

      expect(unreachableFindings.length).toBeGreaterThan(0);
      expect(unreachableFindings[0].reason).toBe('early_return');
    });

    it('should detect unreachable code in conditional statements', async () => {
      const testFile = path.join(tempDir, 'conditional.js');
      const testCode = `
        function testConditional() {
          if (true) {
            console.log('Always executed');
          } else {
            console.log('Never executed');
          }

          const alwaysFalse = false;
          if (alwaysFalse) {
            console.log('This is unreachable');
          }
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzer.analyze(testFile);

      const unreachableFindings = result.findings.filter(
        f => f.type === FindingType.UNREACHABLE_CODE
      );

      expect(unreachableFindings.length).toBeGreaterThan(0);
    });

    it('should calculate complexity correctly', async () => {
      const testFile = path.join(tempDir, 'complex.js');
      const testCode = `
        function complexFunction(x, y, z) {
          if (x > 0) {
            if (y > 0) {
              if (z > 0) {
                for (let i = 0; i < 10; i++) {
                  if (i % 2 === 0) {
                    console.log('Even');
                  } else {
                    console.log('Odd');
                  }
                }
              }
            }
          }
          
          switch (x) {
            case 1:
              return 'one';
            case 2:
              return 'two';
            default:
              return 'other';
          }
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzer.analyze(testFile);

      const performanceFindings = result.findings.filter(
        f => f.type === FindingType.PERFORMANCE_BOTTLENECK
      );

      expect(performanceFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should respect exclude patterns', async () => {
      const testFile = path.join(tempDir, 'test.spec.js');
      const testCode = `
        function testFunction() {
          console.log('Test');
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const analyzerWithExcludes = new CallFlowAnalyzer({
        excludePatterns: ['**/*.spec.js'],
        maxCallDepth: 50,
        includeExternalDeps: false,
        enableDynamicTracing: false,
        confidenceThreshold: 0.7,
        generateVisualization: true,
      });

      const result = await analyzerWithExcludes.analyze(tempDir);

      expect(result.files_analyzed).toBe(0);
    });

    it('should respect confidence threshold', async () => {
      const testFile = path.join(tempDir, 'test.js');
      const testCode = `
        function testFunction() {
          return true;
          console.log('Unreachable');
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const highThresholdAnalyzer = new CallFlowAnalyzer({
        confidenceThreshold: 0.99,
        maxCallDepth: 50,
        includeExternalDeps: false,
        excludePatterns: [],
        enableDynamicTracing: false,
        generateVisualization: true,
      });

      const result = await highThresholdAnalyzer.analyze(testFile);

      // With high threshold, some findings might be filtered out
      expect(result.findings.every(f => (f.confidence || 1) >= 0.99)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const result = await analyzer.analyze('/non/existent/path');

      expect(result.files_analyzed).toBe(0);
      expect(result.functions_analyzed).toBe(0);
    });

    it('should handle malformed JavaScript files', async () => {
      const testFile = path.join(tempDir, 'malformed.js');
      const malformedCode = `
        function incomplete() {
          if (true {
            console.log('Missing closing parenthesis');
        }
      `;

      fs.writeFileSync(testFile, malformedCode);

      // Should not throw an error, but should handle gracefully
      const result = await analyzer.analyze(testFile);

      expect(result).toBeDefined();
      expect(result.module).toBe('call_flow_mapping');
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics correctly', async () => {
      const testFile = path.join(tempDir, 'stats.js');
      const testCode = `
        function main() {
          helper1();
          helper2();
        }

        function helper1() {
          return 1;
        }

        function helper2() {
          return 2;
          console.log('Unreachable');
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzer.analyze(testFile);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.coverage_percentage).toBeGreaterThanOrEqual(0);
      expect(result.statistics.coverage_percentage).toBeLessThanOrEqual(100);
      expect(result.statistics.unreachable_lines).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Severity Calculation', () => {
    it('should assign appropriate severity levels', async () => {
      const testFile = path.join(tempDir, 'severity.js');
      const testCode = `
        function lowSeverity() {
          console.log('Normal function');
        }

        function highSeverity() {
          // High complexity function
          if (true) {
            if (true) {
              if (true) {
                for (let i = 0; i < 10; i++) {
                  for (let j = 0; j < 10; j++) {
                    if (i === j) {
                      console.log('Complex logic');
                    }
                  }
                }
              }
            }
          }
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzer.analyze(testFile);

      expect(Object.values(Severity)).toContain(result.severity);
    });
  });
});

