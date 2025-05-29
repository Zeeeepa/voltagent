/**
 * Example usage of the Complexity Analysis Module
 * 
 * This file demonstrates how to use the complexity analysis tools
 * in various scenarios.
 */

import {
  ComplexityAnalyzer,
  analyzeFileComplexity,
  analyzeProjectComplexity,
  createComplexityAnalyzer,
  complexityAnalysisTools,
} from './index';

// Example 1: Quick file analysis
async function quickFileAnalysis() {
  console.log('=== Quick File Analysis ===');
  
  try {
    const findings = await analyzeFileComplexity('./src/example-file.ts');
    
    console.log(`Found ${findings.length} complexity issues:`);
    findings.forEach(finding => {
      console.log(`- ${finding.function} in ${finding.file}:`);
      console.log(`  Cyclomatic: ${finding.metrics.cyclomatic_complexity}`);
      console.log(`  Cognitive: ${finding.metrics.cognitive_complexity}`);
      console.log(`  Priority: ${finding.refactor_priority}`);
      console.log(`  Suggestion: ${finding.suggestion}`);
    });
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

// Example 2: Project-wide analysis with custom config
async function projectAnalysisWithConfig() {
  console.log('\n=== Project Analysis with Custom Config ===');
  
  const analyzer = createComplexityAnalyzer({
    thresholds: {
      cyclomatic: { warning: 8, critical: 12 },
      cognitive: { warning: 12, critical: 20 },
      lines_of_code: { warning: 40, critical: 80 },
      nesting_depth: { warning: 3, critical: 5 },
      parameter_count: { warning: 4, critical: 6 },
    },
    exclude_patterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/examples/**', // Exclude examples
    ],
  });

  try {
    const result = await analyzer.analyzeProject('./src');
    
    console.log('Analysis Summary:');
    console.log(`- Total functions analyzed: ${result.summary.total_functions}`);
    console.log(`- Functions with issues: ${result.summary.functions_with_issues}`);
    console.log(`- Average complexity: ${result.summary.average_complexity}`);
    console.log(`- Highest complexity: ${result.summary.highest_complexity}`);
    console.log(`- Total technical debt: ${result.summary.total_technical_debt}`);
    console.log(`- Overall severity: ${result.severity}`);

    // Show top 5 most complex functions
    const sortedFindings = result.findings
      .sort((a, b) => b.technical_debt_score - a.technical_debt_score)
      .slice(0, 5);

    console.log('\nTop 5 Most Complex Functions:');
    sortedFindings.forEach((finding, index) => {
      console.log(`${index + 1}. ${finding.function} (${finding.file})`);
      console.log(`   Technical Debt Score: ${finding.technical_debt_score}`);
      console.log(`   Cyclomatic: ${finding.metrics.cyclomatic_complexity}, Cognitive: ${finding.metrics.cognitive_complexity}`);
      console.log(`   Suggestion: ${finding.suggestion}`);
    });

  } catch (error) {
    console.error('Project analysis failed:', error);
  }
}

// Example 3: Filtering and recommendations
async function getRecommendations() {
  console.log('\n=== Getting Refactoring Recommendations ===');
  
  try {
    const result = await analyzeProjectComplexity('./src');
    
    // Get high-priority recommendations
    const highPriorityFindings = result.findings.filter(
      finding => ['high', 'critical'].includes(finding.refactor_priority)
    );

    console.log(`Found ${highPriorityFindings.length} high-priority issues:`);
    
    highPriorityFindings.forEach(finding => {
      console.log(`\n📍 ${finding.function} (${finding.file}:${finding.line_start}-${finding.line_end})`);
      console.log(`   Priority: ${finding.refactor_priority.toUpperCase()}`);
      console.log(`   Issues: ${finding.thresholds_exceeded.join(', ')}`);
      console.log(`   💡 ${finding.suggestion}`);
      
      // Show specific metrics that exceeded thresholds
      if (finding.thresholds_exceeded.includes('cyclomatic')) {
        console.log(`   ⚠️  Cyclomatic complexity: ${finding.metrics.cyclomatic_complexity} (threshold: ${result.thresholds.cyclomatic.warning})`);
      }
      if (finding.thresholds_exceeded.includes('cognitive')) {
        console.log(`   ⚠️  Cognitive complexity: ${finding.metrics.cognitive_complexity} (threshold: ${result.thresholds.cognitive.warning})`);
      }
      if (finding.thresholds_exceeded.includes('lines_of_code')) {
        console.log(`   ⚠️  Lines of code: ${finding.metrics.lines_of_code} (threshold: ${result.thresholds.lines_of_code.warning})`);
      }
    });

  } catch (error) {
    console.error('Recommendations analysis failed:', error);
  }
}

// Example 4: Trend analysis (simulated)
async function trendAnalysis() {
  console.log('\n=== Complexity Trend Analysis ===');
  
  try {
    // Simulate analyzing the same codebase at different points in time
    const currentResult = await analyzeProjectComplexity('./src');
    
    // In a real scenario, you would compare with historical data
    console.log('Current Complexity Metrics:');
    console.log(`- Average Complexity: ${currentResult.summary.average_complexity}`);
    console.log(`- Total Technical Debt: ${currentResult.summary.total_technical_debt}`);
    console.log(`- Functions with Issues: ${currentResult.summary.functions_with_issues}/${currentResult.summary.total_functions}`);
    
    // Simulate trend data
    const simulatedPreviousMetrics = {
      average_complexity: currentResult.summary.average_complexity * 1.2,
      total_technical_debt: currentResult.summary.total_technical_debt * 1.15,
      functions_with_issues: Math.floor(currentResult.summary.functions_with_issues * 1.1),
    };
    
    console.log('\nTrend Analysis (vs. previous analysis):');
    const complexityChange = ((currentResult.summary.average_complexity - simulatedPreviousMetrics.average_complexity) / simulatedPreviousMetrics.average_complexity * 100).toFixed(1);
    const debtChange = ((currentResult.summary.total_technical_debt - simulatedPreviousMetrics.total_technical_debt) / simulatedPreviousMetrics.total_technical_debt * 100).toFixed(1);
    
    console.log(`- Average Complexity: ${complexityChange}% ${Number(complexityChange) < 0 ? '📉 (improved)' : '📈 (increased)'}`);
    console.log(`- Technical Debt: ${debtChange}% ${Number(debtChange) < 0 ? '📉 (reduced)' : '📈 (increased)'}`);
    
  } catch (error) {
    console.error('Trend analysis failed:', error);
  }
}

// Example 5: Integration with VoltAgent tools
function demonstrateToolIntegration() {
  console.log('\n=== VoltAgent Tool Integration ===');
  
  console.log('Available complexity analysis tools:');
  complexityAnalysisTools.forEach(tool => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });
  
  console.log('\nExample tool usage in agent:');
  console.log(`
import { createAgent } from '@voltagent/core';
import { complexityAnalysisTools } from '@voltagent/core';

const codeAnalyzerAgent = createAgent({
  name: 'code-analyzer',
  description: 'Analyzes code complexity and provides refactoring suggestions',
  tools: complexityAnalysisTools,
  // ... other configuration
});

// Agent can now respond to prompts like:
// "Analyze the complexity of ./src/api/handlers.ts"
// "What are the most complex functions in this project?"
// "Give me refactoring recommendations for high-priority issues"
  `);
}

// Run all examples
async function runExamples() {
  console.log('🔍 VoltAgent Complexity Analysis Examples\n');
  
  await quickFileAnalysis();
  await projectAnalysisWithConfig();
  await getRecommendations();
  await trendAnalysis();
  demonstrateToolIntegration();
  
  console.log('\n✅ All examples completed!');
}

// Export for use in other files
export {
  quickFileAnalysis,
  projectAnalysisWithConfig,
  getRecommendations,
  trendAnalysis,
  demonstrateToolIntegration,
  runExamples,
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

