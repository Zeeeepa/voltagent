/**
 * License Validator
 * Validates license headers and compliance requirements
 */

import { FileInfo, Finding } from '../../types/index.js';

export class LicenseValidator {
  private allowedLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC', 'GPL-3.0', 'LGPL-3.0'];
  private licensePatterns = new Map<string, RegExp>();

  constructor() {
    this.initializeLicensePatterns();
  }

  async validate(file: FileInfo): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Check package.json files for license compliance
    if (file.path.endsWith('package.json')) {
      findings.push(...this.validatePackageJsonLicense(file));
    }

    // Check for license headers in source files
    if (this.isSourceFile(file.path)) {
      findings.push(...this.validateLicenseHeader(file));
    }

    // Check LICENSE files
    if (file.path.toLowerCase().includes('license')) {
      findings.push(...this.validateLicenseFile(file));
    }

    return findings;
  }

  private validatePackageJsonLicense(file: FileInfo): Finding[] {
    const findings: Finding[] = [];

    try {
      const packageJson = JSON.parse(file.content);
      
      if (!packageJson.license) {
        findings.push({
          type: 'missing_license_field',
          file: file.path,
          message: 'package.json is missing license field',
          rule: 'license_required',
          severity: 'high',
          autoFixable: false,
          suggestion: 'Add license field to package.json'
        });
      } else if (!this.allowedLicenses.includes(packageJson.license)) {
        findings.push({
          type: 'invalid_license',
          file: file.path,
          message: `License '${packageJson.license}' is not in allowed list`,
          rule: 'license_whitelist',
          severity: 'high',
          autoFixable: false,
          suggestion: `Use one of: ${this.allowedLicenses.join(', ')}`,
          context: {
            actual: packageJson.license,
            expected: this.allowedLicenses.join(', ')
          }
        });
      }

      // Check for license URL or file reference
      if (!packageJson.license_url && !packageJson.license_file) {
        findings.push({
          type: 'missing_license_reference',
          file: file.path,
          message: 'package.json should include license_url or license_file',
          rule: 'license_reference',
          severity: 'medium',
          autoFixable: false,
          suggestion: 'Add license_url or license_file field'
        });
      }

    } catch (error) {
      findings.push({
        type: 'invalid_package_json',
        file: file.path,
        message: 'Invalid JSON in package.json',
        rule: 'valid_json',
        severity: 'high',
        autoFixable: false
      });
    }

    return findings;
  }

  private validateLicenseHeader(file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const content = file.content;
    const lines = content.split('\n');

    // Check first 20 lines for license header
    const headerContent = lines.slice(0, 20).join('\n').toLowerCase();
    
    let hasLicenseHeader = false;
    for (const [licenseName, pattern] of this.licensePatterns) {
      if (pattern.test(headerContent)) {
        hasLicenseHeader = true;
        break;
      }
    }

    if (!hasLicenseHeader) {
      // Check if it's a significant source file (not test, config, etc.)
      if (this.requiresLicenseHeader(file.path)) {
        findings.push({
          type: 'missing_license_header',
          file: file.path,
          line: 1,
          message: 'Source file is missing license header',
          rule: 'license_header_required',
          severity: 'medium',
          autoFixable: true,
          suggestion: 'Add license header at the top of the file'
        });
      }
    }

    return findings;
  }

  private validateLicenseFile(file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const content = file.content.toLowerCase();

    // Check if LICENSE file contains valid license text
    let hasValidLicense = false;
    for (const [licenseName, pattern] of this.licensePatterns) {
      if (pattern.test(content)) {
        hasValidLicense = true;
        break;
      }
    }

    if (!hasValidLicense) {
      findings.push({
        type: 'invalid_license_file',
        file: file.path,
        message: 'LICENSE file does not contain recognized license text',
        rule: 'valid_license_text',
        severity: 'high',
        autoFixable: false,
        suggestion: 'Ensure LICENSE file contains valid license text'
      });
    }

    // Check for copyright notice
    if (!content.includes('copyright')) {
      findings.push({
        type: 'missing_copyright_notice',
        file: file.path,
        message: 'LICENSE file is missing copyright notice',
        rule: 'copyright_required',
        severity: 'medium',
        autoFixable: false,
        suggestion: 'Add copyright notice to LICENSE file'
      });
    }

    return findings;
  }

  private initializeLicensePatterns(): void {
    this.licensePatterns.set('MIT', /mit license|permission is hereby granted/i);
    this.licensePatterns.set('Apache-2.0', /apache license|version 2\.0/i);
    this.licensePatterns.set('BSD-3-Clause', /bsd.*3.*clause|redistribution and use in source and binary forms/i);
    this.licensePatterns.set('ISC', /isc license|permission to use, copy, modify/i);
    this.licensePatterns.set('GPL-3.0', /gnu general public license|version 3/i);
    this.licensePatterns.set('LGPL-3.0', /gnu lesser general public license|version 3/i);
  }

  private isSourceFile(filePath: string): boolean {
    const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.cs', '.cpp', '.c', '.h', '.hpp'];
    return sourceExtensions.some(ext => filePath.endsWith(ext));
  }

  private requiresLicenseHeader(filePath: string): boolean {
    // Don't require license headers for certain files
    const excludePatterns = [
      /test/i,
      /spec/i,
      /\.config\./,
      /\.d\.ts$/,
      /node_modules/,
      /dist/,
      /build/,
      /coverage/
    ];

    return !excludePatterns.some(pattern => pattern.test(filePath));
  }
}

