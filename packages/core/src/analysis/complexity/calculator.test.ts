import { ComplexityCalculator } from "./calculator";
import type { FunctionInfo } from "./types";

describe("ComplexityCalculator", () => {
  describe("calculateCyclomaticComplexity", () => {
    it("should calculate basic cyclomatic complexity", () => {
      const simpleFunction = `
        function simple() {
          return true;
        }
      `;
      expect(ComplexityCalculator.calculateCyclomaticComplexity(simpleFunction)).toBe(1);
    });

    it("should count if statements", () => {
      const functionWithIf = `
        function withIf(x) {
          if (x > 0) {
            return x;
          }
          return 0;
        }
      `;
      expect(ComplexityCalculator.calculateCyclomaticComplexity(functionWithIf)).toBe(2);
    });

    it("should count multiple decision points", () => {
      const complexFunction = `
        function complex(x, y) {
          if (x > 0) {
            if (y > 0) {
              return x + y;
            } else if (y < 0) {
              return x - y;
            }
          }
          while (x > 0) {
            x--;
          }
          return x || y ? x : y;
        }
      `;
      // if, if, else if, while, ternary (||), ternary (?:) = 6 + 1 = 7
      expect(ComplexityCalculator.calculateCyclomaticComplexity(complexFunction)).toBeGreaterThan(5);
    });
  });

  describe("calculateCognitiveComplexity", () => {
    it("should calculate cognitive complexity with nesting penalty", () => {
      const nestedFunction = `
        function nested(items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].active) {
              if (items[i].type === 'special') {
                return items[i];
              }
            }
          }
          return null;
        }
      `;
      const complexity = ComplexityCalculator.calculateCognitiveComplexity(nestedFunction);
      expect(complexity).toBeGreaterThan(3); // Should account for nesting
    });
  });

  describe("calculateHalsteadMetrics", () => {
    it("should calculate Halstead metrics", () => {
      const functionCode = `
        function add(a, b) {
          return a + b;
        }
      `;
      const metrics = ComplexityCalculator.calculateHalsteadMetrics(functionCode);
      
      expect(metrics.volume).toBeGreaterThan(0);
      expect(metrics.difficulty).toBeGreaterThan(0);
      expect(metrics.effort).toBeGreaterThan(0);
    });
  });

  describe("calculateMaintainabilityIndex", () => {
    it("should calculate maintainability index", () => {
      const mi = ComplexityCalculator.calculateMaintainabilityIndex(50, 5, 20);
      expect(mi).toBeGreaterThan(0);
      expect(mi).toBeLessThanOrEqual(100);
    });

    it("should return higher MI for simpler code", () => {
      const simpleMI = ComplexityCalculator.calculateMaintainabilityIndex(10, 1, 5);
      const complexMI = ComplexityCalculator.calculateMaintainabilityIndex(100, 20, 100);
      
      expect(simpleMI).toBeGreaterThan(complexMI);
    });
  });

  describe("calculateNestingDepth", () => {
    it("should calculate maximum nesting depth", () => {
      const deeplyNested = `
        function deep() {
          if (true) {
            if (true) {
              if (true) {
                return true;
              }
            }
          }
        }
      `;
      expect(ComplexityCalculator.calculateNestingDepth(deeplyNested)).toBe(3);
    });
  });

  describe("calculateAllMetrics", () => {
    it("should calculate all metrics for a function", () => {
      const functionInfo: FunctionInfo = {
        name: "testFunction",
        file: "test.ts",
        lineStart: 1,
        lineEnd: 10,
        parameters: ["a", "b", "c"],
        body: `
          function testFunction(a, b, c) {
            if (a > 0) {
              if (b > 0) {
                return a + b + c;
              }
            }
            return 0;
          }
        `,
        isAsync: false,
        isGenerator: false,
        isMethod: false,
      };

      const metrics = ComplexityCalculator.calculateAllMetrics(functionInfo);

      expect(metrics.cyclomatic_complexity).toBeGreaterThan(0);
      expect(metrics.cognitive_complexity).toBeGreaterThan(0);
      expect(metrics.maintainability_index).toBeGreaterThan(0);
      expect(metrics.lines_of_code).toBeGreaterThan(0);
      expect(metrics.halstead_volume).toBeGreaterThan(0);
      expect(metrics.halstead_difficulty).toBeGreaterThan(0);
      expect(metrics.halstead_effort).toBeGreaterThan(0);
      expect(metrics.nesting_depth).toBeGreaterThan(0);
      expect(metrics.parameter_count).toBe(3);
    });
  });
});

