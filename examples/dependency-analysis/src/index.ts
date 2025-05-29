import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { dependencyValidationTools } from "@voltagent/core/analysis";

// Create the dependency analysis agent
const dependencyAnalysisAgent = new Agent({
  name: "Dependency Analyzer",
  description: `You are a code quality expert specializing in dependency analysis. You can:
  
  1. Analyze codebases for dependency issues
  2. Detect unused imports and circular dependencies
  3. Find version conflicts and deprecated packages
  4. Auto-fix simple import issues
  5. Generate comprehensive reports
  
  Use the available tools to analyze projects and provide actionable insights.`,
  
  provider: new VercelAIProvider({
    model: openai("gpt-4"),
  }),
  
  tools: dependencyValidationTools,
});

// Create the main orchestrator agent
const orchestratorAgent = new Agent({
  name: "Code Quality Orchestrator",
  description: `You are a senior software engineer responsible for maintaining code quality.
  
  When a user asks you to analyze a project:
  1. Use the Dependency Analyzer to check for dependency issues
  2. Provide a clear summary of findings
  3. Prioritize critical issues
  4. Suggest actionable improvements
  5. Offer to auto-fix simple issues if requested
  
  Always be thorough but concise in your analysis.`,
  
  provider: new VercelAIProvider({
    model: openai("gpt-4"),
  }),
  
  subAgents: [dependencyAnalysisAgent],
});

// Initialize VoltAgent
const voltAgent = new VoltAgent({
  agents: {
    orchestrator: orchestratorAgent,
    dependencyAnalyzer: dependencyAnalysisAgent,
  },
});

console.log("🔍 Dependency Analysis Agent started!");
console.log("📊 Available capabilities:");
console.log("  • Comprehensive dependency analysis");
console.log("  • Circular dependency detection");
console.log("  • Version conflict identification");
console.log("  • Deprecated package detection");
console.log("  • Auto-fixing of import issues");
console.log("  • Import organization");
console.log("");
console.log("💡 Try asking:");
console.log('  "Analyze the dependencies in /path/to/project"');
console.log('  "Check for circular dependencies in my codebase"');
console.log('  "Find and fix unused imports"');
console.log('  "Organize imports in my TypeScript files"');
console.log("");
console.log("🚀 Ready to analyze your code!");

