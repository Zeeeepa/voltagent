import { BashTool } from "./bash";
import { BatchTool } from "./batch";
import { ThinkTool } from "./think";
import type { Toolkit } from "../../toolkit";

/**
 * Create a toolkit with all execution tools
 * @returns A toolkit with all execution tools
 */
export function createExecutionToolkit(): Toolkit {
  return {
    name: "execution",
    description: "Tools for executing commands and code",
    tools: [
      BashTool,
      BatchTool,
      ThinkTool,
    ],
  };
}

export {
  BashTool,
  BatchTool,
  ThinkTool,
};

