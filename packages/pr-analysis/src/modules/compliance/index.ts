/**
 * Compliance Analysis Module
 * Enforces coding standards, best practices, and compliance requirements
 */

import { AnalysisModule, AnalysisResult, FileInfo, Finding, ModuleConfiguration } from '../../types/index.js';
import { StyleGuideEngine } from './style-guide-engine.js';
import { DocumentationValidator } from './documentation-validator.js';
import { LicenseValidator } from './license-validator.js';
import { NamingConventionValidator } from './naming-convention-validator.js';
import { SecurityComplianceValidator } from './security-compliance-validator.js';

export class ComplianceAnalysisModule implements AnalysisModule {
  public readonly name = 'compliance_standards_analysis';
  public readonly version = '1.0.0';

  private styleGuideEngine: StyleGuideEngine;
  private documentationValidator: DocumentationValidator;
  private licenseValidator: LicenseValidator;
  private namingValidator: NamingConventionValidator;
  private securityValidator: SecurityComplianceValidator;

  constructor() {
    this.styleGuideEngine = new StyleGuideEngine();
    this.documentationValidator = new DocumentationValidator();
    this.licenseValidator = new LicenseValidator();
    this.namingValidator = new NamingConventionValidator();
    this.securityValidator = new SecurityComplianceValidator();
  }

  async analyze(files: FileInfo[]): Promise<AnalysisResult> {
    const startTime = Date.now();
    const findings: Finding[] = [];
    const rulesApplied: string[] = [];

    // Filter files for analysis (exclude node_modules, dist, etc.)
    const analysisFiles = files.filter(file => 
      !file.path.includes('node_modules') &&
      !file.path.includes('dist') &&
      !file.path.includes('.git') &&
      !file.path.startsWith('.')
    );

    // Run all compliance validators
    for (const file of analysisFiles) {
      try {
        // Style guide validation
        const styleFindings = await this.styleGuideEngine.validate(file);
        findings.push(...styleFindings);
        rulesApplied.push('style_guide');

        // Documentation validation
        const docFindings = await this.documentationValidator.validate(file);
        findings.push(...docFindings);
        rulesApplied.push('documentation');

        // License validation
        const licenseFindings = await this.licenseValidator.validate(file);
        findings.push(...licenseFindings);
        rulesApplied.push('license');

        // Naming convention validation
        const namingFindings = await this.namingValidator.validate(file);
        findings.push(...namingFindings);
        rulesApplied.push('naming_convention');

        // Security compliance validation
        const securityFindings = await this.securityValidator.validate(file);
        findings.push(...securityFindings);
        rulesApplied.push('security_compliance');

      } catch (error) {
        console.error(`Error analyzing file ${file.path}:`, error);
        findings.push({
          type: 'analysis_error',
          file: file.path,
          message: `Failed to analyze file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'medium',
          autoFixable: false,
          rule: 'internal_error'
        });
      }
    }

    // Determine overall severity
    const severity = this.calculateOverallSeverity(findings);

    const executionTime = Date.now() - startTime;

    return {
      module: this.name,
      severity,
      findings,
      metadata: {
        executionTime,
        filesAnalyzed: analysisFiles.length,
        rulesApplied: [...new Set(rulesApplied)]
      }
    };
  }

  getConfiguration(): ModuleConfiguration {
    return {
      enabled: true,
      rules: {
        enforceStyleGuide: true,
        requireDocumentation: true,
        validateLicenses: true,
        enforceNamingConventions: true,
        securityCompliance: true,
        autoFixStyleViolations: true,
        documentationCoverage: 80, // Percentage
        allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC']
      },
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.min.js',
        '*.bundle.js',
        'coverage/**',
        '.next/**'
      ],
      includePatterns: [
        '**/*.ts',
        '**/*.js',
        '**/*.tsx',
        '**/*.jsx',
        '**/*.py',
        '**/*.go',
        '**/*.java',
        '**/*.cs',
        '**/*.cpp',
        '**/*.c',
        '**/*.h',
        '**/*.hpp'
      ]
    };
  }

  private calculateOverallSeverity(findings: Finding[]): 'low' | 'medium' | 'high' {
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }
}

export * from './style-guide-engine.js';
export * from './documentation-validator.js';
export * from './license-validator.js';
export * from './naming-convention-validator.js';
export * from './security-compliance-validator.js';

