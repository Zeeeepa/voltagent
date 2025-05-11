"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToolkit = void 0;
/**
 * Helper function for creating a new toolkit.
 * Provides default values and ensures the basic structure is met.
 *
 * @param options - The configuration options for the toolkit.
 * @returns A Toolkit object.
 */
const createToolkit = (options) => {
  if (!options.name) {
    throw new Error("Toolkit name is required");
  }
  if (!options.tools || options.tools.length === 0) {
    console.warn(`Toolkit '${options.name}' created without any tools.`);
  }
  return {
    name: options.name,
    description: options.description || "", // Default empty description
    instructions: options.instructions,
    addInstructions: options.addInstructions || false, // Default to false
    tools: options.tools || [], // Default to empty array if not provided (though warned above)
  };
};
exports.createToolkit = createToolkit;
//# sourceMappingURL=toolkit.js.map
