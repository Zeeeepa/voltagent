"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHooks = createHooks;
/**
 * Default empty implementation of hook methods.
 */
const defaultHooks = {
  // Mark as Required for internal consistency
  onStart: async (_args) => {},
  onEnd: async (_args) => {},
  onHandoff: async (_args) => {},
  onToolStart: async (_args) => {},
  onToolEnd: async (_args) => {},
};
/**
 * Create hooks from an object literal.
 */
function createHooks(hooks = {}) {
  return {
    onStart: hooks.onStart || defaultHooks.onStart,
    onEnd: hooks.onEnd || defaultHooks.onEnd,
    onHandoff: hooks.onHandoff || defaultHooks.onHandoff,
    onToolStart: hooks.onToolStart || defaultHooks.onToolStart,
    onToolEnd: hooks.onToolEnd || defaultHooks.onToolEnd,
  };
}
//# sourceMappingURL=index.js.map
