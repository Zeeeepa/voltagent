/**
 * Log levels
 */
export enum LogLevel {
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
export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? LogLevel.INFO;
  const useColors = options.useColors ?? true;
  const silent = options.silent ?? false;

  /**
   * Log a message with the specified level
   * @param logLevel The log level
   * @param message The message to log
   * @param meta Additional metadata
   */
  function log(
    logLevel: keyof typeof LogLevel,
    message: string,
    meta: Record<string, unknown> = {}
  ): void {
    // Skip logging if silent mode is enabled
    if (silent) {
      return;
    }

    const numericLevel = LogLevel[logLevel];
    if (numericLevel === undefined || numericLevel < level) {
      return;
    }

    const prefix = getPrefix(logLevel);
    const formattedMessage = useColors ? colorize(logLevel, message) : message;

    // Use console.log for all logs to avoid issues with stdout/stderr mixing
    console.log(prefix, formattedMessage, Object.keys(meta).length > 0 ? meta : "");
  }

  /**
   * Get the prefix for a log level
   * @param logLevel The log level
   * @returns The prefix
   */
  function getPrefix(logLevel: keyof typeof LogLevel): string {
    if (!useColors) {
      return `[${logLevel}]`;
    }

    switch (logLevel) {
      case "DEBUG":
        return "\x1b[90m[DEBUG]\x1b[0m"; // Gray
      case "INFO":
        return "\x1b[34m[INFO]\x1b[0m"; // Blue
      case "WARN":
        return "\x1b[33m[WARN]\x1b[0m"; // Yellow
      case "ERROR":
        return "\x1b[31m[ERROR]\x1b[0m"; // Red
      case "SUCCESS":
        return "\x1b[32m[SUCCESS]\x1b[0m"; // Green
      default:
        return `[${logLevel}]`;
    }
  }

  /**
   * Colorize a message based on log level
   * @param logLevel The log level
   * @param message The message to colorize
   * @returns The colorized message
   */
  function colorize(logLevel: keyof typeof LogLevel, message: string): string {
    if (!useColors) {
      return message;
    }

    switch (logLevel) {
      case "DEBUG":
        return `\x1b[90m${message}\x1b[0m`; // Gray
      case "INFO":
        return `\x1b[34m${message}\x1b[0m`; // Blue
      case "WARN":
        return `\x1b[33m${message}\x1b[0m`; // Yellow
      case "ERROR":
        return `\x1b[31m${message}\x1b[0m`; // Red
      case "SUCCESS":
        return `\x1b[32m${message}\x1b[0m`; // Green
      default:
        return message;
    }
  }

  return {
    debug: (message, meta) => log("DEBUG", message, meta),
    info: (message, meta) => log("INFO", message, meta),
    warn: (message, meta) => log("WARN", message, meta),
    error: (message, meta) => log("ERROR", message, meta),
    success: (message, meta) => log("SUCCESS", message, meta),
    log,
  };
}

// Create a default logger instance
export const logger = createLogger();

