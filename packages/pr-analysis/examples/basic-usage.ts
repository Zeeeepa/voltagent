/**
 * Basic Usage Example for Compliance Analysis Module
 */

import { ComplianceAnalysisModule, analyzeCompliance } from '../src/index.js';

async function demonstrateCompliance() {
  console.log('🔍 Compliance Analysis Demo\n');

  // Example files with various compliance issues
  const testFiles = [
    {
      path: 'src/user_service.ts',
      content: `
// Missing license header
export class user_service {
  private user_id: string;
  private api_key = "sk-1234567890abcdef";
  
  public get_user_data() {
    const query = "SELECT * FROM users WHERE id = '" + this.user_id + "'";
    return database.execute(query);
  }
}`
    },
    {
      path: 'src/utils.py',
      content: `
def createUser(userData):
    userID = userData.get('id')
    return userID

class userManager:
    def processData(self):
        pass
`
    },
    {
      path: 'package.json',
      content: `{
  "name": "test-package",
  "version": "1.0.0",
  "license": "WTFPL"
}`
    }
  ];

  try {
    // Analyze using the convenience function
    console.log('📊 Running compliance analysis...\n');
    const result = await analyzeCompliance(testFiles);

    // Display results
    console.log(`📋 Analysis Results:`);
    console.log(`   Module: ${result.module}`);
    console.log(`   Severity: ${result.severity.toUpperCase()}`);
    console.log(`   Files Analyzed: ${result.metadata?.filesAnalyzed}`);
    console.log(`   Total Findings: ${result.findings.length}`);
    console.log(`   Execution Time: ${result.metadata?.executionTime}ms\n`);

    // Group findings by type
    const findingsByType = result.findings.reduce((acc, finding) => {
      acc[finding.type] = (acc[finding.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Findings by Type:');
    Object.entries(findingsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    console.log('\n🔍 Detailed Findings:');
    result.findings.forEach((finding, index) => {
      console.log(`\n${index + 1}. ${finding.type.toUpperCase()}`);
      console.log(`   File: ${finding.file}`);
      if (finding.line) console.log(`   Line: ${finding.line}`);
      console.log(`   Severity: ${finding.severity}`);
      console.log(`   Message: ${finding.message}`);
      if (finding.suggestion) console.log(`   Suggestion: ${finding.suggestion}`);
      if (finding.autoFixable) console.log(`   ✅ Auto-fixable`);
      if (finding.context) {
        console.log(`   Context:`, finding.context);
      }
    });

    // Demonstrate module configuration
    console.log('\n⚙️  Module Configuration:');
    const module = new ComplianceAnalysisModule();
    const config = module.getConfiguration();
    console.log(`   Enabled: ${config.enabled}`);
    console.log(`   Rules: ${Object.keys(config.rules).length} configured`);
    console.log(`   Include Patterns: ${config.includePatterns.length}`);
    console.log(`   Exclude Patterns: ${config.excludePatterns.length}`);

    // Show auto-fixable issues
    const autoFixable = result.findings.filter(f => f.autoFixable);
    console.log(`\n🔧 Auto-fixable Issues: ${autoFixable.length}/${result.findings.length}`);
    
    if (autoFixable.length > 0) {
      console.log('   Auto-fix suggestions:');
      autoFixable.forEach(finding => {
        console.log(`   - ${finding.file}:${finding.line} - ${finding.suggestion}`);
      });
    }

    // Security findings summary
    const securityFindings = result.findings.filter(f => 
      f.rule?.includes('security') || 
      f.type.includes('hardcoded') || 
      f.type.includes('sql_injection') ||
      f.type.includes('insecure')
    );

    if (securityFindings.length > 0) {
      console.log(`\n🛡️  Security Issues Found: ${securityFindings.length}`);
      console.log('   ⚠️  These require immediate attention!');
      securityFindings.forEach(finding => {
        console.log(`   - ${finding.file}: ${finding.message}`);
      });
    }

    // Compliance summary
    console.log('\n📊 Compliance Summary:');
    const complianceScore = Math.max(0, 100 - (result.findings.length * 5));
    console.log(`   Compliance Score: ${complianceScore}%`);
    
    if (complianceScore >= 90) {
      console.log('   ✅ Excellent compliance!');
    } else if (complianceScore >= 70) {
      console.log('   ⚠️  Good compliance, minor issues to address');
    } else {
      console.log('   ❌ Poor compliance, significant issues need attention');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the demonstration
demonstrateCompliance().catch(console.error);

