/**
 * Basic usage example for @voltagent/performance-analysis
 * 
 * This example demonstrates how to use the performance analysis module
 * to detect hotspots and optimization opportunities.
 */

import { 
  PerformanceHotspotDetector,
  ProfilingIntegration,
  StaticPerformanceAnalyzer,
  type AnalysisInput,
  type PerformanceAnalysisResult
} from "../src/index";

/**
 * Example 1: Basic Performance Analysis
 */
async function basicPerformanceAnalysis() {
  console.log("🔍 Running basic performance analysis...");
  
  // Sample performance data (would typically come from profiling tools)
  const analysisInput: AnalysisInput = {
    execution_profiles: [
      {
        file: "src/data-processor.js",
        function: "processLargeDataset",
        execution_time_ms: 2500,
        cpu_usage_percent: 85,
        memory_usage_bytes: 50 * 1024 * 1024, // 50MB
        call_count: 1500,
        line_start: 45,
        line_end: 78,
      },
      {
        file: "src/api-handler.js", 
        function: "handleRequest",
        execution_time_ms: 150,
        cpu_usage_percent: 15,
        memory_usage_bytes: 2 * 1024 * 1024, // 2MB
        call_count: 10000,
      }
    ],
    resource_usage_metrics: [
      {
        file: "src/database.js",
        function: "queryUserData",
        memory_allocations: 1000,
        memory_deallocations: 950,
        peak_memory_usage: 100 * 1024 * 1024, // 100MB
        io_operations: 50,
        network_requests: 25,
        database_queries: 150, // High number - should trigger finding
      }
    ],
    function_call_frequencies: [
      {
        file: "src/utils.js",
        function: "expensiveCalculation",
        call_count: 5000,
        average_execution_time: 1200,
        total_execution_time: 6000000,
      }
    ],
    memory_allocation_patterns: [
      {
        file: "src/cache.js",
        function: "cacheData",
        allocation_size: 10 * 1024 * 1024, // 10MB
        allocation_frequency: 100,
        deallocation_frequency: 80,
        potential_leak: true,
        leak_rate_per_hour: 50, // 50MB/hour
      }
    ]
  };

  // Create detector with custom configuration
  const detector = new PerformanceHotspotDetector({
    cpu_threshold_percent: 70,
    memory_threshold_mb: 100,
    execution_time_threshold_ms: 1000,
    call_frequency_threshold: 1000,
    memory_leak_threshold_mb_per_hour: 10,
  });

  // Perform analysis
  const result = await detector.analyze(analysisInput);
  
  console.log("📊 Analysis Results:");
  console.log(`Severity: ${result.severity}`);
  console.log(`Total hotspots found: ${result.summary.total_hotspots}`);
  console.log(`Critical issues: ${result.summary.critical_issues}`);
  console.log(`Optimization potential: ${result.summary.optimization_potential}`);
  console.log(`Estimated improvement: ${result.summary.estimated_improvement}`);
  
  console.log("\n🔥 Top Performance Issues:");
  result.findings.slice(0, 5).forEach((finding, index) => {
    console.log(`${index + 1}. ${finding.type} in ${finding.file}${finding.function ? `:${finding.function}` : ''}`);
    console.log(`   Impact: ${finding.impact_score}/10 | Confidence: ${(finding.confidence * 100).toFixed(0)}%`);
    console.log(`   Suggestion: ${finding.suggestion}`);
    console.log("");
  });

  return result;
}

/**
 * Example 2: Static Code Analysis
 */
async function staticCodeAnalysis() {
  console.log("📝 Running static code analysis...");
  
  const analyzer = new StaticPerformanceAnalyzer();
  
  // Sample problematic code
  const sourceCode = `
function processData(items) {
  let result = "";
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items[i].children.length; j++) {
      result += items[i].children[j].name + ", "; // String concatenation in nested loop
    }
  }
  return result;
}

function syncFileOperation() {
  const data = fs.readFileSync('./large-file.txt'); // Synchronous I/O
  return data.toString();
}

function inefficientSearch(array, target) {
  return array.indexOf(target) > -1; // Should use .includes()
}
  `;
  
  const findings = await analyzer.analyzeSourceCode("example.js", sourceCode);
  
  console.log(`Found ${findings.length} static analysis issues:`);
  findings.forEach((finding, index) => {
    console.log(`${index + 1}. ${finding.type} at line ${finding.line_start}`);
    console.log(`   ${finding.suggestion}`);
    console.log("");
  });

  return findings;
}

/**
 * Example 3: Runtime Performance Monitoring
 */
