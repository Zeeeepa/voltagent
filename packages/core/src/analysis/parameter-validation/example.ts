/**
 * Example usage of the Parameter Validation & Type Checking Module
 * 
 * This file demonstrates various ways to use the parameter validation
 * analysis capabilities in different scenarios.
 */

import { 
  ParameterValidationEngine,
  parameterValidationTool,
  batchParameterValidationTool,
  SupportedLanguage,
  ValidationSeverity,
  createParameterValidationConfig,
  generateSummaryReport,
  filterFindingsBySeverity
} from "./index";

// Example 1: Basic TypeScript Analysis
async function basicTypeScriptAnalysis() {
  console.log("=== Basic TypeScript Analysis ===");
  
  const sourceCode = `
    function processUser(name: string, age?: number, email) {
      if (age) {
        return email.toLowerCase() + name; // Missing validation for email
      }
      return name;
    }
    
    function calculateTotal(items: any[]) {
      return items.reduce((sum, item) => sum + item.price, 0); // Potential type issues
    }
  `;
  
  const config = createParameterValidationConfig({
    language: SupportedLanguage.TYPESCRIPT,
    strictMode: true,
    minimumConfidence: 0.8
  });
  
  const engine = new ParameterValidationEngine(config);
  const result = await engine.analyzeCode(sourceCode, "user.ts");
  
  console.log(`Found ${result.findings.length} issues:`);
  result.findings.forEach(finding => {
    console.log(`- ${finding.severity.toUpperCase()}: ${finding.suggestion} (${finding.file}:${finding.line})`);
  });
  
  console.log("\nSummary Report:");
  console.log(generateSummaryReport(result));
}

// Example 2: Multi-Language Batch Analysis
async function multiLanguageBatchAnalysis() {
  console.log("\n=== Multi-Language Batch Analysis ===");
  
  const files = [
    {
      content: `
        function validateInput(data) {
          return data.name && data.email; // Missing type checks
        }
      `,
      path: "validator.js"
    },
    {
      content: `
        interface User {
          name: string;
          email?: string;
        }
        
        function processUser(user: User) {
          return user.email.toLowerCase(); // Missing null check
        }
      `,
      path: "user.ts"
    },
    {
      content: `
        func ProcessUser(user *User) string {
          return user.Name // Missing nil check
        }
      `,
      path: "user.go"
    },
    {
      content: `
        def process_user(name, email=None):
          return email.lower() + name  # Missing None check
      `,
      path: "user.py"
    }
  ];
  
  const config = createParameterValidationConfig({
    language: SupportedLanguage.TYPESCRIPT, // Will be auto-detected per file
    strictMode: true,
    checkOptionalParameters: true
  });
  
  const engine = new ParameterValidationEngine(config);
  const result = await engine.analyzeFiles(files);
  
  console.log(`Analyzed ${result.metrics.filesAnalyzed} files`);
  console.log(`Found ${result.findings.length} total issues`);
  
  // Group findings by severity
  const criticalFindings = filterFindingsBySeverity(result.findings, ValidationSeverity.CRITICAL);
  const highFindings = filterFindingsBySeverity(result.findings, ValidationSeverity.HIGH);
  
  console.log(`Critical issues: ${criticalFindings.length}`);
  console.log(`High priority issues: ${highFindings.length}`);
}

// Example 3: Using as VoltAgent Tools
async function voltAgentToolExample() {
  console.log("\n=== VoltAgent Tool Usage ===");
  
  // Single file analysis
  const singleFileResult = await parameterValidationTool.execute({
    sourceCode: `
      function riskyFunction(data?: any) {
        return data.property.value; // Multiple issues here
      }
    `,
    filePath: "risky.ts"
  });
  
  if (singleFileResult.success) {
    console.log("Single file analysis completed:");
    console.log(`- Issues found: ${singleFileResult.summary.issuesFound}`);
    console.log(`- Auto-fixable: ${singleFileResult.summary.autoFixableIssues}`);
  }
  
  // Batch analysis
  const batchResult = await batchParameterValidationTool.execute({
    files: [
      {
        content: `function test1(param) { return param.value; }`,
        path: "test1.js"
      },
      {
        content: `function test2(param?: string) { return param.length; }`,
        path: "test2.ts"
      }
    ]
  });
  
  if (batchResult.success) {
    console.log("Batch analysis completed:");
    console.log(`- Files analyzed: ${batchResult.summary.filesAnalyzed}`);
    console.log(`- Total issues: ${batchResult.summary.issuesFound}`);
  }
}

