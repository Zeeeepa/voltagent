import { FastMCP } from "fastmcp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { asyncOperationManager } from "./async-manager";
import { logger } from "./logger";
import type { IMCPServer, MCPServerOptions, MCPServerStartOptions, ToolRegistrationFn } from "./types";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MCP server implementation
 */
export class MCPServer implements IMCPServer {
  /**
   * FastMCP server instance
   */
  private server: FastMCP;

  /**
   * Server options
   */
  private options: MCPServerOptions;

  /**
   * Whether the server is initialized
   */
  private initialized = false;

  /**
   * Async operation manager
   */
  private asyncManager = asyncOperationManager;

  /**
   * Tool registration functions
   */
  private toolRegistrations: ToolRegistrationFn[] = [];

  /**
   * Create a new MCP server
   * @param options Server options
   */
  constructor(options?: Partial<MCPServerOptions>) {
    // Try to get version from package.json
    let version = "0.1.0";
    try {
      const packagePath = path.join(__dirname, "../../../../../package.json");
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        version = packageJson.version || version;
      }
    } catch (error) {
      logger.warn(`Failed to get version from package.json: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.options = {
      name: "VoltAgent MCP Server",
      version,
      ...options,
    };

    this.server = new FastMCP(this.options);
    
    // Add empty resource and resource template
    this.server.addResource({});
    this.server.addResourceTemplate({});

    // Bind methods
    this.init = this.init.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.registerTool = this.registerTool.bind(this);
  }

  /**
   * Initialize the MCP server
   */
  async init(): Promise<this> {
    if (this.initialized) return this;

    // Register all tools
    for (const registrationFn of this.toolRegistrations) {
      try {
        registrationFn(this.server, this.asyncManager);
      } catch (error) {
        logger.error(`Failed to register tool: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.initialized = true;
    return this;
  }

  /**
   * Start the MCP server
   * @param options Start options
   */
  async start(options?: MCPServerStartOptions): Promise<this> {
    if (!this.initialized) {
      await this.init();
    }

    const startOptions = {
      transportType: options?.transportType || "stdio",
      timeout: options?.timeout || 120000, // 2 minutes
    };

    // Start the FastMCP server
    await this.server.start({
      transportType: startOptions.transportType,
      timeout: startOptions.timeout,
    });

    logger.info(`MCP server started with transport: ${startOptions.transportType}`);
    return this;
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await this.server.stop();
      logger.info("MCP server stopped");
    }
  }

  /**
   * Register a tool with the MCP server
   * @param registrationFn Tool registration function
   */
  registerTool(registrationFn: ToolRegistrationFn): void {
    this.toolRegistrations.push(registrationFn);
    
    // If already initialized, register the tool immediately
    if (this.initialized && this.server) {
      try {
        registrationFn(this.server, this.asyncManager);
        logger.debug("Registered tool with MCP server");
      } catch (error) {
        logger.error(`Failed to register tool: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

// Export types and utilities
export * from "./types";
export * from "./async-manager";
export * from "./logger";

