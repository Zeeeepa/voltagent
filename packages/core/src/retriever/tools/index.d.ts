import { type AgentTool } from "../../tool";
import type { Retriever } from "../types";
/**
 * Creates an AgentTool from a retriever, allowing it to be used as a tool in an agent.
 * This is the preferred way to use a retriever as a tool, as it properly maintains the 'this' context.
 *
 * @param retriever - The retriever instance to convert to a tool
 * @param options - Options for customizing the tool
 * @returns An AgentTool that can be added to an agent's tools
 *
 * @example
 * ```typescript
 * const retriever = new SimpleRetriever();
 * const searchTool = createRetrieverTool(retriever, {
 *   name: "search_knowledge",
 *   description: "Searches the knowledge base for information"
 * });
 *
 * agent.addTool(searchTool);
 * ```
 */
export declare const createRetrieverTool: (
  retriever: Retriever,
  options?: {
    name?: string;
    description?: string;
  },
) => AgentTool;