// Example 4: Custom Rules and Configuration
async function customRulesExample() {
  console.log("\n=== Custom Rules Example ===");
  
  const config = createParameterValidationConfig({
    language: SupportedLanguage.TYPESCRIPT,
    strictMode: true,
    customRules: [
      {
        name: "no-any-type",
        pattern: ":\\s*any\\b",
        severity: ValidationSeverity.HIGH,
        message: "Avoid using 'any' type - use specific types for better type safety"
      },
      {
        name: "require-param-validation",
        pattern: "function\\s+\\w+\\s*\\([^)]*\\)\\s*{[^}]*(?!if\\s*\\()[^}]*}",
        severity: ValidationSeverity.MEDIUM,
        message: "Functions should validate their parameters"
      }
    ]
  });
  
  const sourceCode = `
    function processData(data: any) {
      return data.value; // Will trigger both custom rules
    }
    
    function safeProcess(data: unknown) {
      if (typeof data === 'object' && data !== null && 'value' in data) {
        return (data as { value: any }).value;
      }
      throw new Error('Invalid data');
    }
  `;
  
  const engine = new ParameterValidationEngine(config);
  const result = await engine.analyzeCode(sourceCode, "custom.ts");
  
  console.log("Custom rules analysis:");
  result.findings.forEach(finding => {
    console.log(`- ${finding.severity}: ${finding.suggestion}`);
  });
}

// Example 5: Performance Analysis
async function performanceExample() {
  console.log("\n=== Performance Analysis ===");
  
  // Generate a large codebase for performance testing
  const largeCodebase = Array.from({ length: 100 }, (_, i) => `
    function function${i}(param1: string, param2?: number, param3: any) {
      if (param2) {
        return param1 + param2 + param3.value;
      }
      return param1;
    }
  `).join('\n');
  
  const config = createParameterValidationConfig({
    language: SupportedLanguage.TYPESCRIPT,
    strictMode: true
  });
  
  const engine = new ParameterValidationEngine(config);
  
  const startTime = Date.now();
  const result = await engine.analyzeCode(largeCodebase, "large.ts");
  const endTime = Date.now();
  
  console.log(`Performance metrics:`);
  console.log(`- Analysis time: ${endTime - startTime}ms`);
  console.log(`- Functions analyzed: ${result.totalFunctions}`);
  console.log(`- Parameters analyzed: ${result.totalParameters}`);
  console.log(`- Lines of code: ${result.metrics.linesOfCode}`);
  console.log(`- Analysis speed: ${(result.metrics.linesOfCode / (result.metrics.analysisTimeMs / 1000)).toFixed(2)} lines/second`);
}

// Example 6: Error Handling and Edge Cases
async function errorHandlingExample() {
  console.log("\n=== Error Handling Example ===");
  
  const config = createParameterValidationConfig({
    language: SupportedLanguage.TYPESCRIPT,
    strictMode: true
  });
  
  const engine = new ParameterValidationEngine(config);
  
  // Test with malformed code
  try {
    const result = await engine.analyzeCode("function incomplete(", "malformed.ts");
    console.log("Malformed code handled gracefully");
    console.log(`Functions found: ${result.totalFunctions}`);
  } catch (error) {
    console.log(`Error handled: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Test with empty code
  const emptyResult = await engine.analyzeCode("", "empty.ts");
  console.log(`Empty file analysis: ${emptyResult.findings.length} issues found`);
  
  // Test with comments only
  const commentsOnlyResult = await engine.analyzeCode(`
    // This file only has comments
    /* 
     * No actual code here
     */
  `, "comments.ts");
  console.log(`Comments-only file: ${commentsOnlyResult.totalFunctions} functions found`);
}

// Run all examples
async function runAllExamples() {
  try {
    await basicTypeScriptAnalysis();
    await multiLanguageBatchAnalysis();
    await voltAgentToolExample();
    await customRulesExample();
    await performanceExample();
    await errorHandlingExample();
    
    console.log("\n=== All Examples Completed Successfully ===");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Export for use in other files
export {
  basicTypeScriptAnalysis,
  multiLanguageBatchAnalysis,
  voltAgentToolExample,
  customRulesExample,
  performanceExample,
  errorHandlingExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  runAllExamples();
}

