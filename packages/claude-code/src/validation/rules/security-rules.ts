import { ValidationRule } from '../../types/index.js';

export const SECURITY_RULES: ValidationRule[] = [
  {
    id: 'no-eval',
    name: 'No Eval Usage',
    description: 'Disallow use of eval() function which can execute arbitrary code',
    severity: 'critical',
    category: 'security',
    enabled: true,
  },
  {
    id: 'no-innerHTML',
    name: 'No innerHTML Usage',
    description: 'Disallow innerHTML which can lead to XSS vulnerabilities',
    severity: 'high',
    category: 'security',
    enabled: true,
  },
  {
    id: 'no-hardcoded-secrets',
    name: 'No Hardcoded Secrets',
    description: 'Detect hardcoded API keys, passwords, and other secrets',
    severity: 'critical',
    category: 'security',
    enabled: true,
  },
  {
    id: 'require-https',
    name: 'Require HTTPS',
    description: 'Ensure all external requests use HTTPS',
    severity: 'high',
    category: 'security',
    enabled: true,
  },
  {
    id: 'no-sql-injection',
    name: 'No SQL Injection',
    description: 'Detect potential SQL injection vulnerabilities',
    severity: 'critical',
    category: 'security',
    enabled: true,
  },
  {
    id: 'secure-random',
    name: 'Secure Random Generation',
    description: 'Use cryptographically secure random number generation',
    severity: 'medium',
    category: 'security',
    enabled: true,
  },
  {
    id: 'no-weak-crypto',
    name: 'No Weak Cryptography',
    description: 'Avoid weak cryptographic algorithms',
    severity: 'high',
    category: 'security',
    enabled: true,
  },
];

