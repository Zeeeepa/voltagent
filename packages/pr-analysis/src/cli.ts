#!/usr/bin/env node

/**
 * CLI tool for running compliance analysis
 */

import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import { analyzeCompliance } from './index.js';

interface CLIOptions {
  path: string;
  output?: 'json' | 'text';
  severity?: 'low' | 'medium' | 'high';
  autoFix?: boolean;
  exclude?: string[];
  include?: string[];
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);
  
  try {
    console.log('🔍 Starting compliance analysis...\n');
    
    // Find files to analyze
    const files = await findFiles(options);
    console.log(`📁 Found ${files.length} files to analyze\n`);
    
    if (files.length === 0) {
      console.log('❌ No files found to analyze');
      process.exit(1);
    }

    // Run analysis
    const result = await analyzeCompliance(files);
    
    // Filter by severity if specified
    let findings = result.findings;
    if (options.severity) {
      const severityLevels = { low: 1, medium: 2, high: 3 };
      const minLevel = severityLevels[options.severity];
      findings = findings.filter(f => severityLevels[f.severity] >= minLevel);
    }

    // Output results
    if (options.output === 'json') {
      console.log(JSON.stringify({ ...result, findings }, null, 2));
    } else {
      displayTextResults(result, findings, options);
    }

    // Exit with appropriate code
    const hasHighSeverity = findings.some(f => f.severity === 'high');
    const hasMediumSeverity = findings.some(f => f.severity === 'medium');
    
    if (hasHighSeverity) {
      process.exit(2); // High severity issues
    } else if (hasMediumSeverity) {
      process.exit(1); // Medium severity issues
    } else {
      process.exit(0); // Success or only low severity
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(3);
  }
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    path: '.',
    output: 'text'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--path':
      case '-p':
        options.path = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i] as 'json' | 'text';
        break;
      case '--severity':
      case '-s':
        options.severity = args[++i] as 'low' | 'medium' | 'high';
        break;
      case '--auto-fix':
        options.autoFix = true;
        break;
      case '--exclude':
        options.exclude = args[++i].split(',');
        break;
      case '--include':
        options.include = args[++i].split(',');
        break;
      default:
        if (!arg.startsWith('-')) {
          options.path = arg;
        }
    }
  }

  return options;
}

async function findFiles(options: CLIOptions): Promise<Array<{path: string, content: string}>> {
  const includePatterns = options.include || [
    '**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx',
    '**/*.py', '**/*.go', '**/*.java', '**/*.cs',
    '**/package.json', '**/LICENSE', '**/README.md'
  ];

  const excludePatterns = options.exclude || [
    'node_modules/**', 'dist/**', 'build/**', 
    'coverage/**', '.git/**', '*.min.js'
  ];

  const files: Array<{path: string, content: string}> = [];

  for (const pattern of includePatterns) {
    const matches = await glob(pattern, {
      cwd: options.path,
      ignore: excludePatterns,
      nodir: true
    });

    for (const match of matches) {
      const fullPath = `${options.path}/${match}`;
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          files.push({ path: match, content });
        } catch (error) {
          console.warn(`⚠️  Could not read file: ${match}`);
        }
      }
    }
  }

  return files;
}

function displayTextResults(result: any, findings: any[], options: CLIOptions) {
  console.log('📊 Compliance Analysis Results');
  console.log('================================\n');
  
  console.log(`Module: ${result.module}`);
  console.log(`Overall Severity: ${result.severity.toUpperCase()}`);
  console.log(`Files Analyzed: ${result.metadata?.filesAnalyzed || 0}`);
  console.log(`Total Issues: ${findings.length}`);
  console.log(`Execution Time: ${result.metadata?.executionTime || 0}ms\n`);

  if (findings.length === 0) {
    console.log('✅ No compliance issues found!\n');
    return;
  }

  // Group by severity
  const bySeverity = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Issues by Severity:');
  if (bySeverity.high) console.log(`  🔴 High: ${bySeverity.high}`);
  if (bySeverity.medium) console.log(`  🟡 Medium: ${bySeverity.medium}`);
  if (bySeverity.low) console.log(`  🟢 Low: ${bySeverity.low}`);
  console.log();

  // Group by type
  const byType = findings.reduce((acc, finding) => {
    acc[finding.type] = (acc[finding.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Issues by Type:');
  Object.entries(byType)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  console.log();

  // Show detailed findings
  console.log('Detailed Issues:');
  console.log('================\n');

  findings.forEach((finding, index) => {
    const severityIcon = finding.severity === 'high' ? '🔴' : 
                        finding.severity === 'medium' ? '🟡' : '🟢';
    
    console.log(`${index + 1}. ${severityIcon} ${finding.type.toUpperCase()}`);
    console.log(`   File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
    console.log(`   Message: ${finding.message}`);
    
    if (finding.suggestion) {
      console.log(`   💡 Suggestion: ${finding.suggestion}`);
    }
    
    if (finding.autoFixable) {
      console.log(`   🔧 Auto-fixable`);
    }
    
    if (finding.context) {
      console.log(`   📝 Context:`, finding.context);
    }
    
    console.log();
  });

  // Auto-fix summary
  const autoFixable = findings.filter(f => f.autoFixable);
  if (autoFixable.length > 0) {
    console.log(`🔧 ${autoFixable.length} issues can be auto-fixed`);
    if (options.autoFix) {
      console.log('   Auto-fix feature coming soon!');
    } else {
      console.log('   Run with --auto-fix to automatically fix these issues');
    }
    console.log();
  }

  // Compliance score
  const score = Math.max(0, 100 - (findings.length * 5));
  console.log(`📊 Compliance Score: ${score}%`);
  
  if (score >= 90) {
    console.log('✅ Excellent compliance!');
  } else if (score >= 70) {
    console.log('⚠️  Good compliance, minor issues to address');
  } else {
    console.log('❌ Poor compliance, significant issues need attention');
  }
}

function showHelp() {
  console.log(`
🔍 Compliance Analysis CLI

Usage: compliance-analyzer [options] [path]

Options:
  -p, --path <path>        Path to analyze (default: current directory)
  -o, --output <format>    Output format: text|json (default: text)
  -s, --severity <level>   Minimum severity: low|medium|high
  --auto-fix              Automatically fix issues where possible
  --include <patterns>     Comma-separated include patterns
  --exclude <patterns>     Comma-separated exclude patterns
  -h, --help              Show this help message

Examples:
  compliance-analyzer                           # Analyze current directory
  compliance-analyzer src/                      # Analyze src directory
  compliance-analyzer --output json            # JSON output
  compliance-analyzer --severity high          # Only high severity issues
  compliance-analyzer --include "**/*.ts"      # Only TypeScript files
  compliance-analyzer --exclude "test/**"      # Exclude test files

Exit Codes:
  0 - Success (no issues or only low severity)
  1 - Medium severity issues found
  2 - High severity issues found
  3 - Analysis failed
`);
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runCLI };

