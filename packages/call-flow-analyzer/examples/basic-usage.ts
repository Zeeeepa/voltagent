/**
 * Basic usage example for @voltagent/call-flow-analyzer
 */

import {
  CallFlowAnalyzer,
  analyzeCallFlow,
  getCallFlowAnalysisTools,
  FindingType,
  Severity,
} from '../src';

async function basicAnalysisExample() {
  console.log('🔍 Basic Call Flow Analysis Example\n');

  // Quick analysis using the convenience function
  try {
    const result = await analyzeCallFlow('./src');
    
    console.log(`📊 Analysis Results:`);
    console.log(`   Files analyzed: ${result.files_analyzed}`);
    console.log(`   Functions analyzed: ${result.functions_analyzed}`);
    console.log(`   Analysis time: ${result.analysis_duration_ms}ms`);
    console.log(`   Overall severity: ${result.severity}`);
    console.log(`   Coverage: ${result.statistics.coverage_percentage.toFixed(2)}%\n`);

    // Display findings by type
    const findingsByType = result.findings.reduce((acc, finding) => {
      acc[finding.type] = (acc[finding.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📋 Findings by Type:');
    Object.entries(findingsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Show high-confidence unreachable code findings
    const unreachableCode = result.findings.filter(
      f => f.type === FindingType.UNREACHABLE_CODE && (f.confidence || 0) > 0.8
    );

    if (unreachableCode.length > 0) {
      console.log('\n🚨 High-Confidence Unreachable Code:');
      unreachableCode.forEach(finding => {
        console.log(`   ${finding.file}:${finding.lines} - ${finding.suggestion}`);
      });
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

async function advancedAnalysisExample() {
  console.log('\n🔧 Advanced Call Flow Analysis Example\n');

  // Create analyzer with custom configuration
  const analyzer = new CallFlowAnalyzer({
    maxCallDepth: 100,
    includeExternalDeps: false,
    excludePatterns: [
      '**/*.test.ts',
      '**/*.spec.ts',
      'node_modules/**',
      'dist/**',
    ],
    confidenceThreshold: 0.85,
    generateVisualization: true,
  });

  try {
    const result = await analyzer.analyze('./src');

    console.log('🎯 Advanced Analysis Results:');
    console.log(`   High-confidence findings: ${result.findings.filter(f => (f.confidence || 0) > 0.85).length}`);
    
    // Performance bottlenecks
    const bottlenecks = result.findings.filter(f => f.type === FindingType.PERFORMANCE_BOTTLENECK);
    if (bottlenecks.length > 0) {
      console.log('\n⚡ Performance Bottlenecks:');
      bottlenecks.forEach(bottleneck => {
        console.log(`   ${bottleneck.file}:${bottleneck.function} - ${bottleneck.suggestion}`);
      });
    }

    // Circular dependencies
    const circular = result.findings.filter(f => f.type === FindingType.CIRCULAR_DEPENDENCY);
    if (circular.length > 0) {
      console.log('\n🔄 Circular Dependencies:');
      circular.forEach(dep => {
        console.log(`   ${dep.suggestion}`);
      });
    }

    // Call chain analysis
    if (result.call_chain_analysis) {
      console.log('\n📈 Call Chain Analysis:');
      console.log(`   Entry point: ${result.call_chain_analysis.entry_point}`);
      console.log(`   Max depth: ${result.call_chain_analysis.max_depth}`);
      console.log(`   Total functions: ${result.call_chain_analysis.total_functions}`);
      
      if (result.call_chain_analysis.bottlenecks.length > 0) {
        console.log(`   Bottlenecks: ${result.call_chain_analysis.bottlenecks.join(', ')}`);
      }
      
      if (result.call_chain_analysis.optimization_opportunities.length > 0) {
        console.log(`   Optimization opportunities: ${result.call_chain_analysis.optimization_opportunities.join(', ')}`);
      }
    }

  } catch (error) {
    console.error('❌ Advanced analysis failed:', error);
  }
}

async function voltAgentIntegrationExample() {
  console.log('\n🤖 VoltAgent Integration Example\n');

  // Get all available tools
  const tools = getCallFlowAnalysisTools();
  
  console.log('🛠️ Available Tools:');
  tools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });

  // Example of using tools programmatically
  const analyzeCallFlowTool = tools.find(t => t.name === 'analyze_call_flow');
  const detectUnreachableCodeTool = tools.find(t => t.name === 'detect_unreachable_code');

  if (analyzeCallFlowTool) {
    try {
      console.log('\n🔍 Using analyze_call_flow tool:');
      const result = await analyzeCallFlowTool.execute({
        targetPath: './src',
        config: {
          maxCallDepth: 50,
          confidenceThreshold: 0.8,
        },
      });

      if (result.success) {
        console.log(`   ✅ Analysis completed: ${result.summary?.findingsCount} findings`);
      } else {
        console.log(`   ❌ Analysis failed: ${result.error}`);
      }
    } catch (error) {
      console.error('   ❌ Tool execution failed:', error);
    }
  }

  if (detectUnreachableCodeTool) {
    try {
      console.log('\n🔍 Using detect_unreachable_code tool:');
      const result = await detectUnreachableCodeTool.execute({
        targetPath: './src',
        confidenceThreshold: 0.9,
      });

      if (result.success) {
        console.log(`   ✅ Unreachable code detection: ${result.summary?.totalFindings} findings`);
        if (result.summary?.affectedFiles) {
          console.log(`   📁 Affected files: ${result.summary.affectedFiles}`);
        }
      } else {
        console.log(`   ❌ Detection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('   ❌ Tool execution failed:', error);
    }
  }
}

async function visualizationExample() {
  console.log('\n📊 Visualization Example\n');

  const tools = getCallFlowAnalysisTools();
  const visualizationTool = tools.find(t => t.name === 'generate_call_flow_visualization');

  if (visualizationTool) {
    try {
      // Generate Mermaid diagram
      console.log('🎨 Generating Mermaid visualization:');
      const mermaidResult = await visualizationTool.execute({
        targetPath: './src',
        format: 'mermaid',
        maxNodes: 10,
      });

      if (mermaidResult.success) {
        console.log('   ✅ Mermaid diagram generated');
        console.log('   📊 Preview:');
        console.log(mermaidResult.visualization.split('\n').slice(0, 5).join('\n'));
        console.log('   ...');
      }

      // Generate JSON visualization
      console.log('\n🎨 Generating JSON visualization:');
      const jsonResult = await visualizationTool.execute({
        targetPath: './src',
        format: 'json',
        maxNodes: 5,
      });

      if (jsonResult.success) {
        console.log('   ✅ JSON visualization generated');
        console.log(`   📊 Nodes: ${jsonResult.visualization.nodes?.length || 0}`);
        console.log(`   📊 Edges: ${jsonResult.visualization.edges?.length || 0}`);
      }

    } catch (error) {
      console.error('   ❌ Visualization generation failed:', error);
    }
  }
}

// Run examples
async function runExamples() {
  console.log('🌊 Call Flow Analyzer Examples\n');
  console.log('=' .repeat(50));

  await basicAnalysisExample();
  await advancedAnalysisExample();
  await voltAgentIntegrationExample();
  await visualizationExample();

  console.log('\n' + '='.repeat(50));
  console.log('✨ Examples completed!');
}

// Export for use in other files
export {
  basicAnalysisExample,
  advancedAnalysisExample,
  voltAgentIntegrationExample,
  visualizationExample,
  runExamples,
};

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

