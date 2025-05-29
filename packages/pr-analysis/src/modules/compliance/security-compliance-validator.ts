/**
 * Security Compliance Validator
 * Validates security and regulatory compliance requirements (GDPR, SOX, etc.)
 */

import { FileInfo, Finding } from '../../types/index.js';

interface SecurityRule {
  id: string;
  name: string;
  description: string;
  pattern?: RegExp;
  validator?: (content: string, file: FileInfo) => Finding[];
  severity: 'low' | 'medium' | 'high';
  category: 'data_protection' | 'authentication' | 'encryption' | 'logging' | 'access_control';
}

export class SecurityComplianceValidator {
  private securityRules: SecurityRule[] = [];

  constructor() {
    this.initializeSecurityRules();
  }

  async validate(file: FileInfo): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const rule of this.securityRules) {
      try {
        if (rule.validator) {
          const ruleFindings = rule.validator(file.content, file);
          findings.push(...ruleFindings);
        } else if (rule.pattern) {
          const patternFindings = this.validatePattern(rule, file);
          findings.push(...patternFindings);
        }
      } catch (error) {
        console.error(`Error applying security rule ${rule.id}:`, error);
      }
    }

    return findings;
  }

  private validatePattern(rule: SecurityRule, file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      if (rule.pattern!.test(line)) {
        findings.push({
          type: rule.id,
          file: file.path,
          line: index + 1,
          message: rule.description,
          rule: rule.id,
          severity: rule.severity,
          autoFixable: false
        });
      }
    });

    return findings;
  }

  private initializeSecurityRules(): void {
    // Data Protection Rules (GDPR Compliance)
    this.securityRules.push({
      id: 'gdpr_personal_data_handling',
      name: 'GDPR Personal Data Handling',
      description: 'Potential personal data handling without proper safeguards',
      category: 'data_protection',
      severity: 'high',
      validator: (content: string, file: FileInfo) => {
        const findings: Finding[] = [];
        const personalDataPatterns = [
          /email/i,
          /phone/i,
          /address/i,
          /ssn|social.security/i,
          /passport/i,
          /credit.card/i,
          /personal.data/i
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
          personalDataPatterns.forEach(pattern => {
            if (pattern.test(line) && !this.hasDataProtectionMeasures(content)) {
              findings.push({
                type: 'gdpr_personal_data_handling',
                file: file.path,
                line: index + 1,
                message: 'Personal data handling detected without proper GDPR safeguards',
                rule: 'gdpr_personal_data_handling',
                severity: 'high',
                autoFixable: false,
                suggestion: 'Implement data encryption, access controls, and audit logging'
              });
            }
          });
        });

        return findings;
      }
    });

    // Hardcoded Secrets Detection
    this.securityRules.push({
      id: 'hardcoded_secrets',
      name: 'Hardcoded Secrets',
      description: 'Hardcoded secrets or API keys detected',
      category: 'authentication',
      severity: 'high',
      validator: (content: string, file: FileInfo) => {
        const findings: Finding[] = [];
        const secretPatterns = [
          { pattern: /api[_-]?key\s*[:=]\s*['"]\w+['"]/, name: 'API Key' },
          { pattern: /password\s*[:=]\s*['"]\w+['"]/, name: 'Password' },
          { pattern: /secret\s*[:=]\s*['"]\w+['"]/, name: 'Secret' },
          { pattern: /token\s*[:=]\s*['"]\w+['"]/, name: 'Token' },
          { pattern: /aws[_-]?access[_-]?key/, name: 'AWS Access Key' },
          { pattern: /private[_-]?key\s*[:=]/, name: 'Private Key' }
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
          secretPatterns.forEach(({ pattern, name }) => {
            if (pattern.test(line)) {
              findings.push({
                type: 'hardcoded_secrets',
                file: file.path,
                line: index + 1,
                message: `Hardcoded ${name} detected`,
                rule: 'hardcoded_secrets',
                severity: 'high',
                autoFixable: false,
                suggestion: 'Use environment variables or secure key management'
              });
            }
          });
        });

        return findings;
      }
    });

    // SQL Injection Prevention
    this.securityRules.push({
      id: 'sql_injection_risk',
      name: 'SQL Injection Risk',
      description: 'Potential SQL injection vulnerability',
      category: 'data_protection',
      severity: 'high',
      validator: (content: string, file: FileInfo) => {
        const findings: Finding[] = [];
        const sqlInjectionPatterns = [
          /query\s*\+\s*['"]/i,
          /sql\s*\+\s*['"]/i,
          /execute\s*\(\s*['"]/i,
          /\$\{.*\}.*sql/i
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
          sqlInjectionPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              findings.push({
                type: 'sql_injection_risk',
                file: file.path,
                line: index + 1,
                message: 'Potential SQL injection vulnerability detected',
                rule: 'sql_injection_risk',
                severity: 'high',
                autoFixable: false,
                suggestion: 'Use parameterized queries or prepared statements'
              });
            }
          });
        });

        return findings;
      }
    });

    // Insecure HTTP Usage
    this.securityRules.push({
      id: 'insecure_http',
      name: 'Insecure HTTP Usage',
      description: 'HTTP used instead of HTTPS',
      category: 'encryption',
      severity: 'medium',
      pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/i
    });

    // Weak Cryptography
    this.securityRules.push({
      id: 'weak_cryptography',
      name: 'Weak Cryptography',
      description: 'Weak or deprecated cryptographic algorithms',
      category: 'encryption',
      severity: 'high',
      validator: (content: string, file: FileInfo) => {
        const findings: Finding[] = [];
        const weakCryptoPatterns = [
          { pattern: /md5/i, name: 'MD5' },
          { pattern: /sha1/i, name: 'SHA1' },
          { pattern: /des/i, name: 'DES' },
          { pattern: /rc4/i, name: 'RC4' }
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
          weakCryptoPatterns.forEach(({ pattern, name }) => {
            if (pattern.test(line)) {
              findings.push({
                type: 'weak_cryptography',
                file: file.path,
                line: index + 1,
                message: `Weak cryptographic algorithm ${name} detected`,
                rule: 'weak_cryptography',
                severity: 'high',
                autoFixable: false,
                suggestion: 'Use stronger algorithms like SHA-256, AES, or bcrypt'
              });
            }
          });
        });

        return findings;
      }
    });

    // Insufficient Logging (SOX Compliance)
    this.securityRules.push({
      id: 'insufficient_logging',
      name: 'Insufficient Audit Logging',
      description: 'Critical operations lack proper audit logging',
      category: 'logging',
      severity: 'medium',
      validator: (content: string, file: FileInfo) => {
        const findings: Finding[] = [];
        const criticalOperations = [
          /delete/i,
          /update/i,
          /create/i,
          /login/i,
          /authenticate/i,
          /authorize/i
        ];

        const hasLogging = /log|audit|track/i.test(content);
        
        if (!hasLogging) {
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            criticalOperations.forEach(pattern => {
              if (pattern.test(line)) {
                findings.push({
                  type: 'insufficient_logging',
                  file: file.path,
                  line: index + 1,
                  message: 'Critical operation without audit logging (SOX compliance)',
                  rule: 'insufficient_logging',
                  severity: 'medium',
                  autoFixable: false,
                  suggestion: 'Add audit logging for compliance tracking'
                });
              }
            });
          });
        }

        return findings;
      }
    });

    // Access Control Validation
    this.securityRules.push({
      id: 'missing_access_control',
      name: 'Missing Access Control',
      description: 'Endpoints or functions lack proper access control',
      category: 'access_control',
      severity: 'high',
      validator: (content: string, file: FileInfo) => {
        const findings: Finding[] = [];
        
        // Check for API endpoints without authentication
        const endpointPatterns = [
          /app\.(get|post|put|delete|patch)/i,
          /router\.(get|post|put|delete|patch)/i,
          /@(Get|Post|Put|Delete|Patch)/i
        ];

        const hasAuth = /auth|authenticate|authorize|permission|role/i.test(content);
        
        if (!hasAuth) {
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            endpointPatterns.forEach(pattern => {
              if (pattern.test(line)) {
                findings.push({
                  type: 'missing_access_control',
                  file: file.path,
                  line: index + 1,
                  message: 'API endpoint lacks access control validation',
                  rule: 'missing_access_control',
                  severity: 'high',
                  autoFixable: false,
                  suggestion: 'Add authentication and authorization checks'
                });
              }
            });
          });
        }

        return findings;
      }
    });

    // Environment Variable Exposure
    this.securityRules.push({
      id: 'env_var_exposure',
      name: 'Environment Variable Exposure',
      description: 'Environment variables potentially exposed in logs',
      category: 'data_protection',
      severity: 'medium',
      validator: (content: string, file: FileInfo) => {
        const findings: Finding[] = [];
        const envExposurePatterns = [
          /console\.log.*process\.env/i,
          /print.*os\.environ/i,
          /log.*env\./i
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
          envExposurePatterns.forEach(pattern => {
            if (pattern.test(line)) {
              findings.push({
                type: 'env_var_exposure',
                file: file.path,
                line: index + 1,
                message: 'Environment variables may be exposed in logs',
                rule: 'env_var_exposure',
                severity: 'medium',
                autoFixable: false,
                suggestion: 'Avoid logging environment variables directly'
              });
            }
          });
        });

        return findings;
      }
    });
  }

  private hasDataProtectionMeasures(content: string): boolean {
    const protectionPatterns = [
      /encrypt/i,
      /hash/i,
      /bcrypt/i,
      /crypto/i,
      /secure/i,
      /gdpr/i,
      /privacy/i
    ];

    return protectionPatterns.some(pattern => pattern.test(content));
  }
}

