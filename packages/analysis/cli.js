#!/usr/bin/env node

/**
 * Simple CLI to test the Access Control Analyzer
 * This is a basic JavaScript version for testing without TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

// Simple analyzer implementation for testing
class SimpleAccessControlAnalyzer {
  constructor() {
    this.name = 'access_control_analyzer';
    this.version = '1.0.0';
  }

  async analyze(contexts) {
    const startTime = Date.now();
    const findings = [];
    let totalLines = 0;
    let filesAnalyzed = 0;

    for (const context of contexts) {
      if (this.shouldAnalyzeFile(context)) {
        const fileFindings = this.analyzeFile(context);
        findings.push(...fileFindings);
        totalLines += context.content.split('\n').length;
        filesAnalyzed++;
      }
    }

    const analysisTime = Date.now() - startTime;
    const severity = this.calculateOverallSeverity(findings);

    return {
      module: 'access_control_analysis',
      severity,
      findings,
      metadata: {
        analysisTime,
        filesAnalyzed,
        totalLines,
        coverage: this.calculateCoverage(contexts, findings),
      },
    };
  }

  shouldAnalyzeFile(context) {
    const relevantExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.php', '.rb'];
    const hasRelevantExtension = relevantExtensions.some(ext => context.filePath.endsWith(ext));
    
    const isTestFile = /\.(test|spec)\.(js|ts|jsx|tsx)$/i.test(context.filePath);
    const isNodeModules = context.filePath.includes('node_modules');
    
    return hasRelevantExtension && !isTestFile && !isNodeModules;
  }

  analyzeFile(context) {
    const findings = [];
    const lines = context.content.split('\n');

    // Check for unprotected admin routes
    const adminRoutePattern = /(?:app\.|router\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*\/admin[^'"`]*)['"`]\s*,\s*(?!.*(?:auth|authenticate|requireAuth|isAuthenticated|verifyToken|requireRole|isAdmin))/gi;
    let match;
    while ((match = adminRoutePattern.exec(context.content)) !== null) {
      const lineNumber = this.getLineNumber(context.content, match.index);
      findings.push({
        type: 'missing_authentication',
        file: context.filePath,
        line: lineNumber,
        endpoint: `${match[1].toUpperCase()} ${match[2]}`,
        risk: 'unauthorized_admin_access',
        suggestion: 'Add authentication and admin role verification middleware',
        description: 'Admin endpoint lacks proper authentication and authorization',
        severity: 'critical',
      });
    }

    // Check for hardcoded secrets
    const secretPattern = /(?:password|secret|key|token|api_key)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi;
    while ((match = secretPattern.exec(context.content)) !== null) {
      const lineNumber = this.getLineNumber(context.content, match.index);
      findings.push({
        type: 'insecure_storage',
        file: context.filePath,
        line: lineNumber,
        risk: 'credential_exposure',
        suggestion: 'Move secrets to environment variables or secure configuration',
        description: 'Hardcoded secrets or credentials found in source code',
        severity: 'critical',
      });
    }

    // Check for unprotected API routes
    const apiRoutePattern = /(?:app\.|router\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*\/api[^'"`]*)['"`]\s*,\s*(?!.*(?:auth|authenticate|requireAuth|isAuthenticated|verifyToken))/gi;
    while ((match = apiRoutePattern.exec(context.content)) !== null) {
      const lineNumber = this.getLineNumber(context.content, match.index);
      findings.push({
        type: 'missing_authentication',
        file: context.filePath,
        line: lineNumber,
        endpoint: `${match[1].toUpperCase()} ${match[2]}`,
        risk: 'unauthorized_access',
        suggestion: 'Add authentication middleware before route handler',
        description: 'API endpoint lacks authentication protection',
        severity: 'high',
      });
    }

    // Check for weak role validation
    const weakRolePattern = /(?:user\.role|req\.user\.role|token\.role)\s*===?\s*['"`]\w+['"`]/gi;
    while ((match = weakRolePattern.exec(context.content)) !== null) {
      const lineNumber = this.getLineNumber(context.content, match.index);
      findings.push({
        type: 'weak_authorization',
        file: context.filePath,
        line: lineNumber,
        risk: 'role_bypass',
        suggestion: 'Use proper role validation with enum or constant values',
        description: 'Direct string comparison for role validation is vulnerable to bypass',
        severity: 'medium',
      });
    }

    return findings;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  calculateOverallSeverity(findings) {
    if (findings.some(f => f.severity === 'critical')) return 'critical';
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  calculateCoverage(contexts, findings) {
    const totalFiles = contexts.filter(c => this.shouldAnalyzeFile(c)).length;
    const filesWithFindings = new Set(findings.map(f => f.file)).size;
    
    if (totalFiles === 0) return 100;
    return Math.round((filesWithFindings / totalFiles) * 100);
  }
}

// CLI functionality
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node cli.js <file-or-directory>');
    console.log('Example: node cli.js ../examples/with-nextjs/');
    process.exit(1);
  }

  const target = args[0];
  const analyzer = new SimpleAccessControlAnalyzer();
  
  console.log('🔍 VoltAgent Security Analysis - Access Control Module');
  console.log('=' .repeat(60));
  
  try {
    const contexts = await loadFiles(target);
    console.log(`📁 Loaded ${contexts.length} files for analysis\n`);
    
    const result = await analyzer.analyze(contexts);
    
    console.log('📊 Analysis Results:');
    console.log(`Module: ${result.module}`);
    console.log(`Overall Severity: ${result.severity.toUpperCase()}`);
    console.log(`Total Findings: ${result.findings.length}`);
    console.log(`Files Analyzed: ${result.metadata.filesAnalyzed}`);
    console.log(`Analysis Time: ${result.metadata.analysisTime}ms`);
    console.log(`Coverage: ${result.metadata.coverage}%\n`);

    if (result.findings.length === 0) {
      console.log('✅ No security issues found!');
      return;
    }

    // Group findings by severity
    const findingsBySeverity = result.findings.reduce((acc, finding) => {
      const severity = finding.severity || 'medium';
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(finding);
      return acc;
    }, {});

    // Display findings
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    for (const severity of severityOrder) {
      const findings = findingsBySeverity[severity];
      if (!findings || findings.length === 0) continue;

      console.log(`🚨 ${severity.toUpperCase()} SEVERITY (${findings.length} findings):`);
      
      findings.forEach((finding, index) => {
        console.log(`  ${index + 1}. ${finding.type.replace(/_/g, ' ').toUpperCase()}`);
        console.log(`     File: ${finding.file}`);
        if (finding.line) console.log(`     Line: ${finding.line}`);
        if (finding.endpoint) console.log(`     Endpoint: ${finding.endpoint}`);
        console.log(`     Risk: ${finding.risk}`);
        console.log(`     Suggestion: ${finding.suggestion}`);
        console.log('');
      });
    }

    // Export JSON
    const outputFile = 'security-analysis-result.json';
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`💾 Results exported to: ${outputFile}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

async function loadFiles(target) {
  const contexts = [];
  
  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      contexts.push({
        filePath: relativePath,
        content,
        language: detectLanguage(filePath),
      });
    } catch (error) {
      console.warn(`⚠️  Could not read file: ${filePath}`);
    }
  }
  
  function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip common directories that shouldn't be analyzed
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
          continue;
        }
        processDirectory(fullPath);
      } else if (stat.isFile()) {
        processFile(fullPath);
      }
    }
  }
  
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    processDirectory(target);
  } else {
    processFile(target);
  }
  
  return contexts;
}

function detectLanguage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.java': 'java',
    '.php': 'php',
    '.rb': 'ruby',
  };
  
  return languageMap[extension] || 'unknown';
}

if (require.main === module) {
  main();
}

