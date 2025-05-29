/**
 * Basic usage example for VoltAgent Security Analysis Module
 */

import { 
  SecurityAnalyzer, 
  securityAnalysisToolkit,
  OWASP_TOP_10_PATTERNS 
} from '@voltagent/security-analysis';

async function basicAnalysisExample() {
  console.log('🔒 VoltAgent Security Analysis Example\n');

  // Create analyzer instance
  const analyzer = new SecurityAnalyzer();

  // Example 1: Analyze vulnerable code content
  console.log('📝 Example 1: Analyzing vulnerable code content');
  const vulnerableCode = `
    // Vulnerable authentication function
    function authenticateUser(username, password) {
      // SQL Injection vulnerability
      const query = "SELECT * FROM users WHERE username = '" + username + 
                   "' AND password = '" + password + "'";
      
      // Hardcoded secret
      const apiKey = "sk-1234567890abcdef";
      
      // Command injection vulnerability
      const result = exec("grep " + username + " /var/log/auth.log");
      
      // XSS vulnerability
      document.getElementById('welcome').innerHTML = "Welcome " + username;
      
      return database.execute(query);
    }
  `;

  const result = await analyzer.analyzeContent(vulnerableCode, 'auth.js');
  
  console.log(`✅ Analysis complete!`);
  console.log(`📊 Found ${result.total_vulnerabilities} vulnerabilities`);
  console.log(`⚠️  Overall severity: ${result.severity}`);
  console.log(`🎯 OWASP categories covered: ${result.owasp_coverage.join(', ')}\n`);

  // Display findings
  console.log('🔍 Detailed findings:');
  result.findings.forEach((finding, index) => {
    console.log(`\n${index + 1}. ${finding.vulnerability}`);
    console.log(`   Type: ${finding.type}`);
    console.log(`   Risk Level: ${finding.risk_level}`);
    console.log(`   Line: ${finding.line}`);
    console.log(`   Confidence: ${finding.confidence}%`);
    console.log(`   OWASP: ${finding.owasp_category}`);
    console.log(`   CWE: ${finding.cwe_id}`);
    console.log(`   💡 Suggestion: ${finding.suggestion}`);
    if (finding.evidence) {
      console.log(`   📋 Evidence: ${finding.evidence.substring(0, 50)}...`);
    }
  });

  // Example 2: Get available security patterns
  console.log('\n\n📋 Example 2: Available Security Patterns');
  console.log(`Total patterns: ${OWASP_TOP_10_PATTERNS.length}`);
  
  const criticalPatterns = OWASP_TOP_10_PATTERNS.filter(p => p.risk_level === 'critical');
  console.log(`Critical risk patterns: ${criticalPatterns.length}`);
  
  console.log('\nCritical patterns:');
  criticalPatterns.forEach(pattern => {
    console.log(`- ${pattern.name} (${pattern.owasp_category})`);
  });

  // Example 3: Analyze with custom options
  console.log('\n\n⚙️  Example 3: Analysis with custom options');
  const customResult = await analyzer.analyzeContent(vulnerableCode, 'auth.js', {
    confidenceThreshold: 80,
    enabledDetectors: ['owasp-a03-sql-injection', 'owasp-a06-hardcoded-secrets']
  });

  console.log(`Filtered results: ${customResult.total_vulnerabilities} vulnerabilities`);
  console.log(`High-confidence findings only (>80% confidence)`);

  // Example 4: Summary statistics
  console.log('\n\n📈 Example 4: Summary Statistics');
  console.log('Risk Level Distribution:');
  console.log(`- Critical: ${result.summary.critical}`);
  console.log(`- High: ${result.summary.high}`);
  console.log(`- Medium: ${result.summary.medium}`);
  console.log(`- Low: ${result.summary.low}`);
  
  console.log(`\n⏱️  Scan duration: ${result.scan_duration_ms}ms`);
  console.log(`📁 Files scanned: ${result.total_files_scanned}`);
}

async function voltAgentToolExample() {
  console.log('\n\n🤖 VoltAgent Tool Integration Example\n');

  // Example of using the security analysis tools
  const tools = securityAnalysisToolkit;

  // Simulate tool usage (in real VoltAgent, this would be called by the agent)
  console.log('🔧 Available tools:');
  console.log('- analyzeFile: Analyze a single file');
  console.log('- analyzeContent: Analyze source code content');
  console.log('- analyzeDirectory: Analyze entire directories');
  console.log('- getPatterns: Get security pattern information');

  // Example tool execution
  const toolResult = await tools.analyzeContent.execute({
    content: 'const password = "hardcoded123";',
    filePath: 'example.js'
  });

  console.log('\n📊 Tool execution result:');
  console.log(`Success: ${toolResult.success}`);
  console.log(`Summary: ${toolResult.summary}`);
  console.log(`Vulnerabilities found: ${toolResult.result.total_vulnerabilities}`);
}

async function patternInformationExample() {
  console.log('\n\n🎯 Security Pattern Information Example\n');

  // Group patterns by OWASP category
  const patternsByCategory = OWASP_TOP_10_PATTERNS.reduce((acc, pattern) => {
    if (!acc[pattern.owasp_category]) {
      acc[pattern.owasp_category] = [];
    }
    acc[pattern.owasp_category].push(pattern);
    return acc;
  }, {} as Record<string, typeof OWASP_TOP_10_PATTERNS>);

  console.log('📋 Patterns by OWASP Category:');
  Object.entries(patternsByCategory).forEach(([category, patterns]) => {
    console.log(`\n${category}:`);
    patterns.forEach(pattern => {
      console.log(`  - ${pattern.name} (${pattern.risk_level} risk, ${pattern.confidence}% confidence)`);
    });
  });

  // Show supported languages
  const allLanguages = new Set<string>();
  OWASP_TOP_10_PATTERNS.forEach(pattern => {
    pattern.file_extensions.forEach(ext => allLanguages.add(ext));
  });

  console.log(`\n🌐 Supported file extensions: ${Array.from(allLanguages).join(', ')}`);
}

// Run examples
async function runExamples() {
  try {
    await basicAnalysisExample();
    await voltAgentToolExample();
    await patternInformationExample();
    
    console.log('\n\n✅ All examples completed successfully!');
    console.log('🚀 Ready to integrate with your VoltAgent workflow!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  runExamples();
}

export { runExamples };

