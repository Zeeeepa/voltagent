import { SecurityFinding, AnalysisContext } from '../../types';

/**
 * Utility functions for security analysis
 */

/**
 * Extract function name from a line of code
 */
export function extractFunctionName(line: string): string | undefined {
  const patterns = [
    /function\s+(\w+)/,
    /const\s+(\w+)\s*=/,
    /let\s+(\w+)\s*=/,
    /var\s+(\w+)\s*=/,
    /(\w+)\s*:\s*function/,
    /(\w+)\s*=>\s*/,
    /def\s+(\w+)/,
    /public\s+\w+\s+(\w+)\s*\(/,
    /private\s+\w+\s+(\w+)\s*\(/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract endpoint path from route definition
 */
export function extractEndpoint(line: string): string | undefined {
  const patterns = [
    /(?:get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i,
    /@(?:GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)\s*\(\s*['"`]([^'"`]+)['"`]/i,
    /route\s*\(\s*['"`]([^'"`]+)['"`]/i,
    /path\s*\(\s*['"`]([^'"`]+)['"`]/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Check if a line contains authentication-related code
 */
export function hasAuthenticationCode(line: string): boolean {
  const authKeywords = [
    'authenticate', 'auth', 'login', 'logout', 'token', 'jwt',
    'session', 'passport', 'oauth', 'bearer', 'authorization',
    'requireAuth', 'isAuthenticated', 'verifyToken', 'checkAuth',
    '@login_required', '@permission_required', '@PreAuthorize',
    '@Secured', '@RolesAllowed'
  ];

  return authKeywords.some(keyword => 
    line.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Check if a line contains authorization-related code
 */
export function hasAuthorizationCode(line: string): boolean {
  const authzKeywords = [
    'role', 'permission', 'authorize', 'admin', 'user',
    'checkRole', 'hasRole', 'requireRole', 'isAdmin',
    'canAccess', 'hasPermission', 'checkPermission'
  ];

  return authzKeywords.some(keyword => 
    line.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Determine if an endpoint is sensitive and requires protection
 */
export function isSensitiveEndpoint(endpoint: string): boolean {
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
    /\/upload/i,
    /\/download/i,
    /\/config/i,
    /\/dashboard/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(endpoint));
}

/**
 * Get severity level for an endpoint based on its path
 */
export function getEndpointSeverity(endpoint: string): SecurityFinding['severity'] {
  if (/\/admin/i.test(endpoint)) return 'critical';
  if (/\/(delete|remove|destroy)/i.test(endpoint)) return 'critical';
  if (/\/(create|add|new|upload)/i.test(endpoint)) return 'high';
  if (/\/(update|edit|modify|change)/i.test(endpoint)) return 'high';
  if (/\/(api|auth|user|profile)/i.test(endpoint)) return 'medium';
  if (/\/(config|settings|dashboard)/i.test(endpoint)) return 'medium';
  return 'low';
}

/**
 * Extract HTTP method from route definition
 */
export function extractHttpMethod(line: string): string | undefined {
  const patterns = [
    /\.(get|post|put|delete|patch|head|options)\s*\(/i,
    /@(Get|Post|Put|Delete|Patch)Mapping/i,
    /method\s*=\s*['"`](GET|POST|PUT|DELETE|PATCH)['"`]/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

/**
 * Check if a method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const stateMutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  return stateMutatingMethods.includes(method.toUpperCase());
}

/**
 * Extract session configuration from code
 */
export function extractSessionConfig(lines: string[], startIndex: number): Record<string, any> {
  const config: Record<string, any> = {};
  let braceCount = 0;
  let inConfig = false;

  for (let i = startIndex; i < Math.min(lines.length, startIndex + 20); i++) {
    const line = lines[i];
    
    if (line.includes('{')) {
      braceCount += (line.match(/\{/g) || []).length;
      inConfig = true;
    }
    
    if (inConfig) {
      // Extract key-value pairs
      const keyValueMatch = line.match(/(\w+)\s*:\s*([^,\}]+)/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        const value = keyValueMatch[2].trim();
        config[key] = value;
      }
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

/**
 * Check if JWT token has proper configuration
 */
export function validateJwtConfig(line: string): { hasExpiry: boolean; hasSecret: boolean } {
  const hasExpiry = /expiresIn|exp:|expires/.test(line);
  const hasSecret = /secret|key|SECRET|KEY/.test(line);
  
  return { hasExpiry, hasSecret };
}

/**
 * Extract variable assignments that might contain secrets
 */
export function extractVariableAssignments(line: string): Array<{ name: string; value: string }> {
  const assignments: Array<{ name: string; value: string }> = [];
  
  const patterns = [
    /(?:const|let|var)\s+(\w+)\s*=\s*['"`]([^'"`]+)['"`]/g,
    /(\w+)\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(line)) !== null) {
      assignments.push({
        name: match[1],
        value: match[2],
      });
    }
  }

  return assignments;
}

/**
 * Check if a value looks like a secret (API key, password, etc.)
 */
export function looksLikeSecret(name: string, value: string): boolean {
  const secretNames = [
    'password', 'pwd', 'pass', 'secret', 'key', 'token',
    'api_key', 'apikey', 'private_key', 'privatekey',
    'access_token', 'refresh_token', 'auth_token'
  ];

  const nameIsSecret = secretNames.some(secretName => 
    name.toLowerCase().includes(secretName)
  );

  // Check if value looks like a secret (long alphanumeric string)
  const valueLooksSecret = value.length >= 8 && 
    /^[A-Za-z0-9+/=_-]+$/.test(value) &&
    !/^(true|false|null|undefined|\d+)$/i.test(value);

  return nameIsSecret && valueLooksSecret;
}

/**
 * Get line number from content and character index
 */
export function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

/**
 * Get column number from content and character index
 */
export function getColumnNumber(content: string, index: number): number {
  const beforeIndex = content.substring(0, index);
  const lastNewlineIndex = beforeIndex.lastIndexOf('\n');
  return index - lastNewlineIndex;
}

/**
 * Check if a file should be analyzed for security issues
 */
export function shouldAnalyzeFile(context: AnalysisContext): boolean {
  const relevantExtensions = [
    '.js', '.ts', '.jsx', '.tsx',
    '.py', '.go', '.java', '.php', '.rb',
    '.cs', '.cpp', '.c', '.h'
  ];
  
  const hasRelevantExtension = relevantExtensions.some(ext => 
    context.filePath.endsWith(ext)
  );
  
  // Skip test files, node_modules, and build directories
  const shouldSkip = [
    /\.(test|spec)\.(js|ts|jsx|tsx)$/i,
    /node_modules/,
    /dist\//,
    /build\//,
    /\.git\//,
    /coverage\//,
    /\.next\//,
    /\.nuxt\//,
  ].some(pattern => pattern.test(context.filePath));
  
  return hasRelevantExtension && !shouldSkip;
}

/**
 * Normalize finding severity based on context
 */
export function normalizeSeverity(
  baseSeverity: SecurityFinding['severity'],
  context: {
    isProduction?: boolean;
    isPublicEndpoint?: boolean;
    hasExistingSecurity?: boolean;
  }
): SecurityFinding['severity'] {
  let severity = baseSeverity;
  
  // Increase severity for production environments
  if (context.isProduction) {
    if (severity === 'low') severity = 'medium';
    if (severity === 'medium') severity = 'high';
  }
  
  // Increase severity for public endpoints
  if (context.isPublicEndpoint) {
    if (severity === 'low') severity = 'medium';
  }
  
  // Decrease severity if there's existing security
  if (context.hasExistingSecurity) {
    if (severity === 'high') severity = 'medium';
    if (severity === 'medium') severity = 'low';
  }
  
  return severity;
}

