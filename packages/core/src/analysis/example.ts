/**
 * Example usage of the Data Flow & Variable Tracking Analysis Module
 * 
 * This file demonstrates how to use the data flow analysis tools
 * to detect various types of data flow issues in TypeScript/JavaScript code.
 */

import { DataFlowTracker, createDataFlowAnalysisToolkit } from "./index";
import { DataFlowAnalysisConfig } from "./types";

/**
 * Example 1: Basic usage with the DataFlowTracker class
 */
async function basicUsageExample() {
  console.log("=== Basic Usage Example ===");
  
  const tracker = new DataFlowTracker();
  
  const codeWithIssues = `
    function problematicFunction() {
      let uninitializedVar;
      let unusedVar = 42;
      
      console.log(uninitializedVar); // Uninitialized variable usage
      
      // Memory leak potential
      setInterval(() => {
        console.log("This might leak memory");
      }, 1000);
      
      return "done";
    }
  `;
  
  const result = await tracker.analyze({
    files: [
      {
        path: "problematic.ts",
        content: codeWithIssues
      }
    ]
  });
  
  console.log(`Analysis completed in ${result.analysisTime}ms`);
  console.log(`Files analyzed: ${result.filesAnalyzed}`);
  console.log(`Variables tracked: ${result.variablesTracked}`);
  console.log(`Issues found: ${result.findings.length}`);
  
  result.findings.forEach((finding, index) => {
    console.log(`\nIssue ${index + 1}:`);
    console.log(`  Type: ${finding.type}`);
    console.log(`  Severity: ${finding.severity}`);
    console.log(`  Message: ${finding.message}`);
    console.log(`  Location: ${finding.location.file}:${finding.location.line}`);
    console.log(`  Suggestion: ${finding.suggestion}`);
    console.log(`  Confidence: ${finding.confidence}`);
  });
}

/**
 * Example 2: Using custom configuration
 */
async function customConfigExample() {
  console.log("\n=== Custom Configuration Example ===");
  
  const config: DataFlowAnalysisConfig = {
    enableUninitializedVariableDetection: true,
    enableUnusedVariableDetection: false, // Disable unused variable detection
    enableDataRaceDetection: true,
    enableMemoryLeakDetection: true,
    enableScopeViolationDetection: true,
    enableNullPointerDetection: true,
    enableTypeChecking: true,
    maxFileSizeKB: 512,
    excludePatterns: ["**/*.test.ts", "**/node_modules/**"],
    includePatterns: ["**/*.ts", "**/*.tsx"],
    strictMode: true,
    confidenceThreshold: 0.8
  };
  
  const tracker = new DataFlowTracker(config);
  
  const code = `
    function testFunction() {
      let unusedVariable = "This won't be flagged due to config";
      let uninitializedVar;
      
      console.log(uninitializedVar); // This will still be flagged
    }
  `;
  
  const result = await tracker.analyze({
    files: [{ path: "configured.ts", content: code }],
    config
  });
  
  console.log(`Issues found with custom config: ${result.findings.length}`);
  result.findings.forEach(finding => {
    console.log(`  - ${finding.type}: ${finding.message}`);
  });
}

/**
 * Example 3: Using the toolkit with an agent
 */
async function toolkitExample() {
  console.log("\n=== Toolkit Usage Example ===");
  
  const toolkit = createDataFlowAnalysisToolkit();
  
  console.log(`Toolkit contains ${toolkit.tools.length} tools:`);
  toolkit.tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description.split('\n')[0]}`);
  });
  
  // Example of using the single file analysis tool
  const singleFileTool = toolkit.tools.find(tool => tool.name === "analyze_file_data_flow");
  
  if (singleFileTool) {
    const result = await singleFileTool.execute({
      filePath: "example.ts",
      content: `
        function example() {
          let x;
          console.log(x);
        }
      `
    });
    
    console.log("Single file analysis result:", result);
  }
}

/**
 * Example 4: Analyzing multiple files
 */
async function multipleFilesExample() {
  console.log("\n=== Multiple Files Example ===");
  
  const tracker = new DataFlowTracker();
  
  const files = [
    {
      path: "utils.ts",
      content: `
        export function utility() {
          let helper;
          return helper; // Uninitialized usage
        }
      `
    },
    {
      path: "main.ts", 
      content: `
        import { utility } from './utils';
        
        function main() {
          let result = utility();
          let unused = "not used"; // Unused variable
          console.log(result);
        }
      `
    },
    {
      path: "async.ts",
      content: `
        async function asyncFunction() {
          let sharedVar = 0;
          
          // Potential data race
          setTimeout(() => sharedVar++, 100);
          setTimeout(() => sharedVar++, 200);
          
          return sharedVar;
        }
      `
    }
  ];
  
  const result = await tracker.analyze({ files });
  
  console.log(`Analyzed ${result.filesAnalyzed} files`);
  console.log(`Total issues: ${result.summary.totalIssues}`);
  console.log(`Critical: ${result.summary.criticalIssues}`);
  console.log(`High: ${result.summary.highIssues}`);
  console.log(`Medium: ${result.summary.mediumIssues}`);
  console.log(`Low: ${result.summary.lowIssues}`);
  
  // Group findings by file
  const findingsByFile = result.findings.reduce((acc, finding) => {
    const file = finding.location.file;
    if (!acc[file]) acc[file] = [];
    acc[file].push(finding);
    return acc;
  }, {} as Record<string, typeof result.findings>);
  
  Object.entries(findingsByFile).forEach(([file, findings]) => {
    console.log(`\n${file}:`);
    findings.forEach(finding => {
      console.log(`  Line ${finding.location.line}: ${finding.message}`);
    });
  });
}

/**
 * Example 5: Real-world patterns
 */
async function realWorldExample() {
  console.log("\n=== Real-world Patterns Example ===");
  
  const tracker = new DataFlowTracker({
    strictMode: true,
    confidenceThreshold: 0.9
  });
  
  const reactComponentCode = `
    import React, { useState, useEffect } from 'react';
    
    function UserProfile({ userId }) {
      const [user, setUser] = useState();
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState();
      
      useEffect(() => {
        let isMounted = true;
        
        async function fetchUser() {
          try {
            const response = await fetch(\`/api/users/\${userId}\`);
            const userData = await response.json();
            
            if (isMounted) {
              setUser(userData);
              setLoading(false);
            }
          } catch (err) {
            if (isMounted) {
              setError(err.message);
              setLoading(false);
            }
          }
        }
        
        fetchUser();
        
        // Cleanup function
        return () => {
          isMounted = false;
        };
      }, [userId]);
      
      if (loading) return <div>Loading...</div>;
      if (error) return <div>Error: {error}</div>;
      
      return (
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      );
    }
    
    export default UserProfile;
  `;
  
  const result = await tracker.analyze({
    files: [{ path: "UserProfile.tsx", content: reactComponentCode }]
  });
  
  console.log(`React component analysis:`);
  console.log(`  Issues found: ${result.findings.length}`);
  
  if (result.findings.length > 0) {
    result.findings.forEach(finding => {
      console.log(`  - ${finding.type} at line ${finding.location.line}: ${finding.message}`);
    });
  } else {
    console.log("  No issues found - clean React component!");
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await basicUsageExample();
    await customConfigExample();
    await toolkitExample();
    await multipleFilesExample();
    await realWorldExample();
    
    console.log("\n=== All examples completed successfully! ===");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Export for use in other files
export {
  basicUsageExample,
  customConfigExample,
  toolkitExample,
  multipleFilesExample,
  realWorldExample,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

