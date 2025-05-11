"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tool = exports.createTool = exports.Tool = exports.ToolManager = void 0;
const uuid_1 = require("uuid");
// Export ToolManager and related types
var manager_1 = require("./manager");
Object.defineProperty(exports, "ToolManager", {
  enumerable: true,
  get: function () {
    return manager_1.ToolManager;
  },
});
/**
 * Tool class for defining tools that agents can use
 */
class Tool {
  /**
   * Create a new tool
   */
  constructor(options) {
    if (!options.name) {
      throw new Error("Tool name is required");
    }
    if (!options.description) {
      console.warn(`Tool '${options.name}' created without a description.`);
    }
    if (!options.parameters) {
      throw new Error(`Tool '${options.name}' parameters schema is required`);
    }
    if (!options.execute) {
      throw new Error(`Tool '${options.name}' execute function is required`);
    }
    this.id = options.id || (0, uuid_1.v4)();
    this.name = options.name;
    this.description = options.description || "";
    this.parameters = options.parameters;
    this.execute = options.execute;
  }
}
exports.Tool = Tool;
/**
 * Helper function for creating a new tool
 */
const createTool = (options) => {
  return new Tool(options);
};
exports.createTool = createTool;
/**
 * Alias for createTool function
 */
exports.tool = exports.createTool;
//# sourceMappingURL=index.js.map
