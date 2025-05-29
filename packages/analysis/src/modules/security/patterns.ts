import { SecurityPattern, AuthPattern } from '../../types';

/**
 * Comprehensive security patterns for different frameworks and languages
 */
export const SECURITY_PATTERNS: Record<string, SecurityPattern[]> = {
  // Express.js / Node.js patterns
  express: [
    {
      name: 'unprotected_route',
      pattern: /(?:app\.|router\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?!.*(?:auth|authenticate|requireAuth|isAuthenticated|verifyToken))/gi,
      type: 'missing_authentication',
      severity: 'high',
      description: 'Route handler lacks authentication middleware',
      suggestion: 'Add authentication middleware: app.use(authenticateToken)',
      risk: 'unauthorized_access',
    },
    {
      name: 'admin_route_unprotected',
      pattern: /(?:app\.|router\.)(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*\/admin[^'"`]*)['"`]\s*,\s*(?!.*(?:requireRole|isAdmin|checkAdmin))/gi,
      type: 'missing_authentication',
      severity: 'critical',
      description: 'Admin route lacks role-based authorization',
      suggestion: 'Add admin role check: requireRole(\'admin\')',
      risk: 'unauthorized_admin_access',
    },
  ],

  // React / Frontend patterns
  react: [
    {
      name: 'unprotected_component',
      pattern: /function\s+(\w*Admin\w*|.*Dashboard.*|.*Settings.*)\s*\([^)]*\)\s*\{(?!.*(?:useAuth|isAuthenticated|checkAuth))/gi,
      type: 'missing_authentication',
      severity: 'medium',
      description: 'Protected component lacks authentication check',
      suggestion: 'Add authentication guard: const { isAuthenticated } = useAuth()',
      risk: 'unauthorized_component_access',
    },
    {
      name: 'hardcoded_api_key',
      pattern: /(?:apiKey|api_key|API_KEY)\s*[:=]\s*['"`][A-Za-z0-9]{20,}['"`]/gi,
      type: 'insecure_storage',
      severity: 'critical',
      description: 'API key hardcoded in frontend code',
      suggestion: 'Move API keys to environment variables',
      risk: 'api_key_exposure',
    },
  ],

  // Python / Django / Flask patterns
  python: [
    {
      name: 'django_unprotected_view',
      pattern: /@(?:api_view|require_http_methods)\s*\([^)]*\)\s*\n\s*def\s+(\w+)\s*\([^)]*\)(?!.*@(?:login_required|permission_required|user_passes_test))/gi,
      type: 'missing_authentication',
      severity: 'high',
      description: 'Django view lacks authentication decorator',
      suggestion: 'Add @login_required or @permission_required decorator',
      risk: 'unauthorized_view_access',
    },
    {
      name: 'flask_unprotected_route',
      pattern: /@app\.route\s*\([^)]*\)\s*\n\s*def\s+(\w+)\s*\([^)]*\)(?!.*@(?:login_required|auth\.login_required))/gi,
      type: 'missing_authentication',
      severity: 'high',
      description: 'Flask route lacks authentication decorator',
      suggestion: 'Add @login_required decorator',
      risk: 'unauthorized_route_access',
    },
  ],

  // Go patterns
  go: [
    {
      name: 'go_unprotected_handler',
      pattern: /http\.HandleFunc\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\s*\)(?!.*(?:AuthMiddleware|RequireAuth|CheckAuth))/gi,
      type: 'missing_authentication',
      severity: 'high',
      description: 'HTTP handler lacks authentication middleware',
      suggestion: 'Wrap handler with authentication middleware',
      risk: 'unauthorized_handler_access',
    },
  ],

  // Java / Spring patterns
  java: [
    {
      name: 'spring_unprotected_endpoint',
      pattern: /@(?:GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)\s*\([^)]*\)\s*\n\s*(?:public\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)(?!.*@(?:PreAuthorize|Secured|RolesAllowed))/gi,
      type: 'missing_authentication',
      severity: 'high',
      description: 'Spring endpoint lacks authorization annotation',
      suggestion: 'Add @PreAuthorize or @Secured annotation',
      risk: 'unauthorized_endpoint_access',
    },
  ],
};

/**
 * Authentication patterns for different frameworks
 */
