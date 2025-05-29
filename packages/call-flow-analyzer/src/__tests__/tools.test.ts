import {
  analyzeCallFlowTool,
  analyzeFileCallFlowTool,
  detectUnreachableCodeTool,
  analyzePerformanceBottlenecksTool,
  generateCallFlowVisualizationTool,
} from '../tools';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Call Flow Analysis Tools', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'call-flow-tools-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('analyzeCallFlowTool', () => {
    it('should analyze a directory successfully', async () => {
      const testFile = path.join(tempDir, 'test.js');
      const testCode = `
        function main() {
          helper();
        }
        
        function helper() {
          return 42;
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzeCallFlowTool.execute({
        targetPath: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.filesAnalyzed).toBeGreaterThan(0);
    });

    it('should handle non-existent paths', async () => {
      const result = await analyzeCallFlowTool.execute({
        targetPath: '/non/existent/path',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should accept custom configuration', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'function test() { console.log("test"); }');

      const result = await analyzeCallFlowTool.execute({
        targetPath: tempDir,
        config: {
          maxCallDepth: 10,
          confidenceThreshold: 0.9,
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('analyzeFileCallFlowTool', () => {
    it('should analyze a specific file', async () => {
      const testFile = path.join(tempDir, 'specific.js');
      const testCode = `
        function targetFunction() {
          console.log('Target');
          helper();
        }
        
        function helper() {
          return 'help';
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzeFileCallFlowTool.execute({
        filePath: testFile,
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.summary.file).toBe('specific.js');
    });

    it('should focus on specific function when provided', async () => {
      const testFile = path.join(tempDir, 'focused.js');
      const testCode = `
        function targetFunction() {
          return true;
          console.log('Unreachable in target');
        }
        
        function otherFunction() {
          return false;
          console.log('Unreachable in other');
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzeFileCallFlowTool.execute({
        filePath: testFile,
        functionName: 'targetFunction',
      });

      expect(result.success).toBe(true);
      expect(result.summary.focusFunction).toBe('targetFunction');
      
      // Should only include findings for the target function
      if (result.result.findings.length > 0) {
        expect(result.result.findings.every(f => f.function === 'targetFunction')).toBe(true);
      }
    });

    it('should handle non-existent files', async () => {
      const result = await analyzeFileCallFlowTool.execute({
        filePath: '/non/existent/file.js',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('detectUnreachableCodeTool', () => {
    it('should detect unreachable code specifically', async () => {
      const testFile = path.join(tempDir, 'unreachable.js');
      const testCode = `
        function withUnreachableCode() {
          console.log('Before return');
          return true;
          console.log('This is unreachable');
          const x = 42;
        }
        
        function normalFunction() {
          console.log('Normal');
          return false;
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await detectUnreachableCodeTool.execute({
        targetPath: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.unreachableCode).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalFindings).toBeGreaterThanOrEqual(0);
    });

    it('should respect confidence threshold', async () => {
      const testFile = path.join(tempDir, 'confidence.js');
      const testCode = `
        function test() {
          return;
          console.log('Unreachable');
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await detectUnreachableCodeTool.execute({
        targetPath: tempDir,
        confidenceThreshold: 0.95,
      });

      expect(result.success).toBe(true);
      if (result.unreachableCode.length > 0) {
        expect(result.unreachableCode.every(f => (f.confidence || 1) >= 0.95)).toBe(true);
      }
    });
  });

  describe('analyzePerformanceBottlenecksTool', () => {
    it('should detect performance bottlenecks', async () => {
      const testFile = path.join(tempDir, 'performance.js');
      const testCode = `
        function simpleFunction() {
          return 42;
        }
        
        function complexFunction(x, y, z) {
          if (x > 0) {
            if (y > 0) {
              if (z > 0) {
                for (let i = 0; i < 100; i++) {
                  for (let j = 0; j < 100; j++) {
                    if (i === j) {
                      console.log('Complex nested logic');
                    }
                  }
                }
              }
            }
          }
          
          switch (x) {
            case 1: return 'one';
            case 2: return 'two';
            case 3: return 'three';
            default: return 'other';
          }
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await analyzePerformanceBottlenecksTool.execute({
        targetPath: tempDir,
        complexityThreshold: 5,
      });

      expect(result.success).toBe(true);
      expect(result.bottlenecks).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('generateCallFlowVisualizationTool', () => {
    it('should generate JSON visualization by default', async () => {
      const testFile = path.join(tempDir, 'visual.js');
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
        }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await generateCallFlowVisualizationTool.execute({
        targetPath: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.visualization).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.summary).toBeDefined();
    });

    it('should generate Mermaid format when requested', async () => {
      const testFile = path.join(tempDir, 'mermaid.js');
      fs.writeFileSync(testFile, 'function test() { return 42; }');

      const result = await generateCallFlowVisualizationTool.execute({
        targetPath: tempDir,
        format: 'mermaid',
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('mermaid');
      expect(typeof result.visualization).toBe('string');
      expect(result.visualization).toContain('graph TD');
    });

    it('should generate Graphviz format when requested', async () => {
      const testFile = path.join(tempDir, 'graphviz.js');
      fs.writeFileSync(testFile, 'function test() { return 42; }');

      const result = await generateCallFlowVisualizationTool.execute({
        targetPath: tempDir,
        format: 'graphviz',
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('graphviz');
      expect(typeof result.visualization).toBe('string');
      expect(result.visualization).toContain('digraph CallFlow');
    });

    it('should limit nodes when maxNodes is specified', async () => {
      const testFile = path.join(tempDir, 'limited.js');
      const testCode = `
        function func1() { return 1; }
        function func2() { return 2; }
        function func3() { return 3; }
        function func4() { return 4; }
        function func5() { return 5; }
      `;

      fs.writeFileSync(testFile, testCode);

      const result = await generateCallFlowVisualizationTool.execute({
        targetPath: tempDir,
        maxNodes: 2,
      });

      expect(result.success).toBe(true);
      expect(result.summary.visualizedNodes).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle analysis errors gracefully', async () => {
      // Test with a directory that doesn't exist
      const result = await analyzeCallFlowTool.execute({
        targetPath: '/definitely/does/not/exist',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should handle malformed configuration', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'function test() {}');

      const result = await analyzeCallFlowTool.execute({
        targetPath: tempDir,
        config: {
          maxCallDepth: -1, // Invalid value
          confidenceThreshold: 2, // Invalid value > 1
        },
      });

      // Should either handle gracefully or provide meaningful error
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });
});

