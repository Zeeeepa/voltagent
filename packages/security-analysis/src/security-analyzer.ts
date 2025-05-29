/**
 * Main Security Vulnerability Analyzer
 */

import { 
  SecurityAnalysisResult, 
  VulnerabilityFinding, 
  ScanOptions, 
  ISecurityDetector,
  CodeContext,
  Severity
} from './types';
import { PatternSecurityDetector } from './detectors/pattern-detector';
import { CodeParser } from './utils/code-parser';
import * as fs from 'fs';
import * as path from 'path';

export class SecurityAnalyzer {
  private detectors: ISecurityDetector[];
  private startTime: number = 0;

  constructor(customDetectors: ISecurityDetector[] = []) {
    this.detectors = [
      new PatternSecurityDetector(),
      ...customDetectors
    ];
  }

  /**
   * Analyze a single file for security vulnerabilities
   */
  async analyzeFile(filePath: string, options?: ScanOptions): Promise<SecurityAnalysisResult> {
    this.startTime = Date.now();
    
    try {
      const context = await CodeParser.parseFile(filePath);
      const findings = await this.analyzeContext(context, options);
      
      return this.createResult([context], findings, options);
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return this.createEmptyResult();
    }
  }

  /**
   * Analyze content string for security vulnerabilities
   */
  async analyzeContent(content: string, filePath: string, options?: ScanOptions): Promise<SecurityAnalysisResult> {
    this.startTime = Date.now();
    
    try {
      const context = CodeParser.parseContent(content, filePath);
      const findings = await this.analyzeContext(context, options);
      
      return this.createResult([context], findings, options);
    } catch (error) {
      console.error(`Error analyzing content for ${filePath}:`, error);
      return this.createEmptyResult();
    }
  }

  /**
   * Analyze multiple files in a directory
   */
  async analyzeDirectory(directoryPath: string, options?: ScanOptions): Promise<SecurityAnalysisResult> {
    this.startTime = Date.now();
    
    try {
      const files = await this.getFilesToScan(directoryPath, options);
      const contexts: CodeContext[] = [];
      const allFindings: VulnerabilityFinding[] = [];

      for (const file of files) {
        try {
          const context = await CodeParser.parseFile(file);
          contexts.push(context);
          
          const findings = await this.analyzeContext(context, options);
          allFindings.push(...findings);
        } catch (error) {
          console.warn(`Skipping file ${file} due to error:`, error);
        }
      }

      return this.createResult(contexts, allFindings, options);
    } catch (error) {
      console.error(`Error analyzing directory ${directoryPath}:`, error);
      return this.createEmptyResult();
    }
  }

  /**
   * Analyze a CodeContext using all applicable detectors
   */
  private async analyzeContext(context: CodeContext, options?: ScanOptions): Promise<VulnerabilityFinding[]> {
    const allFindings: VulnerabilityFinding[] = [];

    for (const detector of this.detectors) {
      if (!detector.isApplicable(context)) {
        continue;
      }

      try {
        const findings = await detector.detect(context, options);
        allFindings.push(...findings);
      } catch (error) {
        console.warn(`Detector ${detector.name} failed for ${context.file}:`, error);
      }
    }

    return this.deduplicateFindings(allFindings);
  }

