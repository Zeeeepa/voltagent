Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
/**
 * Log levels
 */
let LogLevel;
((LogLevel) => {
  LogLevel[(LogLevel.DEBUG = 0)] = "DEBUG";
  LogLevel[(LogLevel.INFO = 1)] = "INFO";
  LogLevel[(LogLevel.WARN = 2)] = "WARN";
  LogLevel[(LogLevel.ERROR = 3)] = "ERROR";
  LogLevel[(LogLevel.SUCCESS = 4)] = "SUCCESS";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Create a logger
 * @param options Logger options
 * @returns Logger instance
 */
function createLogger(options = {}) {
  const level = options.level ?? LogLevel.INFO;
  const useColors = options.useColors ?? true;
  const silent = options.silent ?? false;
  /**
   * Log a message with the specified level
   * @param logLevel The log level
   * @param message The message to log
   * @param meta Additional metadata
   */
  function log(logLevel, message, meta = {}) {
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
  function getPrefix(logLevel) {
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
  function colorize(logLevel, message) {
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
exports.logger = createLogger();
//# sourceMappingURL=logger.js.map
