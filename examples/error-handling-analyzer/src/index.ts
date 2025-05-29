import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import {
  analyzeErrorHandlingTool,
  analyzeDirectoryErrorHandlingTool,
  generateErrorHandlingReportTool
} from "./tools";

// Create the Error Handling Analyzer Agent
const errorHandlingAnalyzerAgent = new Agent({
  name: "Error Handling Analyzer",
  description: `You are an expert error handling and exception flow analyzer. Your role is to:

1. **Analyze Code for Error Handling Patterns**: Examine code files to identify missing error handling, unhandled exceptions, and error propagation issues.

2. **Detect Error-Prone Operations**: Identify operations that commonly fail (database calls, network requests, file I/O, parsing operations) and verify they have proper error handling.

3. **Evaluate Exception Flow**: Analyze how errors propagate through the call stack and ensure proper context is maintained.

4. **Assess Recovery Mechanisms**: Check for graceful degradation patterns and recovery strategies.

5. **Validate Error Logging**: Ensure adequate logging is in place for debugging and monitoring.

6. **Generate Actionable Reports**: Provide detailed analysis with specific suggestions for improvement.

**Analysis Capabilities:**
- Multi-language support (TypeScript, JavaScript, Python, Go, Java)
- Pattern-based detection of error handling anti-patterns
- Severity assessment based on operation criticality
- Confidence scoring for findings
- Comprehensive reporting in multiple formats

**Key Error Patterns Detected:**
- Missing error handling for error-prone operations
- Empty or generic catch blocks
- Unhandled async operation errors
- Resource leaks due to missing cleanup
- Error swallowing without logging
- Inadequate error propagation
- Missing error context

Use the available tools to analyze code files or directories and generate comprehensive error handling reports.`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    analyzeErrorHandlingTool,
    analyzeDirectoryErrorHandlingTool,
    generateErrorHandlingReportTool
  ]
});

// Create the Code Quality Supervisor Agent
const codeQualitySupervisorAgent = new Agent({
  name: "Code Quality Supervisor",
  description: `You are a code quality supervisor that coordinates error handling analysis as part of a comprehensive PR analysis system.

When given a pull request or code changes, you will:
1. Use the Error Handling Analyzer to examine all modified files
2. Generate comprehensive error handling reports
3. Provide actionable feedback for improving error handling
4. Integrate findings with other code quality metrics

You focus specifically on error handling and exception flow analysis as part of the larger code quality assessment pipeline.`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [errorHandlingAnalyzerAgent]
});

// Initialize the VoltAgent with the agent hierarchy
const voltAgent = new VoltAgent({
  agents: {
    codeQualitySupervisorAgent,
    errorHandlingAnalyzerAgent
  }
});

// Export for use in other modules
export {
  voltAgent,
  codeQualitySupervisorAgent,
  errorHandlingAnalyzerAgent,
  analyzeErrorHandlingTool,
  analyzeDirectoryErrorHandlingTool,
  generateErrorHandlingReportTool
};

// Example usage function
export async function analyzeErrorHandling(files: Array<{path: string, content?: string}>) {
  try {
    const result = await analyzeErrorHandlingTool.execute({
      files,
      analysis_depth: "comprehensive"
    });
    
    if (result.success && result.analysis) {
      console.log(`\n🔍 Error Handling Analysis Complete`);
      console.log(`📁 Files analyzed: ${result.analysis.analyzed_files.length}`);
      console.log(`⚠️  Total findings: ${result.analysis.total_findings}`);
      console.log(`🎯 Overall severity: ${result.analysis.severity.toUpperCase()}`);
      console.log(`📊 Error handling coverage: ${result.analysis.summary.coverage_percentage}%`);
      
      if (result.recommendations && result.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        result.recommendations.forEach((rec: string, index: number) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
      return result.analysis;
    } else {
      console.error(`❌ Analysis failed: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error during analysis: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// CLI interface for standalone usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔄 Error Handling & Exception Flow Analyzer

Usage:
  npm run dev <file1> [file2] [file3] ...     # Analyze specific files
  npm run dev --directory <path>              # Analyze entire directory
  npm run dev --help                          # Show this help

Examples:
  npm run dev src/api/handlers.ts src/utils/database.ts
  npm run dev --directory ./src
  npm run dev --directory ./src --depth deep
    `);
    process.exit(0);
  }
  
  if (args[0] === '--help') {
    console.log(`
🔄 Error Handling & Exception Flow Analyzer

This tool analyzes code for error handling patterns and exception flows.

Options:
  --directory <path>    Analyze all code files in directory
  --depth <level>       Analysis depth: basic, comprehensive, deep
  --format <format>     Report format: json, markdown, html, csv
  --help               Show this help

Supported Languages:
  - TypeScript (.ts, .tsx)
  - JavaScript (.js, .jsx)  
  - Python (.py)
  - Go (.go)
  - Java (.java)

Analysis Features:
  ✅ Missing error handling detection
  ✅ Unhandled exception identification
  ✅ Error propagation analysis
  ✅ Recovery mechanism validation
  ✅ Error logging assessment
  ✅ Async error handling checks
  ✅ Resource leak detection
    `);
    process.exit(0);
  }
  
  // Handle directory analysis
  if (args[0] === '--directory') {
    const directoryPath = args[1];
    if (!directoryPath) {
      console.error('❌ Please provide a directory path');
      process.exit(1);
    }
    
    const depthIndex = args.indexOf('--depth');
    const depth = depthIndex !== -1 ? args[depthIndex + 1] : 'comprehensive';
    
    analyzeDirectoryErrorHandlingTool.execute({
      directory_path: directoryPath,
      analysis_depth: depth as any
    }).then(result => {
      if (result.success && result.analysis) {
        console.log(JSON.stringify(result.analysis, null, 2));
      } else {
        console.error(`❌ Analysis failed: ${result.error}`);
        process.exit(1);
      }
    }).catch(error => {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    });
  } else {
    // Handle file analysis
    const files = args.map(filePath => ({ path: filePath }));
    analyzeErrorHandling(files).then(result => {
      if (result) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        process.exit(1);
      }
    });
  }
}

