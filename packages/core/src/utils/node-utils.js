"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeTypeFromNodeId = exports.createNodeId = exports.NodeType = void 0;
/**
 * Node types for agents, tools, and other components
 */
var NodeType;
(function (NodeType) {
  NodeType["AGENT"] = "agent";
  NodeType["SUBAGENT"] = "agent";
  NodeType["TOOL"] = "tool";
  NodeType["MEMORY"] = "memory";
  NodeType["MESSAGE"] = "message";
  NodeType["OUTPUT"] = "output";
  NodeType["RETRIEVER"] = "retriever";
})(NodeType || (exports.NodeType = NodeType = {}));
/**
 * Standard node ID creation function
 * @param type Node type
 * @param name Main identifier (tool name, agent name, etc.)
 * @param ownerId Owner ID (optional)
 * @returns Standard formatted node ID
 */
const createNodeId = (type, name, ownerId) => {
  if (!ownerId || ownerId === name) {
    return `${type}_${name}`;
  }
  return `${type}_${name}_${ownerId}`;
};
exports.createNodeId = createNodeId;
/**
 * Function to extract node type from NodeID
 * @param nodeId Node ID
 * @returns NodeType or null (if type cannot be found)
 */
const getNodeTypeFromNodeId = (nodeId) => {
  const parts = nodeId.split("_");
  if (parts.length >= 1) {
    const typePart = parts[0].toLowerCase();
    for (const type of Object.values(NodeType)) {
      if (typePart === type) {
        return type;
      }
    }
  }
  return null;
};
exports.getNodeTypeFromNodeId = getNodeTypeFromNodeId;
//# sourceMappingURL=node-utils.js.map
