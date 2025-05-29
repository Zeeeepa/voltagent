export interface LogEntry {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
  component?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogEntry["level"] = "info";

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogEntry["level"]): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogEntry["level"]): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private log(level: LogEntry["level"], message: string, metadata?: Record<string, unknown>, component?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata,
      component,
    };

    const logMessage = this.formatLogEntry(entry);
    
    switch (level) {
      case "debug":
        console.debug(logMessage);
        break;
      case "info":
        console.info(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "error":
        console.error(logMessage);
        break;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const component = entry.component ? `[${entry.component}]` : "";
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : "";
    
    return `${timestamp} ${entry.level.toUpperCase()} ${component} ${entry.message}${metadata}`;
  }

  debug(message: string, metadata?: Record<string, unknown>, component?: string): void {
    this.log("debug", message, metadata, component);
  }

  info(message: string, metadata?: Record<string, unknown>, component?: string): void {
    this.log("info", message, metadata, component);
  }

  warn(message: string, metadata?: Record<string, unknown>, component?: string): void {
    this.log("warn", message, metadata, component);
  }

  error(message: string, metadata?: Record<string, unknown>, component?: string): void {
    this.log("error", message, metadata, component);
  }

  // Component-specific loggers
  database(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, metadata, "DATABASE");
  }

  workflow(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, metadata, "WORKFLOW");
  }

  taskQueue(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, metadata, "TASK_QUEUE");
  }
}

