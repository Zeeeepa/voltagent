#!/usr/bin/env tsx

/**
 * Test script for the Error Handling & Exception Flow Analyzer
 * 
 * This script demonstrates the analyzer's capabilities by running it
 * against the sample code files and generating reports.
 */

import { analyzeErrorHandling } from './src/index';
import { analyzeErrorHandlingTool, generateErrorHandlingReportTool } from './src/tools';
import * as fs from 'fs';
import * as path from 'path';

async function runTests() {
  console.log('🔄 Error Handling & Exception Flow Analyzer - Test Suite\n');

  try {
    // Test 1: Analyze TypeScript sample file
    console.log('📝 Test 1: Analyzing TypeScript sample file...');
    const tsFile = path.join(__dirname, 'test-files/sample-code.ts');
    const tsContent = await fs.promises.readFile(tsFile, 'utf-8');
    
    const tsResult = await analyzeErrorHandlingTool.execute({
      files: [{ path: tsFile, content: tsContent, language: 'typescript' }],
      analysis_depth: 'comprehensive'
    });

    if (tsResult.success && tsResult.analysis) {
      console.log(`✅ TypeScript Analysis Complete:`);
      console.log(`   📁 Files: ${tsResult.analysis.analyzed_files.length}`);
      console.log(`   ⚠️  Findings: ${tsResult.analysis.total_findings}`);
      console.log(`   🎯 Severity: ${tsResult.analysis.severity.toUpperCase()}`);
      console.log(`   📊 Coverage: ${tsResult.analysis.summary.coverage_percentage}%\n`);
    } else {
      console.error(`❌ TypeScript analysis failed: ${tsResult.error}\n`);
    }

    // Test 2: Analyze Python sample file
    console.log('📝 Test 2: Analyzing Python sample file...');
    const pyFile = path.join(__dirname, 'test-files/sample-code.py');
    const pyContent = await fs.promises.readFile(pyFile, 'utf-8');
    
    const pyResult = await analyzeErrorHandlingTool.execute({
      files: [{ path: pyFile, content: pyContent, language: 'python' }],
      analysis_depth: 'comprehensive'
    });

    if (pyResult.success && pyResult.analysis) {
      console.log(`✅ Python Analysis Complete:`);
      console.log(`   📁 Files: ${pyResult.analysis.analyzed_files.length}`);
      console.log(`   ⚠️  Findings: ${pyResult.analysis.total_findings}`);
      console.log(`   🎯 Severity: ${pyResult.analysis.severity.toUpperCase()}`);
      console.log(`   📊 Coverage: ${pyResult.analysis.summary.coverage_percentage}%\n`);
    } else {
      console.error(`❌ Python analysis failed: ${pyResult.error}\n`);
    }

    // Test 3: Generate comprehensive report
    if (tsResult.success && tsResult.analysis) {
      console.log('📝 Test 3: Generating Markdown report...');
      const reportResult = await generateErrorHandlingReportTool.execute({
        analysis_result: tsResult.analysis,
        format: 'markdown',
        include_code_snippets: true,
        group_by: 'severity'
      });

      if (reportResult.success) {
        console.log(`✅ Report Generated (${reportResult.format.toUpperCase()})`);
        
        // Save report to file
        const reportPath = path.join(__dirname, 'test-report.md');
        await fs.promises.writeFile(reportPath, reportResult.report);
        console.log(`   📄 Report saved to: ${reportPath}\n`);
      } else {
        console.error(`❌ Report generation failed: ${reportResult.error}\n`);
      }
    }

    // Test 4: Combined analysis
    console.log('📝 Test 4: Combined multi-language analysis...');
    const combinedResult = await analyzeErrorHandlingTool.execute({
      files: [
        { path: tsFile, content: tsContent, language: 'typescript' },
        { path: pyFile, content: pyContent, language: 'python' }
      ],
      analysis_depth: 'comprehensive'
    });

    if (combinedResult.success && combinedResult.analysis) {
      console.log(`✅ Combined Analysis Complete:`);
      console.log(`   📁 Files: ${combinedResult.analysis.analyzed_files.length}`);
      console.log(`   ⚠️  Total Findings: ${combinedResult.analysis.total_findings}`);
      console.log(`   🎯 Overall Severity: ${combinedResult.analysis.severity.toUpperCase()}`);
      console.log(`   📊 Coverage: ${combinedResult.analysis.summary.coverage_percentage}%`);
      
      console.log('\n📋 Summary Breakdown:');
      const summary = combinedResult.analysis.summary;
      console.log(`   • Missing Error Handling: ${summary.missing_error_handling}`);
      console.log(`   • Unhandled Exceptions: ${summary.unhandled_exceptions}`);
      console.log(`   • Error Propagation Issues: ${summary.error_propagation_issues}`);
      console.log(`   • Missing Recovery Mechanisms: ${summary.missing_recovery_mechanisms}`);
      console.log(`   • Inadequate Logging: ${summary.inadequate_logging}`);

      if (combinedResult.analysis.recommendations.length > 0) {
        console.log('\n💡 Top Recommendations:');
        combinedResult.analysis.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }

      // Show some example findings
      console.log('\n🔍 Example Findings:');
      const criticalFindings = combinedResult.analysis.findings
        .filter(f => f.severity === 'critical')
        .slice(0, 2);
      
      criticalFindings.forEach((finding, index) => {
        console.log(`   ${index + 1}. ${finding.type.replace(/_/g, ' ').toUpperCase()}`);
        console.log(`      📁 File: ${path.basename(finding.file)}`);
        console.log(`      📍 Line: ${finding.line}`);
        console.log(`      💡 Suggestion: ${finding.suggestion}`);
        if (finding.confidence) {
          console.log(`      🎯 Confidence: ${Math.round(finding.confidence * 100)}%`);
        }
        console.log('');
      });

    } else {
      console.error(`❌ Combined analysis failed: ${combinedResult.error}\n`);
    }

    console.log('🎉 Test suite completed successfully!');
    console.log('\n📚 Next Steps:');
    console.log('   • Review the generated test-report.md file');
    console.log('   • Integrate with your CI/CD pipeline');
    console.log('   • Customize patterns for your specific codebase');
    console.log('   • Set up automated PR analysis');

  } catch (error) {
    console.error(`❌ Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { runTests };

