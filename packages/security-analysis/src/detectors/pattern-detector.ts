/**
 * Pattern-based security vulnerability detector
 */

import { BaseSecurityDetector } from './base-detector';
import { CodeContext, VulnerabilityFinding, ScanOptions, SecurityPattern } from '../types';
import { OWASP_TOP_10_PATTERNS } from '../patterns/owasp-patterns';

export class PatternSecurityDetector extends BaseSecurityDetector {
  readonly name = 'Pattern-based Security Detector';
  readonly description = 'Detects security vulnerabilities using regex patterns based on OWASP Top 10';
  readonly supportedLanguages = ['*']; // Supports all languages
  readonly owaspCategories = [
    'A01:2021', 'A02:2021', 'A03:2021', 'A04:2021', 'A05:2021',
    'A06:2021', 'A07:2021', 'A08:2021', 'A09:2021', 'A10:2021'
  ];

  private patterns: SecurityPattern[];

  constructor(customPatterns: SecurityPattern[] = []) {
    super();
    this.patterns = [...OWASP_TOP_10_PATTERNS, ...customPatterns];
  }

  async detect(context: CodeContext, options?: ScanOptions): Promise<VulnerabilityFinding[]> {
    const findings: VulnerabilityFinding[] = [];
    const { content, file, language } = context;
    
    // Filter patterns based on file extension and enabled detectors
    const applicablePatterns = this.getApplicablePatterns(file, language, options);
    
    for (const pattern of applicablePatterns) {
      try {
        const patternFindings = await this.detectPattern(pattern, context, options);
        findings.push(...patternFindings);
      } catch (error) {
        console.warn(`Error detecting pattern ${pattern.id}:`, error);
      }
    }

    return this.filterAndRankFindings(findings, options);
  }

  private getApplicablePatterns(file: string, language: string, options?: ScanOptions): SecurityPattern[] {
    const fileExtension = '.' + file.split('.').pop()?.toLowerCase();
    
    return this.patterns.filter(pattern => {
      // Check file extension compatibility
      if (!pattern.file_extensions.includes(fileExtension) && !pattern.file_extensions.includes('*')) {
        return false;
      }

      // Check if detector is enabled
      if (options?.enabledDetectors && !options.enabledDetectors.includes(pattern.id)) {
        return false;
      }

      // Check if detector is disabled
      if (options?.disabledDetectors && options.disabledDetectors.includes(pattern.id)) {
        return false;
      }

      // Check confidence threshold
      if (options?.confidenceThreshold && pattern.confidence < options.confidenceThreshold) {
        return false;
      }

      return true;
    });
  }

  private async detectPattern(
    pattern: SecurityPattern, 
    context: CodeContext, 
    options?: ScanOptions
  ): Promise<VulnerabilityFinding[]> {
    const findings: VulnerabilityFinding[] = [];
    const { content, file } = context;

    let regex: RegExp;
    if (pattern.pattern instanceof RegExp) {
      regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    } else {
      regex = new RegExp(pattern.pattern, 'gi');
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      // Skip if match is in comments
      if (this.shouldSkipMatch(content, match)) {
        continue;
      }

      const lineNumber = this.findLineNumber(content, match);
      const columnNumber = this.findColumnNumber(content, match);
      const functionName = this.extractFunctionContext(content, lineNumber);
      
      // Extract evidence (the actual matched code)
      const evidence = match[0];
      
      const finding = this.createFinding(
        pattern.type,
        file,
        lineNumber,
        pattern.name,
        pattern.suggestion,
        pattern.risk_level,
        {
          function: functionName,
          column: columnNumber,
          description: pattern.description,
          cweId: pattern.cwe_id,
          owaspCategory: pattern.owasp_category,
          confidence: pattern.confidence,
          evidence: evidence,
          remediationEffort: this.getRemediationEffort(pattern.risk_level)
        }
      );

      findings.push(finding);

      // Prevent infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    return findings;
  }

  private getRemediationEffort(riskLevel: string): 'low' | 'medium' | 'high' {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
      default:
        return 'low';
    }
  }

  private filterAndRankFindings(findings: VulnerabilityFinding[], options?: ScanOptions): VulnerabilityFinding[] {
    let filteredFindings = findings;

    // Apply confidence threshold
    if (options?.confidenceThreshold) {
      filteredFindings = filteredFindings.filter(f => f.confidence >= options.confidenceThreshold!);
    }

    // Remove duplicates (same type, file, and line)
    const uniqueFindings = new Map<string, VulnerabilityFinding>();
    for (const finding of filteredFindings) {
      const key = `${finding.type}-${finding.file}-${finding.line}`;
      if (!uniqueFindings.has(key) || uniqueFindings.get(key)!.confidence < finding.confidence) {
        uniqueFindings.set(key, finding);
      }
    }

    // Sort by risk level and confidence
    const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return Array.from(uniqueFindings.values()).sort((a, b) => {
      const riskDiff = riskOrder[b.risk_level] - riskOrder[a.risk_level];
      if (riskDiff !== 0) return riskDiff;
      return b.confidence - a.confidence;
    });
  }

  // Method to add custom patterns
  addPattern(pattern: SecurityPattern): void {
    this.patterns.push(pattern);
  }

  // Method to get all patterns
  getPatterns(): SecurityPattern[] {
    return [...this.patterns];
  }

  // Method to get patterns by OWASP category
  getPatternsByCategory(category: string): SecurityPattern[] {
    return this.patterns.filter(p => p.owasp_category === category);
  }
}

