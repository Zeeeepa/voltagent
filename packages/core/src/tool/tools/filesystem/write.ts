import path from "path";
import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a file write operation
 */
export interface FileWriteResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Path to the file that was written
   */
  path: string;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Size of the file in bytes after writing
   */
  size?: number;
  
  /**
   * Whether the file was created
   */
  created?: boolean;
  
  /**
   * Whether the file was overwritten
   */
  overwritten?: boolean;
}

/**
 * Tool for writing files to the filesystem
 */
export const FileWriteTool = createTool({
  name: "file_write",
  description: `- Writes content to files in the filesystem
- Creates new files or overwrites existing files
- Handles text files with various encodings
- Creates parent directories if they don't exist
- Use this tool to create or update files

Usage notes:
- Provide the exact file path to write
- Content will be written as-is
- Parent directories will be created if they don't exist
- Existing files will be overwritten without warning
- Returns metadata including file size and whether the file was created or overwritten`,
  category: ToolCategory.FILE_OPERATION,
  source: "serv",
  requiresPermission: true,
  parameters: z.object({
    path: z.string().describe("Path to the file to write. Can be relative like 'src/index.js', '../README.md' or absolute"),
    content: z.string().describe("Content to write to the file"),
    encoding: z.string().optional().describe("File encoding to use. Default: 'utf8'"),
    createDirectories: z.boolean().optional().describe("Whether to create parent directories if they don't exist. Default: true"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const filePath = args.path;
    const content = args.content;
    const encoding = args.encoding || "utf8";
    const createDirectories = args.createDirectories !== false; // Default to true

    // Check if we're running in a sandbox environment
    const isSandbox = !!(context && (context as any).sandbox);
    if (isSandbox && path.isAbsolute(filePath)) {
      // In sandbox mode, log warnings about absolute paths that don't match expected pattern
      const sandboxRoot = (context && (context as any).sandboxRoot) || "/home/user/app";
      // If the path doesn't start with sandbox root, log a warning
      if (!filePath.startsWith(sandboxRoot)) {
        if (context && (context as any).logger) {
          (context as any).logger.warn(`Warning: FileWriteTool: Using absolute path outside sandbox: ${filePath}. This may fail.`);
        } else {
          console.warn(`Warning: FileWriteTool: Using absolute path outside sandbox: ${filePath}. This may fail.`);
        }
      }
    }

    try {
      // Use the execution adapter if available, otherwise use Node.js fs
      if (context && (context as any).executionAdapter) {
        const result = await (context as any).executionAdapter.writeFile(
          (context as any).executionId,
          filePath,
          content,
          encoding,
          createDirectories
        );

        // If successful, record the file write in the contextWindow if available
        if (
          result.success === true &&
          context &&
          (context as any).sessionState &&
          (context as any).sessionState.contextWindow
        ) {
          (context as any).sessionState.contextWindow.recordFileWrite(filePath);
        }

        return result;
      } else {
        // Fallback to Node.js fs
        const fs = await import("fs/promises");
        const fsSync = await import("fs");
        
        try {
          // Check if file exists
          const fileExists = fsSync.existsSync(filePath);
          
          // Create parent directories if needed
          if (createDirectories) {
            const dirname = path.dirname(filePath);
            await fs.mkdir(dirname, { recursive: true });
          }
          
          // Write file content
          await fs.writeFile(filePath, content, { encoding: encoding as BufferEncoding });
          
          // Get file stats
          const stats = await fs.stat(filePath);
          
          return {
            success: true,
            path: filePath,
            size: stats.size,
            created: !fileExists,
            overwritten: fileExists,
          };
        } catch (error) {
          return {
            success: false,
            path: filePath,
            error: (error as Error).message,
          };
        }
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error writing file: ${(error as Error).message}`);
      } else {
        console.error(`Error writing file: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        path: filePath,
        error: (error as Error).message,
      };
    }
  },
});

