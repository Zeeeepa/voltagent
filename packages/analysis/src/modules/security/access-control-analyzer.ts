import {
  Analyzer,
  AnalysisContext,
  AccessControlAnalysisResult,
  SecurityFinding,
  SecurityPattern,
  AuthPattern,
} from '../../types';

export class AccessControlAnalyzer implements Analyzer {
  name = 'access_control_analyzer';
  version = '1.0.0';

  private securityPatterns: SecurityPattern[] = [
    {
      name: 'missing_auth_middleware',
      pattern: /(?:app\.|router\.|express\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?!.*(?:auth|authenticate|requireAuth|isAuthenticated|verifyToken))/gi,
      type: 'missing_authentication',
      severity: 'high',
      description: 'Endpoint lacks authentication middleware',
      suggestion: 'Add authentication middleware before route handler',
      risk: 'unauthorized_access',
    },
    {
      name: 'admin_endpoint_unprotected',
      pattern: /(?:app\.|router\.|express\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*\/admin[^'"`]*)['"`]\s*,\s*(?!.*(?:auth|authenticate|requireAuth|isAuthenticated|verifyToken|requireRole|isAdmin))/gi,
      type: 'missing_authentication',
      severity: 'critical',
      description: 'Admin endpoint lacks proper authentication and authorization',
      suggestion: 'Add authentication and admin role verification middleware',
      risk: 'unauthorized_admin_access',
    },
    {
      name: 'weak_role_check',
      pattern: /(?:user\.role|req\.user\.role|token\.role)\s*===?\s*['"`]admin['"`]/gi,
      type: 'weak_authorization',
      severity: 'medium',
      description: 'Simple string comparison for role validation',
      suggestion: 'Use proper role validation with enum or constant values',
      risk: 'role_bypass',
    },
    {
      name: 'missing_csrf_protection',
      pattern: /(?:app\.|router\.|express\.)(post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?!.*(?:csrf|csrfProtection|verifyCsrf))/gi,
      type: 'csrf_vulnerability',
      severity: 'medium',
      description: 'State-changing endpoint lacks CSRF protection',
      suggestion: 'Add CSRF protection middleware for state-changing operations',
      risk: 'cross_site_request_forgery',
    },
    {
      name: 'hardcoded_secrets',
      pattern: /(?:password|secret|key|token)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi,
      type: 'insecure_storage',
      severity: 'critical',
      description: 'Hardcoded secrets or credentials in source code',
      suggestion: 'Move secrets to environment variables or secure configuration',
      risk: 'credential_exposure',
    },
    {
      name: 'weak_session_config',
      pattern: /session\s*\(\s*\{[^}]*secure\s*:\s*false/gi,
      type: 'weak_session_handling',
      severity: 'medium',
      description: 'Session configuration allows insecure connections',
      suggestion: 'Set secure: true for production environments',
      risk: 'session_hijacking',
    },
    {
      name: 'missing_rate_limiting',
      pattern: /(?:app\.|router\.|express\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*\/(?:login|register|reset|api)[^'"`]*)['"`]\s*,\s*(?!.*(?:rateLimit|rateLimiter|throttle))/gi,
      type: 'rate_limiting',
      severity: 'medium',
      description: 'Sensitive endpoint lacks rate limiting',
      suggestion: 'Add rate limiting middleware to prevent abuse',
      risk: 'brute_force_attack',
    },
    {
      name: 'jwt_no_expiry',
      pattern: /jwt\.sign\s*\([^)]*\)\s*(?!.*expiresIn)/gi,
      type: 'token_validation',
      severity: 'medium',
      description: 'JWT token created without expiration',
      suggestion: 'Add expiresIn option to JWT token creation',
      risk: 'token_never_expires',
    },
    {
      name: 'privilege_escalation_risk',
      pattern: /(?:user\.role|req\.user\.role)\s*=\s*(?:req\.body\.role|params\.role|query\.role)/gi,
      type: 'privilege_escalation',
      severity: 'critical',
      description: 'User role can be modified through request parameters',
      suggestion: 'Validate role changes through proper authorization flow',
      risk: 'privilege_escalation',
    },
  ];

  private authPatterns: AuthPattern = {
    middleware: [
      /authenticate/gi,
      /requireAuth/gi,
      /isAuthenticated/gi,
      /verifyToken/gi,
      /checkAuth/gi,
    ],
    decorators: [
      /@Authenticated/gi,
      /@RequireAuth/gi,
      /@Auth/gi,
      /@Protected/gi,
    ],
    functions: [
      /function\s+(?:authenticate|requireAuth|isAuthenticated|verifyToken|checkAuth)/gi,
      /const\s+(?:authenticate|requireAuth|isAuthenticated|verifyToken|checkAuth)/gi,
    ],
    endpoints: [
      /\/api\/auth/gi,
      /\/login/gi,
      /\/logout/gi,
      /\/register/gi,
      /\/admin/gi,
    ],
    tokens: [
      /jwt\.sign/gi,
      /jwt\.verify/gi,
      /token\.verify/gi,
      /Bearer\s+/gi,
    ],
    sessions: [
      /req\.session/gi,
      /session\(/gi,
      /express-session/gi,
    ],
  };

  async analyze(contexts: AnalysisContext[]): Promise<AccessControlAnalysisResult> {
    const startTime = Date.now();
    const findings: SecurityFinding[] = [];
    let totalLines = 0;
    let filesAnalyzed = 0;

    for (const context of contexts) {
      if (this.shouldAnalyzeFile(context)) {
        const fileFindings = await this.analyzeFile(context);
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

  private shouldAnalyzeFile(context: AnalysisContext): boolean {
    const relevantExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.php', '.rb'];
    const hasRelevantExtension = relevantExtensions.some(ext => context.filePath.endsWith(ext));
    
    // Skip test files and node_modules
    const isTestFile = /\.(test|spec)\.(js|ts|jsx|tsx)$/i.test(context.filePath);
    const isNodeModules = context.filePath.includes('node_modules');
    
    return hasRelevantExtension && !isTestFile && !isNodeModules;
  }

  private async analyzeFile(context: AnalysisContext): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const lines = context.content.split('\n');

    // Check for security patterns
    for (const pattern of this.securityPatterns) {
      const matches = this.findPatternMatches(context.content, pattern, lines);
      findings.push(...matches);
    }

    // Additional context-specific analysis
    findings.push(...this.analyzeAuthenticationFlow(context, lines));
    findings.push(...this.analyzeAuthorizationPatterns(context, lines));
    findings.push(...this.analyzeSessionManagement(context, lines));

    return findings;
  }

  private findPatternMatches(
    content: string,
    pattern: SecurityPattern,
    lines: string[]
  ): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const regex = typeof pattern.pattern === 'string' 
      ? new RegExp(pattern.pattern, 'gi') 
      : pattern.pattern;

    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const line = lines[lineNumber - 1];

      findings.push({
        type: pattern.type,
        file: '',
        line: lineNumber,
        risk: pattern.risk,
        suggestion: pattern.suggestion,
        description: pattern.description,
        severity: pattern.severity,
      });
    }

    return findings;
  }

  private analyzeAuthenticationFlow(context: AnalysisContext, lines: string[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    
    // Check for endpoints without authentication
    const routePattern = /(?:app\.|router\.|express\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let match;
    
    while ((match = routePattern.exec(context.content)) !== null) {
      const method = match[1];
      const endpoint = match[2];
      const lineNumber = this.getLineNumber(context.content, match.index);
      
      // Check if this line or nearby lines have authentication middleware
      const hasAuth = this.checkForAuthenticationNearby(lines, lineNumber - 1, 3);
      
      if (!hasAuth && this.isSensitiveEndpoint(endpoint)) {
        findings.push({
          type: 'missing_authentication',
          file: context.filePath,
          line: lineNumber,
          endpoint: `${method.toUpperCase()} ${endpoint}`,
          risk: 'unauthorized_access',
          suggestion: 'Add authentication middleware before route handler',
          description: `Endpoint ${endpoint} lacks authentication protection`,
          severity: this.getSeverityForEndpoint(endpoint),
        });
      }
    }

    return findings;
  }

  private analyzeAuthorizationPatterns(context: AnalysisContext, lines: string[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    
    // Look for role-based access control issues
    lines.forEach((line, index) => {
      // Check for direct role comparisons
      if (/(?:user\.role|req\.user\.role|token\.role)\s*===?\s*['"`]\w+['"`]/.test(line)) {
        findings.push({
          type: 'weak_authorization',
          file: context.filePath,
          line: index + 1,
          risk: 'role_bypass',
          suggestion: 'Use proper role validation with enum or constant values',
          description: 'Direct string comparison for role validation is vulnerable to bypass',
          severity: 'medium',
        });
      }

      // Check for missing authorization on admin functions
      if (/function\s+\w*admin\w*/gi.test(line) || /const\s+\w*admin\w*/gi.test(line)) {
        const hasRoleCheck = this.checkForRoleValidationNearby(lines, index, 10);
        if (!hasRoleCheck) {
          findings.push({
            type: 'missing_authentication',
            file: context.filePath,
            line: index + 1,
            function: line.trim(),
            risk: 'unauthorized_admin_access',
            suggestion: 'Add role-based authorization check',
            description: 'Admin function lacks proper authorization validation',
            severity: 'high',
          });
        }
      }
    });

    return findings;
  }

  private analyzeSessionManagement(context: AnalysisContext, lines: string[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    
    lines.forEach((line, index) => {
      // Check for insecure session configuration
      if (/session\s*\(/gi.test(line)) {
        const sessionConfig = this.extractSessionConfig(lines, index, 10);
        
        if (sessionConfig.includes('secure: false')) {
          findings.push({
            type: 'weak_session_handling',
            file: context.filePath,
            line: index + 1,
            risk: 'session_hijacking',
            suggestion: 'Set secure: true for production environments',
            description: 'Session configuration allows insecure connections',
            severity: 'medium',
          });
        }

        if (!sessionConfig.includes('httpOnly')) {
          findings.push({
            type: 'weak_session_handling',
            file: context.filePath,
            line: index + 1,
            risk: 'xss_session_theft',
            suggestion: 'Set httpOnly: true to prevent XSS attacks',
            description: 'Session cookies should be httpOnly to prevent client-side access',
            severity: 'medium',
          });
        }
      }
    });

    return findings;
  }

  private checkForAuthenticationNearby(lines: string[], startLine: number, range: number): boolean {
    const start = Math.max(0, startLine - range);
    const end = Math.min(lines.length, startLine + range);
    
    for (let i = start; i < end; i++) {
      const line = lines[i];
      if (this.authPatterns.middleware.some(pattern => pattern.test(line))) {
        return true;
      }
    }
    
    return false;
  }

  private checkForRoleValidationNearby(lines: string[], startLine: number, range: number): boolean {
    const start = Math.max(0, startLine - range);
    const end = Math.min(lines.length, startLine + range);
    
    for (let i = start; i < end; i++) {
      const line = lines[i];
      if (/(?:role|permission|authorize|admin|checkRole)/gi.test(line)) {
        return true;
      }
    }
    
    return false;
  }

  private extractSessionConfig(lines: string[], startLine: number, range: number): string {
    const start = startLine;
    const end = Math.min(lines.length, startLine + range);
    
    let config = '';
    let braceCount = 0;
    let inConfig = false;
    
    for (let i = start; i < end; i++) {
      const line = lines[i];
      config += line + '\n';
      
      if (line.includes('{')) {
        braceCount += (line.match(/\{/g) || []).length;
        inConfig = true;
      }
      if (line.includes('}')) {
        braceCount -= (line.match(/\}/g) || []).length;
        if (inConfig && braceCount <= 0) {
          break;
        }
      }
    }
    
    return config;
  }

  private isSensitiveEndpoint(endpoint: string): boolean {
    const sensitivePatterns = [
      /\/admin/i,
      /\/api/i,
      /\/auth/i,
      /\/login/i,
      /\/register/i,
      /\/user/i,
      /\/profile/i,
      /\/settings/i,
      /\/delete/i,
      /\/create/i,
      /\/update/i,
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(endpoint));
  }

  private getSeverityForEndpoint(endpoint: string): SecurityFinding['severity'] {
    if (/\/admin/i.test(endpoint)) return 'critical';
    if (/\/(delete|create|update)/i.test(endpoint)) return 'high';
    if (/\/(api|auth|user)/i.test(endpoint)) return 'medium';
    return 'low';
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private calculateOverallSeverity(findings: SecurityFinding[]): AccessControlAnalysisResult['severity'] {
    if (findings.some(f => f.severity === 'critical')) return 'critical';
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  private calculateCoverage(contexts: AnalysisContext[], findings: SecurityFinding[]): number {
    const totalFiles = contexts.filter(c => this.shouldAnalyzeFile(c)).length;
    const filesWithFindings = new Set(findings.map(f => f.file)).size;
    
    if (totalFiles === 0) return 100;
    return Math.round((filesWithFindings / totalFiles) * 100);
  }
}

