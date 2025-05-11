import path from "path";
import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a file read operation
 */
export interface FileReadResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Path to the file that was read
   */
  path: string;
  
  /**
   * Content of the file
   */
  content?: string;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Size of the file in bytes
   */
  size?: number;
  
  /**
   * Encoding used to read the file
   */
  encoding?: string;
  
  /**
   * Line numbers included in the content
   */
  lineNumbers?: boolean;
  
  /**
   * Line offset used when reading the file
   */
  lineOffset?: number;
  
  /**
   * Number of lines read
   */
  lineCount?: number;
}

/**
 * Tool for reading files from the filesystem
 */
export const FileReadTool = createTool({
  name: "file_read",
  description: `- Reads the contents of files in the filesystem
- Handles text files with various encodings
- Supports partial file reading with line offset and count
- Limits file size for performance and safety
- Can include line numbers in the output (like cat -n)
- Use this tool to examine file contents
- Use ls_tool to explore directories before reading specific files

Usage notes:
- Provide the exact file path to read
- Files are LIMITED TO 500KB MAX regardless of maxSize parameter
- Line count is LIMITED TO 1000 LINES MAX regardless of requested lineCount
- For large files, use lineOffset to read specific portions in multiple calls
- Returns file content as text with line numbers like cat -n
- Returns metadata including file size and encoding
- File content is returned according to the specified encoding`,
  category: ToolCategory.READONLY,
  source: "serv",
  parameters: z.object({
    path: z.string().describe("Path to the file to read. Can be relative like 'src/index.js', '../README.md' or absolute"),
    encoding: z.string().optional().describe("File encoding to use. Default: 'utf8'"),
    maxSize: z.number().optional().describe("Maximum file size in bytes to read. Default: 1048576 (1MB)"),
    lineOffset: z.number().optional().describe("Line number to start reading from (0-based). Default: 0"),
    lineCount: z.number().optional().describe("Maximum number of lines to read. Default: all lines"),
    lineNumbers: z.boolean().optional().describe("Whether to include line numbers in the output. Default: false"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const filePath = args.path;
    const encoding = args.encoding || "utf8";
    // Hard cap the maxSize at 500KB to prevent context overflow
    const requestedMaxSize = args.maxSize || 524288; // Default to 500KB
    const maxSize = Math.min(requestedMaxSize, 524288); // Hard cap at 500KB
    const lineOffset = args.lineOffset || 0;
    // Hard cap the lineCount at 1000 to prevent context overflow
    const requestedLineCount = args.lineCount !== undefined ? args.lineCount : undefined;
    const lineCount = requestedLineCount ? Math.min(requestedLineCount, 1000) : 1000;
    const lineNumbers = args.lineNumbers || false;

    // Check if we're running in a sandbox environment
    const isSandbox = !!(context && (context as any).sandbox);
    if (isSandbox && path.isAbsolute(filePath)) {
      // In sandbox mode, log warnings about absolute paths that don't match expected pattern
      const sandboxRoot = (context && (context as any).sandboxRoot) || "/home/user/app";
      // If the path doesn't start with sandbox root, log a warning
      if (!filePath.startsWith(sandboxRoot)) {
        if (context && (context as any).logger) {
          (context as any).logger.warn(`Warning: FileReadTool: Using absolute path outside sandbox: ${filePath}. This may fail.`);
        } else {
          console.warn(`Warning: FileReadTool: Using absolute path outside sandbox: ${filePath}. This may fail.`);
        }
      }
    }

    try {
      // Use the execution adapter if available, otherwise use Node.js fs
      if (context && (context as any).executionAdapter) {
        const result = await (context as any).executionAdapter.readFile(
          (context as any).executionId,
          filePath,
          maxSize,
          lineOffset,
          lineCount,
          encoding,
          lineNumbers
        );

        // If successful, record the file read in the contextWindow if available
        if (
          result.success === true &&
          context &&
          (context as any).sessionState &&
          (context as any).sessionState.contextWindow
        ) {
          (context as any).sessionState.contextWindow.recordFileRead(filePath);
        }

        return result;
      } else {
        // Fallback to Node.js fs
        const fs = await import("fs/promises");
        
        try {
          // Check if file exists and get stats
          const stats = await fs.stat(filePath);
          
          if (!stats.isFile()) {
            return {
              success: false,
              path: filePath,
              error: "Not a file",
            };
          }
          
          // Check file size
          if (stats.size > maxSize) {
            return {
              success: false,
              path: filePath,
              error: `File size (${stats.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
              size: stats.size,
            };
          }
          
          // Read file content
          const content = await fs.readFile(filePath, { encoding: encoding as BufferEncoding });
          
          // Apply line offset and count if needed
          let processedContent = content;
          if (lineOffset > 0 || lineCount !== undefined) {
            const lines = content.split("\n");
            const endLine = lineCount !== undefined ? Math.min(lineOffset + lineCount, lines.length) : lines.length;
            processedContent = lines.slice(lineOffset, endLine).join("\n");
          }
          
          // Add line numbers if requested
          if (lineNumbers) {
            const lines = processedContent.split("\n");
            processedContent = lines
              .map((line, index) => `${(lineOffset + index + 1).toString().padStart(6, " ")}  ${line}`)
              .join("\n");
          }
          
          return {
            success: true,
            path: filePath,
            content: processedContent,
            size: stats.size,
            encoding,
            lineNumbers,
            lineOffset,
            lineCount,
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
        (context as any).logger.error(`Error reading file: ${(error as Error).message}`);
      } else {
        console.error(`Error reading file: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        path: filePath,
        error: (error as Error).message,
      };
    }
  },
});

