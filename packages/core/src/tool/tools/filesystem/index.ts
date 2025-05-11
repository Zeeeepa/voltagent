import { FileReadTool } from "./read";
import { FileWriteTool } from "./write";
import { FileEditTool } from "./edit";
import { GlobTool } from "./glob";
import { GrepTool } from "./grep";
import { LSTool } from "./ls";
import type { Toolkit } from "../../toolkit";

/**
 * Create a toolkit with all file system tools
 * @returns A toolkit with all file system tools
 */
export function createFileSystemToolkit(): Toolkit {
  return {
    name: "filesystem",
    description: "Tools for interacting with the file system",
    tools: [
      FileReadTool,
      FileWriteTool,
      FileEditTool,
      GlobTool,
      GrepTool,
      LSTool,
    ],
  };
}

export {
  FileReadTool,
  FileWriteTool,
  FileEditTool,
  GlobTool,
  GrepTool,
  LSTool,
};

