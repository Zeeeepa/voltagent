import winston from 'winston'

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug'
  format: 'json' | 'simple'
  file?: string
}

/**
 * Logger utility for the PR analysis system
 */
export class Logger {
  private readonly logger: winston.Logger
  private readonly component: string

  constructor(component: string, config: LoggingConfig) {
    this.component = component
    
    const formats = []
    
    // Add timestamp
    formats.push(winston.format.timestamp())
    
    // Add component label
    formats.push(winston.format.label({ label: component }))
    
    // Add format based on config
    if (config.format === 'json') {
      formats.push(winston.format.json())
    } else {
      formats.push(winston.format.simple())
    }
    
    // Create transports
    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: config.level,
        format: winston.format.combine(...formats)
      })
    ]
    
    // Add file transport if specified
    if (config.file) {
      transports.push(
        new winston.transports.File({
          filename: config.file,
          level: config.level,
          format: winston.format.combine(...formats)
        })
      )
    }
    
    this.logger = winston.createLogger({
      level: config.level,
      transports
    })
  }

  error(message: string, error?: any): void {
    this.logger.error(message, { error: this.serializeError(error) })
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta)
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta)
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta)
  }

  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }
    return error
  }
}

