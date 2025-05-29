import { ParameterValidationEngine } from "./engine";
import { 
  ValidationConfig, 
  SupportedLanguage, 
  ValidationSeverity,
  ValidationIssueType 
} from "./types";

describe("ParameterValidationEngine", () => {
  let engine: ParameterValidationEngine;
  let config: ValidationConfig;

  beforeEach(() => {
    config = {
      language: SupportedLanguage.TYPESCRIPT,
      strictMode: true,
      checkOptionalParameters: true,
      validateApiSchemas: true,
      includeTypeCoercion: true,
      minimumConfidence: 0.7,
      excludePatterns: [],
      includePatterns: ["**/*.ts"],
      customRules: []
    };
    engine = new ParameterValidationEngine(config);
  });

  describe("TypeScript Analysis", () => {
    it("should detect missing type annotations", async () => {
      const sourceCode = `
        function processUser(name, age) {
          return { name, age };
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.ts");
      
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0].issue).toBe(ValidationIssueType.INVALID_TYPE_ANNOTATION);
      expect(result.findings[0].parameter).toBe("name");
      expect(result.findings[1].parameter).toBe("age");
    });

    it("should detect missing validation for optional parameters", async () => {
      const sourceCode = `
        function processUser(name: string, email?: string) {
          return email.toLowerCase(); // Using optional parameter without validation
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.ts");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.MISSING_NULL_CHECK && 
        f.parameter === "email"
      )).toBe(true);
    });

    it("should detect type mismatches in default values", async () => {
      const sourceCode = `
        function processUser(name: string, age: number = "25") {
          return { name, age };
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.ts");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.INCORRECT_DEFAULT &&
        f.parameter === "age"
      )).toBe(true);
    });

    it("should handle complex generic types", async () => {
      const sourceCode = `
        function processData<T>(items: Array<T>, callback: (item: T) => boolean) {
          return items.filter(callback);
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.ts");
      
      expect(result.totalFunctions).toBe(1);
      expect(result.totalParameters).toBe(2);
      // Should not flag well-typed generic functions
      expect(result.findings.filter(f => f.severity === ValidationSeverity.HIGH)).toHaveLength(0);
    });

    it("should detect missing validation in arrow functions", async () => {
      const sourceCode = `
        const processUser = (user?: User) => {
          return user.name; // Missing null check
        };
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.ts");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.MISSING_NULL_CHECK
      )).toBe(true);
    });
  });

  describe("JavaScript Analysis", () => {
    beforeEach(() => {
      config.language = SupportedLanguage.JAVASCRIPT;
      engine = new ParameterValidationEngine(config);
    });

    it("should suggest type annotations for JavaScript", async () => {
      const sourceCode = `
        function calculateTotal(items) {
          return items.reduce((sum, item) => sum + item.price, 0);
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.js");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.INVALID_TYPE_ANNOTATION
      )).toBe(true);
    });

    it("should detect missing validation in JavaScript", async () => {
      const sourceCode = `
        function processUser(user) {
          return user.name.toUpperCase(); // No validation
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.js");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.MISSING_VALIDATION
      )).toBe(true);
    });
  });

  describe("Go Analysis", () => {
    beforeEach(() => {
      config.language = SupportedLanguage.GO;
      engine = new ParameterValidationEngine(config);
    });

    it("should detect missing nil checks for pointers", async () => {
      const sourceCode = `
        func ProcessUser(user *User) string {
          return user.Name // Missing nil check
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.go");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.MISSING_NULL_CHECK &&
        f.parameter === "user"
      )).toBe(true);
    });

    it("should handle interface{} parameters", async () => {
      const sourceCode = `
        func ProcessData(data interface{}) {
          // Should suggest more specific type
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.go");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.INVALID_TYPE_ANNOTATION
      )).toBe(true);
    });
  });

  describe("Python Analysis", () => {
    beforeEach(() => {
      config.language = SupportedLanguage.PYTHON;
      engine = new ParameterValidationEngine(config);
    });

    it("should detect missing type hints", async () => {
      const sourceCode = `
        def process_user(name, age):
          return {"name": name, "age": age}
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.py");
      
      expect(result.findings.filter(f => 
        f.issue === ValidationIssueType.INVALID_TYPE_ANNOTATION
      )).toHaveLength(2);
    });

    it("should detect Optional type issues", async () => {
      const sourceCode = `
        from typing import Optional
        
        def process_user(name: str, email: Optional[str] = "default"):
          return email.lower()
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.py");
      
      expect(result.findings.some(f => 
        f.issue === ValidationIssueType.OPTIONAL_REQUIRED_MISMATCH
      )).toBe(true);
    });
  });

  describe("Batch Analysis", () => {
    it("should analyze multiple files", async () => {
      const files = [
        {
          content: `function test1(param) { return param; }`,
          path: "file1.js"
        },
        {
          content: `function test2(param: string) { return param; }`,
          path: "file2.ts"
        }
      ];
      
      const result = await engine.analyzeFiles(files);
      
      expect(result.metrics.filesAnalyzed).toBe(2);
      expect(result.totalFunctions).toBe(2);
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it("should handle analysis errors gracefully", async () => {
      const files = [
        {
          content: `invalid syntax here {{{`,
          path: "invalid.ts"
        },
        {
          content: `function valid(param: string) { return param; }`,
          path: "valid.ts"
        }
      ];
      
      // Should not throw, but continue with valid files
      const result = await engine.analyzeFiles(files);
      expect(result.metrics.filesAnalyzed).toBe(2);
    });
  });

  describe("Custom Rules", () => {
    it("should apply custom validation rules", async () => {
      config.customRules = [{
        name: "no-any-type",
        pattern: ":\\s*any\\b",
        severity: ValidationSeverity.HIGH,
        message: "Avoid using 'any' type"
      }];
      
      engine = new ParameterValidationEngine(config);
      
      const sourceCode = `
        function processData(data: any) {
          return data;
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.ts");
      
      expect(result.findings.some(f => 
        f.suggestion.includes("Avoid using 'any' type")
      )).toBe(true);
    });
  });

  describe("Configuration", () => {
    it("should respect minimum confidence threshold", async () => {
      config.minimumConfidence = 0.9;
      engine = new ParameterValidationEngine(config);
      
      const sourceCode = `
        function test(param) {
          return param;
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "test.ts");
      
      // All findings should have confidence >= 0.9
      expect(result.findings.every(f => f.confidence >= 0.9)).toBe(true);
    });

    it("should update configuration", () => {
      const newConfig = { strictMode: false };
      engine.updateConfig(newConfig);
      
      expect(engine.getConfig().strictMode).toBe(false);
    });
  });

  describe("Performance", () => {
    it("should complete analysis within reasonable time", async () => {
      const largeSourceCode = `
        ${Array.from({ length: 100 }, (_, i) => `
          function test${i}(param1: string, param2?: number) {
            if (param2) {
              return param1 + param2;
            }
            return param1;
          }
        `).join('\n')}
      `;
      
      const startTime = Date.now();
      const result = await engine.analyzeCode(largeSourceCode, "large.ts");
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(result.totalFunctions).toBe(100);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty source code", async () => {
      const result = await engine.analyzeCode("", "empty.ts");
      
      expect(result.totalFunctions).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    it("should handle malformed function signatures", async () => {
      const sourceCode = `
        function incomplete(
        // Incomplete function signature
      `;
      
      // Should not throw an error
      const result = await engine.analyzeCode(sourceCode, "malformed.ts");
      expect(result).toBeDefined();
    });

    it("should handle nested functions", async () => {
      const sourceCode = `
        function outer(param1: string) {
          function inner(param2: number) {
            return param1 + param2;
          }
          return inner;
        }
      `;
      
      const result = await engine.analyzeCode(sourceCode, "nested.ts");
      
      expect(result.totalFunctions).toBe(2);
    });
  });
});

