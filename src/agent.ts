/**
 * AI Agent base class with async operations
 */

export interface AgentConfig {
  name: string;
  timeout?: number;
  retryAttempts?: number;
  apiEndpoint?: string;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export class Agent {
  private config: AgentConfig;
  private isProcessing: boolean = false;

  constructor(config: AgentConfig) {
    this.config = {
      timeout: 5000,
      retryAttempts: 3,
      ...config
    };
  }

  /**
   * Async method to initialize the agent
   */
  async initialize(): Promise<void> {
    await this.delay(100); // Simulate initialization delay
    console.log(`Agent ${this.config.name} initialized`);
  }

  /**
   * Process a request asynchronously
   */
  async processRequest(input: string): Promise<AgentResponse> {
    if (this.isProcessing) {
      throw new Error('Agent is already processing a request');
    }

    this.isProcessing = true;

    try {
      // Simulate async processing
      await this.delay(Math.random() * 1000 + 500);
      
      if (input.includes('error')) {
        throw new Error('Processing failed');
      }

      const response: AgentResponse = {
        success: true,
        data: `Processed: ${input}`,
        timestamp: Date.now()
      };

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Batch process multiple requests
   */
  async batchProcess(inputs: string[]): Promise<AgentResponse[]> {
    const promises = inputs.map(input => this.processRequest(input));
    return Promise.all(promises);
  }

  /**
   * Process with timeout
   */
  async processWithTimeout(input: string, timeout?: number): Promise<AgentResponse> {
    const timeoutMs = timeout || this.config.timeout!;
    
    return Promise.race([
      this.processRequest(input),
      this.createTimeoutPromise(timeoutMs)
    ]);
  }

  /**
   * Stream processing simulation
   */
  async *streamProcess(inputs: string[]): AsyncGenerator<AgentResponse, void, unknown> {
    for (const input of inputs) {
      yield await this.processRequest(input);
    }
  }

  /**
   * Health check with async validation
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    
    try {
      await this.delay(50); // Simulate health check
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      const latency = Date.now() - start;
      return { healthy: false, latency };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.delay(100);
    console.log(`Agent ${this.config.name} cleaned up`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    });
  }

  get name(): string {
    return this.config.name;
  }

  get isActive(): boolean {
    return this.isProcessing;
  }
}

