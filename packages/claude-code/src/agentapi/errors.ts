export class AgentAPIError extends Error {
  public readonly statusCode?: number;
  public readonly response?: string;

  constructor(message: string, statusCode?: number, response?: string) {
    super(message);
    this.name = 'AgentAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class AgentAPITimeoutError extends AgentAPIError {
  constructor(message: string) {
    super(message);
    this.name = 'AgentAPITimeoutError';
  }
}

export class AgentAPIConnectionError extends AgentAPIError {
  constructor(message: string) {
    super(message);
    this.name = 'AgentAPIConnectionError';
  }
}

export class AgentAPIValidationError extends AgentAPIError {
  constructor(message: string, validationErrors?: any[]) {
    super(message);
    this.name = 'AgentAPIValidationError';
    this.response = JSON.stringify(validationErrors);
  }
}