  /**
   * Get list of files to scan based on options
   */
  private async getFilesToScan(directoryPath: string, options?: ScanOptions): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common directories that shouldn't be scanned
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          if (this.shouldScanFile(fullPath, options)) {
            files.push(fullPath);
          }
        }
      }
    };

    await scanDirectory(directoryPath);
    return files;
  }

  /**
   * Check if a directory should be skipped
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 
      'coverage', '.nyc_output', 'vendor', '__pycache__', 
      '.pytest_cache', 'target', 'bin', 'obj'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Check if a file should be scanned
   */
  private shouldScanFile(filePath: string, options?: ScanOptions): boolean {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    // Check file size limit
    if (options?.maxFileSize) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > options.maxFileSize) {
          return false;
        }
      } catch {
        return false;
      }
    }

    // Check include patterns
    if (options?.includePatterns) {
      const included = options.includePatterns.some(pattern => 
        new RegExp(pattern).test(filePath)
      );
      if (!included) return false;
    }

    // Check exclude patterns
    if (options?.excludePatterns) {
      const excluded = options.excludePatterns.some(pattern => 
        new RegExp(pattern).test(filePath)
      );
      if (excluded) return false;
    }

    // Default file extensions to scan
    const scanExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.php', 
      '.go', '.rb', '.cpp', '.c', '.h', '.hpp', '.rs', '.kt', 
      '.swift', '.scala', '.sh', '.bash', '.ps1', '.sql'
    ];

    return scanExtensions.includes(extension);
  }

  /**
   * Remove duplicate findings
   */
  private deduplicateFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
    const uniqueFindings = new Map<string, VulnerabilityFinding>();
    
    for (const finding of findings) {
      const key = `${finding.type}-${finding.file}-${finding.line}-${finding.vulnerability}`;
      
      if (!uniqueFindings.has(key) || 
          uniqueFindings.get(key)!.confidence < finding.confidence) {
        uniqueFindings.set(key, finding);
      }
    }

    return Array.from(uniqueFindings.values());
  }

  /**
   * Create analysis result
   */
  private createResult(
    contexts: CodeContext[], 
    findings: VulnerabilityFinding[], 
    options?: ScanOptions
  ): SecurityAnalysisResult {
    const summary = this.createSummary(findings);
    const severity = this.calculateOverallSeverity(findings);
    const owaspCoverage = this.getOwaspCoverage(findings);
    
    return {
      module: 'security_vulnerability_detection',
      severity,
      scan_timestamp: new Date().toISOString(),
      total_files_scanned: contexts.length,
      total_vulnerabilities: findings.length,
      findings: this.sortFindings(findings),
      summary,
      owasp_coverage: owaspCoverage,
      scan_duration_ms: Date.now() - this.startTime
    };
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(): SecurityAnalysisResult {
    return {
      module: 'security_vulnerability_detection',
      severity: 'low',
      scan_timestamp: new Date().toISOString(),
      total_files_scanned: 0,
      total_vulnerabilities: 0,
      findings: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      owasp_coverage: [],
      scan_duration_ms: Date.now() - this.startTime
    };
  }

  /**
   * Create findings summary
   */
  private createSummary(findings: VulnerabilityFinding[]) {
    return findings.reduce(
      (summary, finding) => {
        summary[finding.risk_level]++;
        return summary;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );
  }

  /**
   * Calculate overall severity based on findings
   */
  private calculateOverallSeverity(findings: VulnerabilityFinding[]): Severity {
    if (findings.some(f => f.risk_level === 'critical')) return 'critical';
    if (findings.some(f => f.risk_level === 'high')) return 'high';
    if (findings.some(f => f.risk_level === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Get OWASP categories covered by findings
   */
  private getOwaspCoverage(findings: VulnerabilityFinding[]): string[] {
    const categories = new Set<string>();
    findings.forEach(finding => {
      if (finding.owasp_category) {
        categories.add(finding.owasp_category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Sort findings by severity and confidence
   */
  private sortFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
    const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return findings.sort((a, b) => {
      const riskDiff = riskOrder[b.risk_level] - riskOrder[a.risk_level];
      if (riskDiff !== 0) return riskDiff;
      
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;
      
      return a.file.localeCompare(b.file);
    });
  }

  /**
   * Add a custom detector
   */
  addDetector(detector: ISecurityDetector): void {
    this.detectors.push(detector);
  }

  /**
   * Get all registered detectors
   */
  getDetectors(): ISecurityDetector[] {
    return [...this.detectors];
  }

  /**
   * Get detector by name
   */
  getDetector(name: string): ISecurityDetector | undefined {
    return this.detectors.find(d => d.name === name);
  }
}

