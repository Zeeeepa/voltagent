/**
 * Log levels
 */
export declare enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
}
/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  success: (message: string, meta?: Record<string, unknown>) => void;
  log: (level: keyof typeof LogLevel, message: string, meta?: Record<string, unknown>) => void;
}
/**
 * Logger options
 */
export interface LoggerOptions {
  /**
   * Minimum log level to display
   * @default LogLevel.INFO
   */
  level?: LogLevel;
  /**
   * Whether to use colors in the console
   * @default true
   */
  useColors?: boolean;
  /**
   * Whether to silence all logs
   * @default false
   */
  silent?: boolean;
}
/**
 * Create a logger
 * @param options Logger options
 * @returns Logger instance
 */
export declare function createLogger(options?: LoggerOptions): Logger;
export declare const logger: Logger;