export const AUTH_PATTERNS: Record<string, AuthPattern> = {
  express: {
    middleware: [
      /authenticate/gi,
      /requireAuth/gi,
      /isAuthenticated/gi,
      /verifyToken/gi,
      /checkAuth/gi,
      /passport\.authenticate/gi,
    ],
    decorators: [],
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
      /jsonwebtoken/gi,
      /Bearer\s+/gi,
    ],
    sessions: [
      /req\.session/gi,
      /express-session/gi,
      /session\(/gi,
    ],
  },

  react: {
    middleware: [],
    decorators: [],
    functions: [
      /useAuth/gi,
      /useAuthentication/gi,
      /checkAuth/gi,
      /isAuthenticated/gi,
    ],
    endpoints: [
      /\/api\/auth/gi,
      /\/login/gi,
      /\/logout/gi,
    ],
    tokens: [
      /localStorage\.getItem.*token/gi,
      /sessionStorage\.getItem.*token/gi,
      /Bearer\s+/gi,
    ],
    sessions: [
      /useSession/gi,
      /getSession/gi,
    ],
  },

  django: {
    middleware: [
      /AuthenticationMiddleware/gi,
      /SessionMiddleware/gi,
    ],
    decorators: [
      /@login_required/gi,
      /@permission_required/gi,
      /@user_passes_test/gi,
    ],
    functions: [
      /authenticate/gi,
      /login/gi,
      /logout/gi,
    ],
    endpoints: [
      /\/auth\//gi,
      /\/login\//gi,
      /\/logout\//gi,
      /\/admin\//gi,
    ],
    tokens: [
      /Token/gi,
      /JWT/gi,
    ],
    sessions: [
      /request\.session/gi,
      /SessionStore/gi,
    ],
  },

  spring: {
    middleware: [],
    decorators: [
      /@PreAuthorize/gi,
      /@Secured/gi,
      /@RolesAllowed/gi,
      /@EnableWebSecurity/gi,
    ],
    functions: [
      /authenticate/gi,
      /authorize/gi,
    ],
    endpoints: [
      /\/api\/auth/gi,
      /\/login/gi,
      /\/logout/gi,
      /\/admin/gi,
    ],
    tokens: [
      /JwtAuthenticationToken/gi,
      /BearerTokenAuthenticationToken/gi,
    ],
    sessions: [
      /HttpSession/gi,
      /SecurityContextHolder/gi,
    ],
  },
};

/**
 * Common vulnerability patterns across all frameworks
 */
export const COMMON_VULNERABILITY_PATTERNS: SecurityPattern[] = [
  {
    name: 'hardcoded_password',
    pattern: /(?:password|pwd|pass)\s*[:=]\s*['"`][^'"`]{6,}['"`]/gi,
    type: 'insecure_storage',
    severity: 'critical',
    description: 'Hardcoded password found in source code',
    suggestion: 'Use environment variables or secure configuration',
    risk: 'credential_exposure',
  },
  {
    name: 'hardcoded_secret',
    pattern: /(?:secret|SECRET|api_key|API_KEY|private_key)\s*[:=]\s*['"`][A-Za-z0-9+/]{20,}['"`]/gi,
    type: 'insecure_storage',
    severity: 'critical',
    description: 'Hardcoded secret or API key found',
    suggestion: 'Move secrets to environment variables',
    risk: 'secret_exposure',
  },
  {
    name: 'sql_injection_risk',
    pattern: /(?:query|execute|exec)\s*\(\s*['"`][^'"`]*\+[^'"`]*['"`]/gi,
    type: 'missing_authentication',
    severity: 'high',
    description: 'Potential SQL injection vulnerability',
    suggestion: 'Use parameterized queries or prepared statements',
    risk: 'sql_injection',
  },
  {
    name: 'weak_crypto',
    pattern: /(?:md5|sha1|des|rc4)\s*\(/gi,
    type: 'weak_authorization',
    severity: 'medium',
    description: 'Weak cryptographic algorithm detected',
    suggestion: 'Use stronger algorithms like SHA-256, AES, or bcrypt',
    risk: 'weak_encryption',
  },
  {
    name: 'debug_mode_enabled',
    pattern: /(?:debug|DEBUG)\s*[:=]\s*(?:true|True|TRUE|1)/gi,
    type: 'insecure_storage',
    severity: 'medium',
    description: 'Debug mode enabled in production code',
    suggestion: 'Disable debug mode in production environments',
    risk: 'information_disclosure',
  },
];

/**
 * Get security patterns for a specific framework
 */
export function getSecurityPatterns(framework: string): SecurityPattern[] {
  const frameworkPatterns = SECURITY_PATTERNS[framework.toLowerCase()] || [];
  return [...frameworkPatterns, ...COMMON_VULNERABILITY_PATTERNS];
}

/**
 * Get authentication patterns for a specific framework
 */
export function getAuthPatterns(framework: string): AuthPattern {
  return AUTH_PATTERNS[framework.toLowerCase()] || AUTH_PATTERNS.express;
}

/**
 * Detect framework from file content and path
 */
export function detectFramework(filePath: string, content: string): string {
  // Check file extensions and imports
  if (filePath.endsWith('.py')) {
    if (content.includes('django') || content.includes('from django')) return 'django';
    if (content.includes('flask') || content.includes('from flask')) return 'flask';
    return 'python';
  }
  
  if (filePath.endsWith('.java')) {
    if (content.includes('@SpringBootApplication') || content.includes('org.springframework')) return 'spring';
    return 'java';
  }
  
  if (filePath.endsWith('.go')) {
    return 'go';
  }
  
  if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
    if (content.includes('react') || content.includes('React')) return 'react';
  }
  
  if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
    if (content.includes('express') || content.includes('app.get') || content.includes('router.')) return 'express';
    if (content.includes('react') || content.includes('React')) return 'react';
    return 'node';
  }
  
  return 'unknown';
}

