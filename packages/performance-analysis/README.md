# @voltagent/performance-analysis

Performance hotspot detection and analysis module for VoltAgent. This module provides comprehensive performance analysis capabilities to identify bottlenecks, resource usage patterns, and optimization opportunities in your applications.

## Features

- 🔥 **CPU Hotspot Detection** - Identify CPU-intensive functions and operations
- 🧠 **Memory Leak Detection** - Find memory leaks and excessive allocation patterns  
- 💾 **I/O Bottleneck Analysis** - Detect database, network, and file system bottlenecks
- ⚡ **Algorithm Complexity Assessment** - Identify inefficient algorithms and nested loops
- 📊 **Static Code Analysis** - Analyze source code for performance anti-patterns
- 🔍 **Runtime Profiling Integration** - Collect and analyze runtime performance data

## Installation

```bash
npm install @voltagent/performance-analysis
```

## Quick Start

### Basic Usage with VoltAgent

```typescript
import { Agent } from "@voltagent/core";
import { performanceAnalysisToolkit } from "@voltagent/performance-analysis";

const performanceAgent = new Agent({
  name: "Performance Analyzer",
  description: "Analyzes application performance and identifies optimization opportunities",
  tools: [performanceAnalysisToolkit],
});

// The agent can now analyze performance data and provide optimization recommendations
```

### Direct API Usage

```typescript
import { 
  PerformanceHotspotDetector,
  ProfilingIntegration,
  type AnalysisInput 
} from "@voltagent/performance-analysis";

// Create detector with custom configuration
const detector = new PerformanceHotspotDetector({
  cpu_threshold_percent: 70,
  memory_threshold_mb: 100,
  execution_time_threshold_ms: 1000,
});

// Prepare analysis input data
const analysisInput: AnalysisInput = {
  execution_profiles: [
    {
      file: "processing/data.js",
      function: "processLargeDataset", 
      execution_time_ms: 2500,
      cpu_usage_percent: 85,
      memory_usage_bytes: 50 * 1024 * 1024,
      call_count: 1500,
    }
  ],
  resource_usage_metrics: [
    {
      file: "handlers/upload.js",
      memory_allocations: 1000,
      memory_deallocations: 950,
      peak_memory_usage: 100 * 1024 * 1024,
      io_operations: 150,
      network_requests: 25,
      database_queries: 10,
    }
  ],
  function_call_frequencies: [],
  memory_allocation_patterns: [],
};

// Analyze performance
const result = await detector.analyze(analysisInput);
console.log(result);
```

### Runtime Performance Monitoring

```typescript
import { ProfilingIntegration } from "@voltagent/performance-analysis";

const profiler = new ProfilingIntegration();

// Start monitoring
profiler.startMonitoring();

// Your application code runs here...

// Stop monitoring and collect data
profiler.stopMonitoring();

const analysisInput = {
  execution_profiles: profiler.generateExecutionProfiles(),
  resource_usage_metrics: profiler.generateResourceUsageMetrics(),
  function_call_frequencies: profiler.generateFunctionCallFrequencies(),
  memory_allocation_patterns: profiler.generateMemoryAllocationPatterns(),
};

// Analyze the collected data
const detector = new PerformanceHotspotDetector();
const result = await detector.analyze(analysisInput);
```

## Analysis Output Format

The performance analysis returns a structured result following this format:

```json
{
  "module": "performance_hotspot_detection",
  "severity": "medium|high|critical",
  "findings": [
    {
      "type": "cpu_hotspot",
      "file": "processing/data.js",
      "function": "processLargeDataset",
      "metrics": {
        "cpu_usage": "85%",
        "execution_time": "2.5s",
        "call_frequency": 1500
      },
      "suggestion": "Optimize algorithm or add caching",
      "impact_score": 8.5,
      "confidence": 0.9
    }
  ],
  "summary": {
    "total_hotspots": 5,
    "critical_issues": 2,
    "optimization_potential": "High optimization potential",
    "estimated_improvement": "45% potential improvement"
  },
  "metadata": {
    "analysis_timestamp": "2024-01-15T10:30:00Z",
    "analysis_duration_ms": 150,
    "files_analyzed": 12,
    "functions_analyzed": 45
  }
}
```

## Detection Types

The module can detect the following types of performance issues:

- **cpu_hotspot** - Functions consuming excessive CPU resources
- **memory_leak** - Memory that is allocated but never freed
- **memory_allocation** - Excessive memory allocation patterns
- **io_bottleneck** - General I/O performance issues
- **database_bottleneck** - Database query performance issues
- **network_bottleneck** - Network request performance issues
- **lock_contention** - Concurrency and locking issues
- **algorithm_complexity** - Inefficient algorithms (O(n²) or worse)
- **resource_leak** - General resource management issues

## Configuration Options

```typescript
const config = {
  cpu_threshold_percent: 70,           // CPU usage threshold
  memory_threshold_mb: 100,            // Memory usage threshold
  execution_time_threshold_ms: 1000,   // Execution time threshold
  call_frequency_threshold: 1000,      // Function call frequency threshold
  memory_leak_threshold_mb_per_hour: 10, // Memory leak rate threshold
  io_threshold_ms: 500,                // I/O operation threshold
  enable_static_analysis: true,        // Enable static code analysis
  enable_complexity_analysis: true,    // Enable complexity analysis
};
```

## VoltAgent Tools

### performance_hotspot_analyzer

Analyzes performance data to identify hotspots and optimization opportunities.

**Parameters:**
- `analysis_input` - Performance data from profiling tools
- `config` - Optional configuration for analysis thresholds
- `include_static_analysis` - Whether to perform static code analysis
- `source_code_files` - Source code files for static analysis

### start_performance_monitoring

Starts runtime performance monitoring to collect execution data.

**Parameters:**
- `duration_seconds` - How long to monitor (default: 60 seconds)
- `sample_interval_ms` - Sampling interval (default: 1000ms)

## Integration with Profiling Tools

The module is designed to work with various profiling tools and data sources:

- **Node.js Performance Hooks** - Built-in performance monitoring
- **Chrome DevTools** - Browser performance profiling
- **Custom Profilers** - Any tool that can provide execution profiles
- **APM Tools** - Application Performance Monitoring solutions
- **Static Analysis Tools** - ESLint, SonarQube, etc.

## Example: Complete Performance Analysis

```typescript
import { Agent } from "@voltagent/core";
import { 
  performanceAnalyzerTool,
  startPerformanceMonitoringTool 
} from "@voltagent/performance-analysis";

const agent = new Agent({
  name: "Performance Detective",
  description: "Identifies and analyzes performance issues in applications",
  tools: [performanceAnalyzerTool, startPerformanceMonitoringTool],
});

// Start monitoring
const monitoringResult = await agent.execute("start_performance_monitoring", {
  duration_seconds: 120,
  sample_interval_ms: 500,
});

// Analyze the collected data
const analysisResult = await agent.execute("performance_hotspot_analyzer", {
  analysis_input: monitoringResult.analysis_input,
  include_static_analysis: true,
  source_code_files: {
    "app.js": "/* your source code */",
    "utils.js": "/* your source code */",
  },
});

console.log("Performance Analysis Results:", analysisResult);
```

## Success Metrics

The module aims to achieve the following success metrics as specified in the requirements:

- **Hotspot Detection**: >90% critical bottlenecks found
- **Optimization Impact**: >30% performance improvement potential  
- **Resource Efficiency**: Zero memory leaks detected

## Contributing

This module is part of the VoltAgent ecosystem. For contributing guidelines, please refer to the main VoltAgent repository.

## License

MIT License - see the main VoltAgent repository for details.

