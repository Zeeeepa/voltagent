/**
 * Node types for agents, tools, and other components
 */
export declare enum NodeType {
  AGENT = "agent",
  SUBAGENT = "agent",
  TOOL = "tool",
  MEMORY = "memory",
  MESSAGE = "message",
  OUTPUT = "output",
  RETRIEVER = "retriever",
}
/**
 * Standard node ID creation function
 * @param type Node type
 * @param name Main identifier (tool name, agent name, etc.)
 * @param ownerId Owner ID (optional)
 * @returns Standard formatted node ID
 */
export declare const createNodeId: (type: NodeType, name: string, ownerId?: string) => string;
/**
 * Function to extract node type from NodeID
 * @param nodeId Node ID
 * @returns NodeType or null (if type cannot be found)
 */
export declare const getNodeTypeFromNodeId: (nodeId: string) => NodeType | null;
