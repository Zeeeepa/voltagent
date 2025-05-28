/**
 * Node types for the VoltAgent system
 */
export enum NodeType {
  AGENT = "agent",
  TOOL = "tool",
  MEMORY = "memory",
  RETRIEVER = "retriever",
  SUBAGENT = "subagent",
  EVENT = "event",
  OPERATION = "operation",
  SYSTEM = "system",
}

/**
 * Standard node ID creation function
 * @param type Node type
 * @param name Main identifier (tool name, agent name, etc.)
 * @param ownerId Owner ID (optional)
 * @returns Standard formatted node ID
 */
export const createNodeId = (type: NodeType, name: string, ownerId?: string): string => {
  if (!ownerId || ownerId === name) {
    return `${type}_${name}`;
  }
  return `${type}_${name}_${ownerId}`;
};

/**
 * Function to extract node type from NodeID
 * @param nodeId Node ID
 * @returns NodeType or null (if type cannot be found)
 */
export const getNodeTypeFromNodeId = (nodeId: string): NodeType | null => {
  const parts = nodeId.split("_");
  if (parts.length >= 1) {
    const typePart = parts[0].toLowerCase();
    for (const type of Object.values(NodeType)) {
      if (typePart === type) {
        return type as NodeType;
      }
    }
  }
  return null;
};
