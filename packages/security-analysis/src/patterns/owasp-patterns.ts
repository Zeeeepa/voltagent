/**
 * OWASP Top 10 security vulnerability patterns
 */

import { SecurityPattern, VulnerabilityType } from '../types';

export const OWASP_TOP_10_PATTERNS: SecurityPattern[] = [
  // A01:2021 – Broken Access Control
  {
    id: 'owasp-a01-broken-access-control',
    name: 'Broken Access Control',
    description: 'Missing or inadequate access control checks',
    type: 'authorization_weakness',
    risk_level: 'high',
    owasp_category: 'A01:2021',
    cwe_id: 'CWE-284',
    pattern: /(?:req\.user|session|auth|token).*(?:admin|role|permission).*(?:===|==|\!=|!==).*(?:true|false|"admin"|'admin')/gi,
    file_extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.java', '.cs'],
    confidence: 75,
    suggestion: 'Implement proper role-based access control with centralized authorization checks',
    examples: {
      vulnerable: 'if (req.user.role === "admin") { /* admin logic */ }',
      secure: 'if (authService.hasPermission(req.user, "admin_access")) { /* admin logic */ }'
    }
  },

  // A02:2021 – Cryptographic Failures
  {
    id: 'owasp-a02-weak-crypto',
    name: 'Weak Cryptographic Implementation',
    description: 'Use of weak or deprecated cryptographic algorithms',
    type: 'insecure_crypto',
    risk_level: 'high',
    owasp_category: 'A02:2021',
    cwe_id: 'CWE-327',
    pattern: /(?:md5|sha1|des|3des|rc4|md4)(?:\(|\s|$)/gi,
    file_extensions: ['.js', '.ts', '.py', '.java', '.cs', '.php', '.go'],
    confidence: 90,
    suggestion: 'Use strong cryptographic algorithms like AES-256, SHA-256, or bcrypt',
    examples: {
      vulnerable: 'crypto.createHash("md5").update(password).digest("hex")',
      secure: 'bcrypt.hash(password, 12)'
    }
  },

  // A03:2021 – Injection
  {
    id: 'owasp-a03-sql-injection',
    name: 'SQL Injection Vulnerability',
    description: 'Potential SQL injection through unsanitized input',
    type: 'sql_injection',
    risk_level: 'critical',
    owasp_category: 'A03:2021',
    cwe_id: 'CWE-89',
    pattern: /(?:query|execute|exec).*(?:\+|concat|\$\{|\%s|\%d).*(?:req\.|input|params|body)/gi,
    file_extensions: ['.js', '.ts', '.py', '.php', '.java', '.cs', '.go'],
    confidence: 85,
    suggestion: 'Use parameterized queries or prepared statements',
    examples: {
      vulnerable: 'query("SELECT * FROM users WHERE id = " + req.params.id)',
      secure: 'query("SELECT * FROM users WHERE id = ?", [req.params.id])'
    }
  },

  {
    id: 'owasp-a03-command-injection',
    name: 'Command Injection Vulnerability',
    description: 'Potential command injection through unsanitized input',
    type: 'command_injection',
    risk_level: 'critical',
    owasp_category: 'A03:2021',
    cwe_id: 'CWE-78',
    pattern: /(?:exec|system|spawn|eval).*(?:\+|concat|\$\{).*(?:req\.|input|params|body)/gi,
    file_extensions: ['.js', '.ts', '.py', '.php', '.java', '.cs', '.go'],
    confidence: 90,
    suggestion: 'Validate and sanitize all user input, use allowlists for commands',
    examples: {
      vulnerable: 'exec("ls " + req.params.directory)',
      secure: 'exec("ls", [sanitizedDirectory])'
    }
  },

  // A04:2021 – Insecure Design
  {
    id: 'owasp-a04-insecure-design',
    name: 'Missing Rate Limiting',
    description: 'No rate limiting on sensitive endpoints',
    type: 'dos_vulnerability',
    risk_level: 'medium',
    owasp_category: 'A04:2021',
    cwe_id: 'CWE-770',
    pattern: /(?:app\.post|router\.post|@Post).*(?:login|register|reset|forgot)(?!.*rate.*limit)/gi,
    file_extensions: ['.js', '.ts', '.py', '.java', '.cs'],
    confidence: 60,
    suggestion: 'Implement rate limiting on authentication and sensitive endpoints',
    examples: {
      vulnerable: 'app.post("/login", loginHandler)',
      secure: 'app.post("/login", rateLimit({max: 5}), loginHandler)'
    }
  },

  // A05:2021 – Security Misconfiguration
  {
    id: 'owasp-a05-debug-enabled',
    name: 'Debug Mode Enabled',
    description: 'Debug mode or verbose error reporting enabled in production',
    type: 'information_disclosure',
    risk_level: 'medium',
    owasp_category: 'A05:2021',
    cwe_id: 'CWE-489',
    pattern: /(?:debug|DEBUG)\s*[:=]\s*(?:true|True|1|"true"|'true')/gi,
    file_extensions: ['.js', '.ts', '.py', '.java', '.cs', '.php', '.env'],
    confidence: 80,
    suggestion: 'Disable debug mode and verbose error reporting in production',
    examples: {
      vulnerable: 'DEBUG = true',
      secure: 'DEBUG = process.env.NODE_ENV !== "production"'
    }
  },

  // A06:2021 – Vulnerable and Outdated Components
  {
    id: 'owasp-a06-hardcoded-secrets',
    name: 'Hardcoded Secrets',
    description: 'Hardcoded passwords, API keys, or secrets in source code',
    type: 'hardcoded_secrets',
    risk_level: 'critical',
    owasp_category: 'A06:2021',
    cwe_id: 'CWE-798',
    pattern: /(?:password|secret|key|token|api_key)\s*[:=]\s*["'][^"']{8,}["']/gi,
    file_extensions: ['.js', '.ts', '.py', '.java', '.cs', '.php', '.go'],
    confidence: 85,
    suggestion: 'Use environment variables or secure key management systems',
    examples: {
      vulnerable: 'const apiKey = "sk-1234567890abcdef"',
      secure: 'const apiKey = process.env.API_KEY'
    }
  },

  // A07:2021 – Identification and Authentication Failures
  {
    id: 'owasp-a07-weak-session',
    name: 'Weak Session Management',
    description: 'Insecure session configuration',
    type: 'authentication_bypass',
    risk_level: 'high',
    owasp_category: 'A07:2021',
    cwe_id: 'CWE-384',
    pattern: /session.*(?:secure\s*:\s*false|httpOnly\s*:\s*false|sameSite\s*:\s*false)/gi,
    file_extensions: ['.js', '.ts', '.py', '.php'],
    confidence: 85,
    suggestion: 'Configure sessions with secure, httpOnly, and sameSite flags',
    examples: {
      vulnerable: 'session({secure: false, httpOnly: false})',
      secure: 'session({secure: true, httpOnly: true, sameSite: "strict"})'
    }
  },

  // A08:2021 – Software and Data Integrity Failures
  {
    id: 'owasp-a08-insecure-deserialization',
    name: 'Insecure Deserialization',
    description: 'Unsafe deserialization of untrusted data',
    type: 'insecure_deserialization',
    risk_level: 'high',
    owasp_category: 'A08:2021',
    cwe_id: 'CWE-502',
    pattern: /(?:JSON\.parse|pickle\.loads|unserialize|deserialize).*(?:req\.|input|params|body)/gi,
    file_extensions: ['.js', '.ts', '.py', '.php', '.java', '.cs'],
    confidence: 80,
    suggestion: 'Validate and sanitize data before deserialization, use safe parsers',
    examples: {
      vulnerable: 'JSON.parse(req.body.data)',
      secure: 'JSON.parse(validator.escape(req.body.data))'
    }
  },

  // A09:2021 – Security Logging and Monitoring Failures
  {
    id: 'owasp-a09-insufficient-logging',
    name: 'Insufficient Security Logging',
    description: 'Missing security event logging',
    type: 'information_disclosure',
    risk_level: 'low',
    owasp_category: 'A09:2021',
    cwe_id: 'CWE-778',
    pattern: /(?:login|authentication|authorization)(?!.*log)/gi,
    file_extensions: ['.js', '.ts', '.py', '.java', '.cs', '.php'],
    confidence: 50,
    suggestion: 'Implement comprehensive security event logging',
    examples: {
      vulnerable: 'if (auth.failed) { return error; }',
      secure: 'if (auth.failed) { logger.security("Failed login attempt", {user, ip}); return error; }'
    }
  },

  // A10:2021 – Server-Side Request Forgery (SSRF)
  {
    id: 'owasp-a10-ssrf',
    name: 'Server-Side Request Forgery',
    description: 'Potential SSRF through unvalidated URL requests',
    type: 'open_redirect',
    risk_level: 'high',
    owasp_category: 'A10:2021',
    cwe_id: 'CWE-918',
    pattern: /(?:fetch|request|axios|http\.get).*(?:req\.|input|params|body).*url/gi,
    file_extensions: ['.js', '.ts', '.py', '.java', '.cs', '.php', '.go'],
    confidence: 75,
    suggestion: 'Validate and allowlist URLs, implement URL parsing and validation',
    examples: {
      vulnerable: 'fetch(req.body.url)',
      secure: 'fetch(validateAndSanitizeUrl(req.body.url))'
    }
  },

  // XSS Vulnerabilities
  {
    id: 'xss-reflected',
    name: 'Reflected XSS Vulnerability',
    description: 'Potential reflected XSS through unsanitized output',
    type: 'xss_vulnerability',
    risk_level: 'high',
    owasp_category: 'A03:2021',
    cwe_id: 'CWE-79',
    pattern: /(?:innerHTML|outerHTML|document\.write).*(?:req\.|input|params|body)/gi,
    file_extensions: ['.js', '.ts', '.jsx', '.tsx', '.php'],
    confidence: 85,
    suggestion: 'Sanitize all user input before rendering, use textContent instead of innerHTML',
    examples: {
      vulnerable: 'element.innerHTML = req.params.message',
      secure: 'element.textContent = sanitize(req.params.message)'
    }
  },

  // Path Traversal
  {
    id: 'path-traversal',
    name: 'Path Traversal Vulnerability',
    description: 'Potential path traversal attack',
    type: 'path_traversal',
    risk_level: 'high',
    owasp_category: 'A01:2021',
    cwe_id: 'CWE-22',
    pattern: /(?:readFile|writeFile|open).*(?:req\.|input|params|body).*(?:\.\.|\/)/gi,
    file_extensions: ['.js', '.ts', '.py', '.java', '.cs', '.php', '.go'],
    confidence: 80,
    suggestion: 'Validate file paths, use path.resolve() and check against allowlisted directories',
    examples: {
      vulnerable: 'fs.readFile(req.params.filename)',
      secure: 'fs.readFile(path.resolve(SAFE_DIR, sanitizeFilename(req.params.filename)))'
    }
  }
];

export const getPatternsByCategory = (category: string): SecurityPattern[] => {
  return OWASP_TOP_10_PATTERNS.filter(pattern => pattern.owasp_category === category);
};

export const getPatternsByType = (type: VulnerabilityType): SecurityPattern[] => {
  return OWASP_TOP_10_PATTERNS.filter(pattern => pattern.type === type);
};

export const getPatternsByRiskLevel = (riskLevel: string): SecurityPattern[] => {
  return OWASP_TOP_10_PATTERNS.filter(pattern => pattern.risk_level === riskLevel);
};