async function runtimeMonitoring() {
  console.log("⏱️  Starting runtime performance monitoring...");
  
  const profiler = new ProfilingIntegration();
  
  // Start monitoring
  profiler.startMonitoring();
  
  // Simulate some work (in real usage, your application would run here)
  console.log("Running simulated workload...");
  
  // Simulate CPU-intensive work
  profiler.markFunctionStart("heavyComputation");
  await simulateHeavyWork();
  profiler.markFunctionEnd("heavyComputation");
  
  // Simulate I/O work
  profiler.markFunctionStart("ioOperation");
  await simulateIoWork();
  profiler.markFunctionEnd("ioOperation");
  
  // Stop monitoring after 5 seconds
  setTimeout(() => {
    profiler.stopMonitoring();
    
    // Generate analysis input from collected data
    const analysisInput: AnalysisInput = {
      execution_profiles: profiler.generateExecutionProfiles(),
      resource_usage_metrics: profiler.generateResourceUsageMetrics(),
      function_call_frequencies: profiler.generateFunctionCallFrequencies(),
      memory_allocation_patterns: profiler.generateMemoryAllocationPatterns(),
    };
    
    console.log("📊 Collected performance data:");
    console.log(`Execution profiles: ${analysisInput.execution_profiles.length}`);
    console.log(`Resource metrics: ${analysisInput.resource_usage_metrics.length}`);
    console.log(`Function frequencies: ${analysisInput.function_call_frequencies.length}`);
    console.log(`Memory patterns: ${analysisInput.memory_allocation_patterns.length}`);
    
  }, 5000);
}

/**
 * Example 4: Complete Analysis Pipeline
 */
async function completeAnalysisPipeline() {
  console.log("🚀 Running complete analysis pipeline...");
  
  // Step 1: Collect runtime data
  const profiler = new ProfilingIntegration();
  profiler.startMonitoring();
  
  // Simulate application workload
  await simulateApplicationWorkload();
  
  profiler.stopMonitoring();
  
  // Step 2: Generate analysis input
  const runtimeData: AnalysisInput = {
    execution_profiles: profiler.generateExecutionProfiles(),
    resource_usage_metrics: profiler.generateResourceUsageMetrics(),
    function_call_frequencies: profiler.generateFunctionCallFrequencies(),
    memory_allocation_patterns: profiler.generateMemoryAllocationPatterns(),
  };
  
  // Step 3: Perform static analysis
  const staticAnalyzer = new StaticPerformanceAnalyzer();
  const sourceFiles = {
    "app.js": "function slowLoop() { for(let i=0; i<1000; i++) { for(let j=0; j<1000; j++) { console.log(i*j); } } }",
    "utils.js": "const data = fs.readFileSync('file.txt'); // Sync I/O",
  };
  
  const staticFindings = [];
  for (const [filePath, sourceCode] of Object.entries(sourceFiles)) {
    const findings = await staticAnalyzer.analyzeSourceCode(filePath, sourceCode);
    staticFindings.push(...findings);
  }
  
  // Step 4: Combine runtime and static analysis
  const detector = new PerformanceHotspotDetector();
  const result = await detector.analyze(runtimeData);
  
  // Add static findings
  result.findings.push(...staticFindings);
  result.findings.sort((a, b) => b.impact_score - a.impact_score);
  
  // Step 5: Generate recommendations
  console.log("\n🎯 Performance Analysis Complete!");
  console.log("=" .repeat(50));
  console.log(`Overall Severity: ${result.severity.toUpperCase()}`);
  console.log(`Total Issues Found: ${result.findings.length}`);
  console.log(`Critical Issues: ${result.summary.critical_issues}`);
  console.log(`${result.summary.optimization_potential}`);
  console.log(`${result.summary.estimated_improvement}`);
  
  console.log("\n🔧 Top Recommendations:");
  const topIssues = result.findings.slice(0, 3);
  topIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.type.replace('_', ' ').toUpperCase()}`);
    console.log(`   File: ${issue.file}${issue.function ? ` (${issue.function})` : ''}`);
    console.log(`   Impact: ${issue.impact_score}/10`);
    console.log(`   Fix: ${issue.suggestion}`);
    console.log("");
  });
  
  return result;
}

// Helper functions for simulation
async function simulateHeavyWork(): Promise<void> {
  return new Promise(resolve => {
    // Simulate CPU-intensive work
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }
    setTimeout(resolve, 100);
  });
}

async function simulateIoWork(): Promise<void> {
  return new Promise(resolve => {
    // Simulate I/O work
    setTimeout(resolve, 50);
  });
}

async function simulateApplicationWorkload(): Promise<void> {
  // Simulate various application operations
  for (let i = 0; i < 10; i++) {
    await simulateHeavyWork();
    await simulateIoWork();
  }
}

// Run examples
async function runExamples() {
  try {
    console.log("🎯 Performance Analysis Examples");
    console.log("=" .repeat(50));
    
    await basicPerformanceAnalysis();
    console.log("\n" + "=" .repeat(50));
    
    await staticCodeAnalysis();
    console.log("\n" + "=" .repeat(50));
    
    await runtimeMonitoring();
    console.log("\n" + "=" .repeat(50));
    
    await completeAnalysisPipeline();
    
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Export for use in other files
export {
  basicPerformanceAnalysis,
  staticCodeAnalysis,
  runtimeMonitoring,
  completeAnalysisPipeline,
  runExamples,
};

// Run if this file is executed directly
if (require.main === module) {
  runExamples();
}

