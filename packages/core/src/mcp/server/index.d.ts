import type {
  IMCPServer,
  MCPServerOptions,
  MCPServerStartOptions,
  ToolRegistrationFn,
} from "./types";
/**
 * MCP server implementation
 */
export declare class MCPServer implements IMCPServer {
  /**
   * FastMCP server instance
   */
  private server;
  /**
   * Server options
   */
  private options;
  /**
   * Whether the server is initialized
   */
  private initialized;
  /**
   * Async operation manager
   */
  private asyncManager;
  /**
   * Tool registration functions
   */
  private toolRegistrations;
  /**
   * Create a new MCP server
   * @param options Server options
   */
  constructor(options?: Partial<MCPServerOptions>);
  /**
   * Initialize the MCP server
   */
  init(): Promise<this>;
  /**
   * Start the MCP server
   * @param options Start options
   */
  start(options?: MCPServerStartOptions): Promise<this>;
  /**
   * Stop the MCP server
   */
  stop(): Promise<void>;
  /**
   * Register a tool with the server
   * @param registrationFn Tool registration function
   */
  registerTool(registrationFn: ToolRegistrationFn): void;
}
export * from "./types";
export * from "./async-manager";
export * from "./logger";
