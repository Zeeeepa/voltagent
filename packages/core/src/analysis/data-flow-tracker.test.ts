import { DataFlowTracker } from "./data-flow-tracker";
import { DataFlowIssueType, AnalysisSeverity } from "./types";

describe("DataFlowTracker", () => {
  let tracker: DataFlowTracker;

  beforeEach(() => {
    tracker = new DataFlowTracker();
  });

  describe("Uninitialized Variable Detection", () => {
    it("should detect uninitialized variable usage", async () => {
      const code = `
        function test() {
          let x;
          console.log(x); // Should be flagged
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe(DataFlowIssueType.UNINITIALIZED_VARIABLE);
      expect(result.findings[0].severity).toBe(AnalysisSeverity.HIGH);
      expect(result.findings[0].variable).toBe("x");
    });

    it("should not flag initialized variables", async () => {
      const code = `
        function test() {
          let x = 5;
          console.log(x); // Should not be flagged
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      const uninitializedFindings = result.findings.filter(
        f => f.type === DataFlowIssueType.UNINITIALIZED_VARIABLE
      );
      expect(uninitializedFindings).toHaveLength(0);
    });

    it("should handle function parameters correctly", async () => {
      const code = `
        function test(param) {
          console.log(param); // Should not be flagged (parameters are initialized)
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      const uninitializedFindings = result.findings.filter(
        f => f.type === DataFlowIssueType.UNINITIALIZED_VARIABLE
      );
      expect(uninitializedFindings).toHaveLength(0);
    });
  });

  describe("Unused Variable Detection", () => {
    it("should detect unused variables", async () => {
      const code = `
        function test() {
          let unusedVar = 5; // Should be flagged
          let usedVar = 10;
          console.log(usedVar);
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      const unusedFindings = result.findings.filter(
        f => f.type === DataFlowIssueType.UNUSED_VARIABLE
      );
      expect(unusedFindings).toHaveLength(1);
      expect(unusedFindings[0].variable).toBe("unusedVar");
      expect(unusedFindings[0].severity).toBe(AnalysisSeverity.MEDIUM);
    });

    it("should not flag variables prefixed with underscore", async () => {
      const code = `
        function test() {
          let _unusedVar = 5; // Should not be flagged
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      const unusedFindings = result.findings.filter(
        f => f.type === DataFlowIssueType.UNUSED_VARIABLE && f.variable === "_unusedVar"
      );
      expect(unusedFindings).toHaveLength(0);
    });
  });

  describe("Memory Leak Detection", () => {
    it("should detect potential memory leaks from setInterval", async () => {
      const code = `
        function test() {
          setInterval(() => {
            console.log("tick");
          }, 1000); // Should be flagged
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      const memoryLeakFindings = result.findings.filter(
        f => f.type === DataFlowIssueType.MEMORY_LEAK
      );
      expect(memoryLeakFindings).toHaveLength(1);
      expect(memoryLeakFindings[0].message).toContain("setInterval");
    });

    it("should detect potential memory leaks from addEventListener", async () => {
      const code = `
        function test() {
          document.addEventListener("click", handler); // Should be flagged
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      const memoryLeakFindings = result.findings.filter(
        f => f.type === DataFlowIssueType.MEMORY_LEAK
      );
      expect(memoryLeakFindings).toHaveLength(1);
      expect(memoryLeakFindings[0].message).toContain("addEventListener");
    });
  });

  describe("Configuration", () => {
    it("should respect configuration settings", async () => {
      const tracker = new DataFlowTracker({
        enableUnusedVariableDetection: false
      });

      const code = `
        function test() {
          let unusedVar = 5; // Should not be flagged due to config
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      const unusedFindings = result.findings.filter(
        f => f.type === DataFlowIssueType.UNUSED_VARIABLE
      );
      expect(unusedFindings).toHaveLength(0);
    });

    it("should respect confidence threshold", async () => {
      const tracker = new DataFlowTracker({
        confidenceThreshold: 0.95
      });

      const code = `
        function test() {
          let x;
          console.log(x);
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      // Should still detect high-confidence issues
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe("File Filtering", () => {
    it("should analyze TypeScript files", async () => {
      const code = `
        function test() {
          let x;
          console.log(x);
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      expect(result.filesAnalyzed).toBe(1);
    });

    it("should analyze JavaScript files", async () => {
      const code = `
        function test() {
          let x;
          console.log(x);
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.js", content: code }]
      });

      expect(result.filesAnalyzed).toBe(1);
    });

    it("should skip non-matching files", async () => {
      const code = `
        function test() {
          let x;
          console.log(x);
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.txt", content: code }]
      });

      expect(result.filesAnalyzed).toBe(0);
    });
  });

  describe("Analysis Results", () => {
    it("should provide correct metadata", async () => {
      const code = `
        function test() {
          let x = 5;
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      expect(result.module).toBe("data_flow_tracking");
      expect(result.metadata.analysisVersion).toBe("1.0.0");
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.analysisTime).toBeGreaterThan(0);
    });

    it("should provide correct summary", async () => {
      const code = `
        function test() {
          let unused = 5;
          let x;
          console.log(x);
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      expect(result.summary.totalIssues).toBe(result.findings.length);
      expect(result.summary.totalIssues).toBeGreaterThan(0);
    });

    it("should calculate overall severity correctly", async () => {
      const code = `
        function test() {
          let x;
          console.log(x); // High severity issue
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      expect(result.severity).toBe(AnalysisSeverity.HIGH);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle nested scopes", async () => {
      const code = `
        function outer() {
          let outerVar = 5;
          
          function inner() {
            let innerVar = 10;
            console.log(outerVar); // Should be accessible
            console.log(innerVar); // Should be accessible
          }
          
          inner();
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      // Should not have scope violations for this valid code
      const scopeViolations = result.findings.filter(
        f => f.type === DataFlowIssueType.SCOPE_VIOLATION
      );
      expect(scopeViolations).toHaveLength(0);
    });

    it("should handle class methods", async () => {
      const code = `
        class TestClass {
          private field: number;
          
          constructor() {
            this.field = 5;
          }
          
          method() {
            console.log(this.field);
          }
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      // Should analyze class structure without errors
      expect(result.filesAnalyzed).toBe(1);
    });

    it("should handle async/await patterns", async () => {
      const code = `
        async function test() {
          let result = await fetch("/api");
          console.log(result);
        }
      `;

      const result = await tracker.analyze({
        files: [{ path: "test.ts", content: code }]
      });

      // Should handle async patterns
      expect(result.filesAnalyzed).toBe(1);
    });
  });
});

