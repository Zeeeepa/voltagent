import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a think operation
 */
export interface ThinkResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Thought process
   */
  thought: string;
}

/**
 * Tool for thinking through complex problems
 */
export const ThinkTool = createTool({
  name: "think",
  description: `- Allows the agent to think through complex problems
- Provides a space for step-by-step reasoning
- Helps break down complex tasks
- Use this tool to work through difficult problems or plan complex operations

Usage notes:
- Provide a problem or question to think about
- Use this tool when you need to break down a complex problem
- The thought process is not visible to the user unless explicitly shared`,
  category: ToolCategory.READONLY,
  source: "serv",
  parameters: z.object({
    problem: z.string().describe("Problem or question to think about"),
  }),
  execute: async (args, context) => {
    // Extract the problem
    const problem = args.problem;

    // Simply return the problem as the thought
    // This tool doesn't actually do anything except provide a space for the agent to think
    return {
      success: true,
      thought: problem,
    };
  },
});

