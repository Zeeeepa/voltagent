import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import WebSocket from "ws";
import type {
  AgentAPIConfig,
  AgentAPIMessage,
  AgentAPIStatus,
  DeploymentError,
} from "../types";

export class AgentAPIClient {
  private httpClient: AxiosInstance;
  private config: AgentAPIConfig;
  private wsConnection?: WebSocket;
  private eventHandlers: Map<string, (data: any) => void> = new Map();

  constructor(config: AgentAPIConfig) {
    this.config = {
      port: 3284,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    this.httpClient = axios.create({
      baseURL: `${this.config.baseUrl}:${this.config.port}`,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        throw this.createDeploymentError(
          `AgentAPI request failed: ${error.message}`,
          "AGENTAPI_REQUEST_FAILED",
          error
        );
      }
    );
  }

  /**
   * Send a message to the agent
   */
  async sendMessage(content: string, type: "user" | "agent" = "user"): Promise<void> {
    const message: AgentAPIMessage = {
      content,
      type,
      timestamp: new Date().toISOString(),
    };

    await this.retryRequest(async () => {
      const response = await this.httpClient.post("/message", message);
      return response.data;
    });
  }

  /**
   * Get all messages from the conversation
   */
  async getMessages(): Promise<AgentAPIMessage[]> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<AgentAPIMessage[]> = await this.httpClient.get("/messages");
      return response.data;
    });
  }

  /**
   * Get the current status of the agent
   */
  async getStatus(): Promise<AgentAPIStatus> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<AgentAPIStatus> = await this.httpClient.get("/status");
      return response.data;
    });
  }

  /**
   * Wait for agent to become stable
   */
  async waitForStable(timeoutMs: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getStatus();
      if (status.status === "stable") {
        return;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw this.createDeploymentError(
      `Agent did not become stable within ${timeoutMs}ms`,
      "AGENT_TIMEOUT"
    );
  }

  /**
   * Connect to the events stream
   */
  connectToEvents(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${this.config.baseUrl.replace(/^https?:\\/\\//, "")}:${this.config.port}/events`;
      
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.on("open", () => {
        console.log("Connected to AgentAPI events stream");
        resolve();
      });

      this.wsConnection.on("message", (data: WebSocket.Data) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleEvent(event);
        } catch (error) {
          console.error("Failed to parse event data:", error);
        }
      });

      this.wsConnection.on("error", (error) => {
        console.error("WebSocket error:", error);
        reject(this.createDeploymentError(
          `WebSocket connection failed: ${error.message}`,
          "WEBSOCKET_ERROR",
          error
        ));
      });

      this.wsConnection.on("close", () => {
        console.log("Disconnected from AgentAPI events stream");
        this.wsConnection = undefined;
      });
    });
  }

  /**
   * Disconnect from events stream
   */
  disconnectFromEvents(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = undefined;
    }
  }

  /**
   * Register an event handler
   */
  onEvent(eventType: string, handler: (data: any) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Remove an event handler
   */
  offEvent(eventType: string): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Handle incoming events
   */
  private handleEvent(event: any): void {
    const handler = this.eventHandlers.get(event.event);
    if (handler) {
      handler(event.data);
    }

    // Also call generic event handler if registered
    const genericHandler = this.eventHandlers.get("*");
    if (genericHandler) {
      genericHandler(event);
    }
  }

  /**
   * Execute a command and wait for completion
   */
  async executeCommand(command: string, timeoutMs: number = 300000): Promise<AgentAPIMessage[]> {
    // Send the command
    await this.sendMessage(command);

    // Wait for the agent to process and become stable
    await this.waitForStable(timeoutMs);

    // Get the conversation history
    return this.getMessages();
  }

  /**
   * Check if AgentAPI server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.status === "stable" || status.status === "running";
    } catch (error) {
      return false;
    }
  }

  /**
   * Retry a request with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt >= (this.config.retryAttempts || 3)) {
        throw error;
      }

      const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.retryRequest(requestFn, attempt + 1);
    }
  }

  /**
   * Create a standardized deployment error
   */
  private createDeploymentError(
    message: string,
    code: string,
    originalError?: any
  ): DeploymentError {
    const error = new Error(message) as DeploymentError;
    error.code = code;
    error.phase = "agentapi_communication";
    error.recoverable = code !== "AGENT_TIMEOUT";
    
    if (originalError) {
      error.stack = originalError.stack;
    }
    
    return error;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disconnectFromEvents();
    this.eventHandlers.clear();
  }
}

