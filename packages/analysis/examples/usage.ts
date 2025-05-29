import { 
  AccessControlAnalyzer, 
  AnalyzerFactory, 
  createAnalysisContext,
  mergeAnalysisResults,
  createSummaryReport 
} from '../src';

/**
 * Example usage of the Access Control Analyzer
 */
async function runSecurityAnalysis() {
  // Create analyzer instance
  const analyzer = new AccessControlAnalyzer();
  
  // Or use the factory
  const factoryAnalyzer = AnalyzerFactory.createAnalyzer('access_control');
  
  // Sample code to analyze
  const sampleFiles = [
    {
      path: 'routes/admin.js',
      content: `
        const express = require('express');
        const router = express.Router();
        
        // Unprotected admin route - should be flagged
        router.get('/admin/users', (req, res) => {
          res.json({ users: getAllUsers() });
        });
        
        // Protected route - should be OK
        router.get('/admin/settings', authenticateToken, requireAdmin, (req, res) => {
          res.json({ settings: getSettings() });
        });
        
        // Hardcoded secret - should be flagged
        const API_KEY = "sk-1234567890abcdef";
      `
    },
    {
      path: 'auth/middleware.js',
      content: `
        const jwt = require('jsonwebtoken');
        
        function authenticateToken(req, res, next) {
          const token = req.headers['authorization'];
          if (!token) return res.sendStatus(401);
          
          // JWT without expiration - should be flagged
          jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
          });
        }
        
        function requireAdmin(req, res, next) {
          // Weak role check - should be flagged
          if (req.user.role === "admin") {
            next();
          } else {
            res.sendStatus(403);
          }
        }
      `
    },
    {
      path: 'routes/api.js',
      content: `
        const express = require('express');
        const app = express();
        
        // Missing CSRF protection - should be flagged
        app.post('/api/transfer-money', (req, res) => {
          const { amount, toAccount } = req.body;
          transferMoney(req.user.id, toAccount, amount);
          res.json({ success: true });
        });
        
        // Privilege escalation risk - should be flagged
        app.put('/api/user/profile', (req, res) => {
          const user = req.user;
          user.role = req.body.role; // User can set their own role!
          user.save();
          res.json({ user });
        });
      `
    }
  ];

  // Create analysis contexts
  const contexts = sampleFiles.map(file => 
    createAnalysisContext(file.path, file.content, {
      framework: 'express',
      language: 'javascript'
    })
  );

  console.log('🔍 Running Access Control Analysis...\n');

  // Run analysis
  const result = await analyzer.analyze(contexts);

  // Display results
  console.log('📊 Analysis Results:');
  console.log(`Module: ${result.module}`);
  console.log(`Overall Severity: ${result.severity.toUpperCase()}`);
  console.log(`Total Findings: ${result.findings.length}`);
  console.log(`Files Analyzed: ${result.metadata?.filesAnalyzed}`);
  console.log(`Analysis Time: ${result.metadata?.analysisTime}ms\n`);

  // Group findings by severity
  const findingsBySeverity = result.findings.reduce((acc, finding) => {
    const severity = finding.severity || 'medium';
    if (!acc[severity]) acc[severity] = [];
    acc[severity].push(finding);
    return acc;
  }, {} as Record<string, typeof result.findings>);

  // Display findings by severity
  for (const [severity, findings] of Object.entries(findingsBySeverity)) {
    console.log(`🚨 ${severity.toUpperCase()} SEVERITY (${findings.length} findings):`);
    
    findings.forEach((finding, index) => {
      console.log(`  ${index + 1}. ${finding.type.replace(/_/g, ' ').toUpperCase()}`);
      console.log(`     File: ${finding.file}`);
      if (finding.line) console.log(`     Line: ${finding.line}`);
      if (finding.endpoint) console.log(`     Endpoint: ${finding.endpoint}`);
      if (finding.function) console.log(`     Function: ${finding.function}`);
      console.log(`     Risk: ${finding.risk}`);
      console.log(`     Suggestion: ${finding.suggestion}`);
      if (finding.description) console.log(`     Description: ${finding.description}`);
      console.log('');
    });
  }

  // Create summary report
  const summary = createSummaryReport([result]);
  
  console.log('📈 Summary Report:');
  console.log(`Total Findings: ${summary.totalFindings}`);
  console.log('Severity Breakdown:', summary.severityBreakdown);
  console.log('Top Risks:', summary.topRisks.slice(0, 3));
  console.log('Key Recommendations:');
  summary.recommendations.slice(0, 5).forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });

  // Export to JSON
  console.log('\n💾 JSON Export:');
  console.log(JSON.stringify(result, null, 2));

  return result;
}

/**
 * Example of running multiple analyzers
 */
async function runMultipleAnalyzers() {
  console.log('🔄 Running Multiple Security Analyzers...\n');
  
  // Get all security analyzers
  const securityAnalyzers = AnalyzerFactory.createSecurityAnalyzers();
  
  const sampleContext = createAnalysisContext(
    'app.js',
    `
      const express = require('express');
      const app = express();
      
      // Multiple security issues
      app.get('/admin/users', (req, res) => {
        const password = "hardcoded_password_123";
        res.json({ users: [] });
      });
    `,
    { framework: 'express' }
  );

  const results = [];
  
  for (const analyzer of securityAnalyzers) {
    console.log(`Running ${analyzer.name}...`);
    const result = await analyzer.analyze([sampleContext]);
    results.push(result);
  }

  // Merge all results
  const mergedResult = mergeAnalysisResults(results);
  
  console.log('\n🔗 Merged Analysis Results:');
  console.log(`Total Findings: ${mergedResult.findings.length}`);
  console.log(`Overall Severity: ${mergedResult.severity}`);
  
  return mergedResult;
}

// Run examples if this file is executed directly
if (require.main === module) {
  runSecurityAnalysis()
    .then(() => runMultipleAnalyzers())
    .then(() => console.log('\n✅ Analysis complete!'))
    .catch(console.error);
}

export { runSecurityAnalysis, runMultipleAnalyzers };

