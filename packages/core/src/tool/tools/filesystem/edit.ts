import path from "path";
import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a file edit operation
 */
export interface FileEditResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Path to the file that was edited
   */
  path: string;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Size of the file in bytes after editing
   */
  size?: number;
  
  /**
   * Original content of the file before editing
   */
  originalContent?: string;
  
  /**
   * New content of the file after editing
   */
  newContent?: string;
  
  /**
   * Whether the file was created
   */
  created?: boolean;
  
  /**
   * Whether the file was modified
   */
  modified?: boolean;
}

/**
 * Tool for editing files in the filesystem
 */
export const FileEditTool = createTool({
  name: "file_edit",
  description: `- Edits existing files in the filesystem
- Supports find and replace operations
- Supports regex pattern matching
- Supports line-based editing
- Use this tool to modify existing files

Usage notes:
- Provide the exact file path to edit
- Use find/replace for simple text replacements
- Use regex for more complex pattern matching
- Use lineStart/lineEnd for line-based editing
- Returns metadata including file size and whether the file was modified`,
  category: ToolCategory.FILE_OPERATION,
  source: "serv",
  requiresPermission: true,
  parameters: z.object({
    path: z.string().describe("Path to the file to edit. Can be relative like 'src/index.js', '../README.md' or absolute"),
    find: z.string().optional().describe("Text or pattern to find in the file"),
    replace: z.string().optional().describe("Text to replace the found text with"),
    regex: z.boolean().optional().describe("Whether to treat the find parameter as a regex pattern. Default: false"),
    lineStart: z.number().optional().describe("Line number to start editing from (0-based). Default: 0"),
    lineEnd: z.number().optional().describe("Line number to end editing at (0-based). Default: end of file"),
    content: z.string().optional().describe("New content for the specified line range. If provided, find/replace are ignored"),
    encoding: z.string().optional().describe("File encoding to use. Default: 'utf8'"),
    createIfNotExists: z.boolean().optional().describe("Whether to create the file if it doesn't exist. Default: false"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const filePath = args.path;
    const find = args.find;
    const replace = args.replace;
    const regex = args.regex || false;
    const lineStart = args.lineStart || 0;
    const lineEnd = args.lineEnd;
    const newContent = args.content;
    const encoding = args.encoding || "utf8";
    const createIfNotExists = args.createIfNotExists || false;

    // Check if we're running in a sandbox environment
    const isSandbox = !!(context && (context as any).sandbox);
    if (isSandbox && path.isAbsolute(filePath)) {
      // In sandbox mode, log warnings about absolute paths that don't match expected pattern
      const sandboxRoot = (context && (context as any).sandboxRoot) || "/home/user/app";
      // If the path doesn't start with sandbox root, log a warning
      if (!filePath.startsWith(sandboxRoot)) {
        if (context && (context as any).logger) {
          (context as any).logger.warn(`Warning: FileEditTool: Using absolute path outside sandbox: ${filePath}. This may fail.`);
        } else {
          console.warn(`Warning: FileEditTool: Using absolute path outside sandbox: ${filePath}. This may fail.`);
        }
      }
    }

    try {
      // Use the execution adapter if available, otherwise use Node.js fs
      if (context && (context as any).executionAdapter) {
        const result = await (context as any).executionAdapter.editFile(
          (context as any).executionId,
          filePath,
          {
            find,
            replace,
            regex,
            lineStart,
            lineEnd,
            content: newContent,
            encoding,
            createIfNotExists,
          }
        );

        // If successful, record the file edit in the contextWindow if available
        if (
          result.success === true &&
          context &&
          (context as any).sessionState &&
          (context as any).sessionState.contextWindow
        ) {
          (context as any).sessionState.contextWindow.recordFileEdit(filePath);
        }

        return result;
      } else {
        // Fallback to Node.js fs
        const fs = await import("fs/promises");
        const fsSync = await import("fs");
        
        try {
          // Check if file exists
          const fileExists = fsSync.existsSync(filePath);
          
          if (!fileExists && !createIfNotExists) {
            return {
              success: false,
              path: filePath,
              error: "File does not exist and createIfNotExists is false",
            };
          }
          
          // Read original content or create empty file
          let originalContent = "";
          if (fileExists) {
            originalContent = await fs.readFile(filePath, { encoding: encoding as BufferEncoding });
          }
          
          // Apply edits
          let editedContent = originalContent;
          
          if (newContent !== undefined) {
            // Replace content in the specified line range
            const lines = originalContent.split("\n");
            const endLine = lineEnd !== undefined ? Math.min(lineEnd, lines.length - 1) : lines.length - 1;
            
            // Replace the specified lines with the new content
            const beforeLines = lines.slice(0, lineStart);
            const afterLines = lines.slice(endLine + 1);
            const newLines = newContent.split("\n");
            
            editedContent = [...beforeLines, ...newLines, ...afterLines].join("\n");
          } else if (find !== undefined && replace !== undefined) {
            // Apply find/replace
            if (regex) {
              // Use regex pattern
              const pattern = new RegExp(find, "g");
              editedContent = originalContent.replace(pattern, replace);
            } else {
              // Use simple text replacement
              editedContent = originalContent.split(find).join(replace);
            }
          }
          
          // Write the edited content
          await fs.writeFile(filePath, editedContent, { encoding: encoding as BufferEncoding });
          
          // Get file stats
          const stats = await fs.stat(filePath);
          
          return {
            success: true,
            path: filePath,
            size: stats.size,
            originalContent,
            newContent: editedContent,
            created: !fileExists,
            modified: originalContent !== editedContent,
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
        (context as any).logger.error(`Error editing file: ${(error as Error).message}`);
      } else {
        console.error(`Error editing file: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        path: filePath,
        error: (error as Error).message,
      };
    }
  },
});

