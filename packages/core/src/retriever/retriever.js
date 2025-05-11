"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRetriever = void 0;
const tools_1 = require("./tools");
/**
 * Abstract base class for Retriever implementations.
 * This class provides a common structure for different types of retrievers.
 */
class BaseRetriever {
  /**
   * Constructor for the BaseRetriever class.
   * @param options - Configuration options for the retriever.
   */
  constructor(options = {}) {
    this.options = {
      ...options,
    };
    // Create the bound tool property during initialization with proper fallbacks
    // This ensures the tool always maintains its 'this' context
    const toolParams = {
      name: this.options.toolName || "search_knowledge",
      description:
        this.options.toolDescription ||
        "Searches for relevant information in the knowledge base based on the query.",
    };
    // Safely create tool with type assertion to ensure compatibility
    this.tool = (0, tools_1.createRetrieverTool)(this, toolParams);
    // Explicitly bind all methods to 'this' to support destructuring
    if (this.retrieve) {
      const originalRetrieve = this.retrieve;
      this.retrieve = (input) => {
        return originalRetrieve.call(this, input);
      };
    }
  }
}
exports.BaseRetriever = BaseRetriever;
//# sourceMappingURL=retriever.js.map
