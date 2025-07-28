export interface BaseConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

export type LogLevelType = LogLevel[keyof LogLevel];

