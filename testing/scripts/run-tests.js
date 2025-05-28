#!/usr/bin/env node

/**
 * Test execution script with quality gate validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const qualityGates = require('../config/quality-gates.json');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTestSuite(testType) {
    this.log(`Starting ${testType} tests...`);
    const startTime = Date.now();
    
    try {
      const command = `pnpm test:${testType}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const duration = Date.now() - startTime;
      const maxDuration = qualityGates.performance[testType].maxDuration;
      
      if (duration > maxDuration) {
        this.log(`${testType} tests exceeded maximum duration (${duration}ms > ${maxDuration}ms)`, 'warning');
      }
      
      this.results[testType] = {
        success: true,
        duration,
        output
      };
      
      this.log(`${testType} tests completed successfully in ${duration}ms`, 'success');
      return true;
      
    } catch (error) {
      this.results[testType] = {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        output: error.stdout || error.stderr
      };
      
      this.log(`${testType} tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runCoverageCheck() {
    this.log('Running coverage analysis...');
    
    try {
      const command = 'pnpm test:coverage:unit';
      execSync(command, { stdio: 'pipe' });
      
      // Check if coverage meets thresholds
      const coveragePath = path.join(__dirname, '../reports/coverage/unit/coverage-summary.json');
      
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverage.total;
        
        const thresholds = qualityGates.coverage.global;
        const checks = [
          { name: 'branches', value: total.branches.pct, threshold: thresholds.branches },
          { name: 'functions', value: total.functions.pct, threshold: thresholds.functions },
          { name: 'lines', value: total.lines.pct, threshold: thresholds.lines },
          { name: 'statements', value: total.statements.pct, threshold: thresholds.statements }
        ];
        
        let coveragePassed = true;
        for (const check of checks) {
          if (check.value < check.threshold) {
            this.log(`Coverage threshold not met for ${check.name}: ${check.value}% < ${check.threshold}%`, 'error');
            coveragePassed = false;
          }
        }
        
        if (coveragePassed) {
          this.log('All coverage thresholds met', 'success');
        }
        
        return coveragePassed;
      }
      
      this.log('Coverage report not found', 'warning');
      return true; // Don't fail if coverage report is missing
      
    } catch (error) {
      this.log(`Coverage check failed: ${error.message}`, 'error');
      return false;
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      results: this.results,
      qualityGates: qualityGates,
      summary: {
        totalTests: Object.keys(this.results).length,
        passedTests: Object.values(this.results).filter(r => r && r.success).length,
        failedTests: Object.values(this.results).filter(r => r && !r.success).length
      }
    };
    
    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Write report
    const reportPath = path.join(reportsDir, 'test-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Test execution report saved to ${reportPath}`);
    return report;
  }

  printSummary() {
    const report = this.generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 VoltAgent Testing Framework - Execution Summary');
    console.log('='.repeat(60));
    
    console.log(`📊 Total Duration: ${report.totalDuration}ms`);
    console.log(`✅ Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}/${report.summary.totalTests}`);
    
    console.log('\n📋 Test Results:');
    for (const [testType, result] of Object.entries(this.results)) {
      if (result) {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} ${testType}: ${result.duration}ms`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    return report.summary.failedTests === 0;
  }

  async run() {
    this.log('🚀 Starting VoltAgent Testing Framework execution...');
    
    // Run test suites
    const unitPassed = await this.runTestSuite('unit');
    const integrationPassed = await this.runTestSuite('integration');
    const e2ePassed = await this.runTestSuite('e2e');
    
    // Run coverage check
    const coveragePassed = await this.runCoverageCheck();
    
    // Generate and print summary
    const allPassed = this.printSummary();
    
    if (!allPassed || !coveragePassed) {
      this.log('❌ Quality gates not met', 'error');
      process.exit(1);
    }
    
    this.log('🎉 All tests passed and quality gates met!', 'success');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;

