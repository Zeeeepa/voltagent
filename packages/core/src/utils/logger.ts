/**
 * logger.ts
 * 
 * Logging utility for the voltagent framework
 */

/**
 * Log categories for better filtering and organization
 */
export enum LogCategory {
  SYSTEM = 'system',
  AGENT = 'agent',
  TOOLS = 'tools',
  MCP = 'mcp',
  EXECUTION = 'execution',
  MEMORY = 'memory',
  PROVIDER = 'provider',
  RETRIEVER = 'retriever',
  VOICE = 'voice'
}

/**
 * Logger interface for consistent logging across the framework
 */
export interface Logger {
  /**
   * Log a debug message
   * @param message Message to log
   * @param category Optional category for the log
   * @param data Optional data to include with the log
   */
  debug(message: string, category?: LogCategory, data?: any): void;

  /**
   * Log an info message
   * @param message Message to log
   * @param category Optional category for the log
   * @param data Optional data to include with the log
   */
  info(message: string, category?: LogCategory, data?: any): void;

  /**
   * Log a warning message
   * @param message Message to log
   * @param category Optional category for the log
   * @param data Optional data to include with the log
   */
  warn(message: string, category?: LogCategory, data?: any): void;

  /**
   * Log an error message
   * @param message Message to log
   * @param error Optional error object
   * @param category Optional category for the log
   * @param data Optional data to include with the log
   */
  error(message: string, error?: Error, category?: LogCategory, data?: any): void;
}

/**
 * Default logger implementation that logs to console
 */
export class ConsoleLogger implements Logger {
  private readonly minLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(minLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.minLevel = minLevel;
  }

  debug(message: string, category?: LogCategory, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG]${category ? ` [${category}]` : ''} ${message}`, data || '');
    }
  }

  info(message: string, category?: LogCategory, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO]${category ? ` [${category}]` : ''} ${message}`, data || '');
    }
  }

  warn(message: string, category?: LogCategory, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN]${category ? ` [${category}]` : ''} ${message}`, data || '');
    }
  }

  error(message: string, error?: Error, category?: LogCategory, data?: any): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR]${category ? ` [${category}]` : ''} ${message}`, error || '', data || '');
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }
}

/**
 * Create a default logger instance
 */
export function createLogger(minLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'): Logger {
  return new ConsoleLogger(minLevel);
}

/**
 * Default logger instance
 */
export const defaultLogger = createLogger(
  (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
);

