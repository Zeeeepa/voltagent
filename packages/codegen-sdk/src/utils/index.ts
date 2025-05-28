import { CodegenSDKError } from '../types';

/**
 * Utility functions for the Codegen SDK
 */

/**
 * Validate GitHub repository format
 */
export function validateRepositoryFormat(repository: string): boolean {
  const repoRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  return repoRegex.test(repository);
}

/**
 * Extract owner and repo from repository string
 */
export function parseRepository(repository: string): { owner: string; repo: string } {
  if (!validateRepositoryFormat(repository)) {
    throw new CodegenSDKError(
      'Invalid repository format. Expected "owner/repo"',
      'INVALID_REPOSITORY_FORMAT'
    );
  }

  const [owner, repo] = repository.split('/');
  return { owner, repo };
}

/**
 * Generate secure random string
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sanitize text for safe processing
 */
export function sanitizeText(text: string): string {
  // Remove potentially harmful characters and normalize whitespace
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract programming language from file extension
 */
export function detectLanguageFromExtension(filename: string): string {
  const extensionMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml'
  };

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return extensionMap[extension] || 'text';
}

/**
 * Format code with basic indentation
 */
export function formatCode(code: string, language: string): string {
  // Basic code formatting - in a real implementation, you'd use language-specific formatters
  const lines = code.split('\n');
  let indentLevel = 0;
  const indentSize = 2;

  const formattedLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) return '';

    // Decrease indent for closing brackets
    if (trimmedLine.match(/^[}\])]/) && indentLevel > 0) {
      indentLevel--;
    }

    const formattedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;

    // Increase indent for opening brackets
    if (trimmedLine.match(/[{\[(]$/)) {
      indentLevel++;
    }

    return formattedLine;
  });

  return formattedLines.join('\n');
}

/**
 * Calculate text similarity using simple algorithm
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get time ago string
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

/**
 * Create a promise that resolves after specified delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if code contains potential security issues
 */
export function hasSecurityConcerns(code: string): { hasConcerns: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for common security anti-patterns
  const securityPatterns = [
    { pattern: /eval\s*\(/, issue: 'Use of eval() function' },
    { pattern: /innerHTML\s*=/, issue: 'Direct innerHTML assignment' },
    { pattern: /document\.write\s*\(/, issue: 'Use of document.write()' },
    { pattern: /\$\{.*\}/, issue: 'Template literal injection risk' },
    { pattern: /exec\s*\(/, issue: 'Code execution function' },
    { pattern: /system\s*\(/, issue: 'System command execution' },
    { pattern: /shell_exec\s*\(/, issue: 'Shell command execution' },
    { pattern: /password\s*=\s*["'][^"']+["']/, issue: 'Hardcoded password' },
    { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/, issue: 'Hardcoded API key' },
    { pattern: /secret\s*=\s*["'][^"']+["']/, issue: 'Hardcoded secret' }
  ];

  for (const { pattern, issue } of securityPatterns) {
    if (pattern.test(code)) {
      issues.push(issue);
    }
  }

  return {
    hasConcerns: issues.length > 0,
    issues
  };
}

