const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: () => m[k] };
        }
        Object.defineProperty(o, k2, desc);
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
const __exportStar =
  (this && this.__exportStar) ||
  ((m, exports) => {
    for (const p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  });
const __importDefault =
  (this && this.__importDefault) || ((mod) => (mod?.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
const fastmcp_1 = require("fastmcp");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const async_manager_1 = require("./async-manager");
const logger_1 = require("./logger");
// Get package directory path
const packageDir = node_path_1.default.resolve(__dirname, "../../../../../");
/**
 * MCP server implementation
 */
class MCPServer {
  /**
   * Create a new MCP server
   * @param options Server options
   */
  constructor(options) {
    /**
     * Whether the server is initialized
     */
    this.initialized = false;
    /**
     * Async operation manager
     */
    this.asyncManager = async_manager_1.asyncOperationManager;
    /**
     * Tool registration functions
     */
    this.toolRegistrations = [];
    // Try to get version from package.json
    let version = "0.1.0";
    try {
      const packagePath = node_path_1.default.join(packageDir, "package.json");
      if (node_fs_1.default.existsSync(packagePath)) {
        const packageJson = JSON.parse(node_fs_1.default.readFileSync(packagePath, "utf8"));
        version = packageJson.version || version;
      }
    } catch (error) {
      logger_1.logger.warn(
        `Failed to get version from package.json: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    this.options = {
      name: "VoltAgent MCP Server",
      version,
      ...options,
    };
    // Create FastMCP instance with server options
    this.server = new fastmcp_1.FastMCP({
      name: this.options.name,
      version: this.options.version,
    });
    // Bind methods
    this.init = this.init.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.registerTool = this.registerTool.bind(this);
  }
  /**
   * Initialize the MCP server
   */
  async init() {
    if (this.initialized) return this;
    // Register all tools
    for (const registrationFn of this.toolRegistrations) {
      try {
        registrationFn(this.server, this.asyncManager);
      } catch (error) {
        logger_1.logger.error(
          `Failed to register tool: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    this.initialized = true;
    return this;
  }
  /**
   * Start the MCP server
   * @param options Start options
   */
  async start(options) {
    if (!this.initialized) {
      await this.init();
    }
    const transportType = options?.transportType || "stdio";
    // Start the FastMCP server
    if (transportType === "stdio") {
      await this.server.start({
        transportType: "stdio",
      });
    } else if (transportType === "httpStream") {
      await this.server.start({
        transportType: "httpStream",
        httpStream: {
          endpoint: "/mcp",
          port: 3000,
        },
      });
    }
    logger_1.logger.info(`MCP server started with transport: ${transportType}`);
    return this;
  }
  /**
   * Stop the MCP server
   */
  async stop() {
    if (this.server) {
      await this.server.stop();
      logger_1.logger.info("MCP server stopped");
    }
  }
  /**
   * Register a tool with the server
   * @param registrationFn Tool registration function
   */
  registerTool(registrationFn) {
    this.toolRegistrations.push(registrationFn);
    // If already initialized, register immediately
    if (this.initialized) {
      try {
        registrationFn(this.server, this.asyncManager);
      } catch (error) {
        logger_1.logger.error(
          `Failed to register tool: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
exports.MCPServer = MCPServer;
// Export types and utilities
__exportStar(require("./types"), exports);
__exportStar(require("./async-manager"), exports);
__exportStar(require("./logger"), exports);
//# sourceMappingURL=index.js.map
