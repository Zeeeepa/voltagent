import path from "path";
import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * File entry in ls result
 */
export interface FileEntry {
  /**
   * Name of the file or directory
   */
  name: string;
  
  /**
   * Type of the entry (file, directory, symlink, etc.)
   */
  type: "file" | "directory" | "symlink" | "other";
  
  /**
   * Size of the file in bytes
   */
  size?: number;
  
  /**
   * Last modified time
   */
  mtime?: Date;
  
  /**
   * File permissions
   */
  mode?: number;
  
  /**
   * Owner of the file
   */
  owner?: string;
  
  /**
   * Group of the file
   */
  group?: string;
}

/**
 * Result of an ls operation
 */
export interface LSResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Path that was listed
   */
  path: string;
  
  /**
   * Entries in the directory
   */
  entries?: FileEntry[];
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Total number of entries
   */
  count?: number;
}

/**
 * Tool for listing directory contents
 */
export const LSTool = createTool({
  name: "ls",
  description: `- Lists directory contents
- Shows file and directory information
- Can show hidden files
- Can sort by name, size, or modification time
- Can filter by file type or pattern
- Use this tool to explore the filesystem

Usage notes:
- Provide a directory path to list
- Use showHidden to show hidden files
- Use sort to sort the results
- Use pattern to filter the results
- Returns a list of files and directories with metadata`,
  category: ToolCategory.READONLY,
  source: "serv",
  parameters: z.object({
    path: z.string().optional().describe("Path to the directory to list. Default: current directory"),
    showHidden: z.boolean().optional().describe("Whether to show hidden files. Default: false"),
    sort: z.enum(["name", "size", "mtime"]).optional().describe("Sort order. Default: 'name'"),
    reverse: z.boolean().optional().describe("Whether to reverse the sort order. Default: false"),
    pattern: z.string().optional().describe("Pattern to filter files. Default: '*'"),
    long: z.boolean().optional().describe("Whether to show detailed information. Default: false"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const dirPath = args.path || ".";
    const showHidden = args.showHidden || false;
    const sort = args.sort || "name";
    const reverse = args.reverse || false;
    const pattern = args.pattern || "*";
    const long = args.long || false;

    // Check if we're running in a sandbox environment
    const isSandbox = !!(context && (context as any).sandbox);
    if (isSandbox && path.isAbsolute(dirPath)) {
      // In sandbox mode, log warnings about absolute paths that don't match expected pattern
      const sandboxRoot = (context && (context as any).sandboxRoot) || "/home/user/app";
      // If the path doesn't start with sandbox root, log a warning
      if (!dirPath.startsWith(sandboxRoot)) {
        if (context && (context as any).logger) {
          (context as any).logger.warn(`Warning: LSTool: Using absolute path outside sandbox: ${dirPath}. This may fail.`);
        } else {
          console.warn(`Warning: LSTool: Using absolute path outside sandbox: ${dirPath}. This may fail.`);
        }
      }
    }

    try {
      // Use the execution adapter if available, otherwise use Node.js fs
      if (context && (context as any).executionAdapter) {
        return await (context as any).executionAdapter.ls(
          (context as any).executionId,
          dirPath,
          {
            showHidden,
            sort,
            reverse,
            pattern,
            long,
          }
        );
      } else {
        // Fallback to Node.js fs
        const fs = await import("fs/promises");
        const { minimatch } = await import("minimatch");
        
        try {
          // Check if directory exists and is a directory
          const stats = await fs.stat(dirPath);
          
          if (!stats.isDirectory()) {
            return {
              success: false,
              path: dirPath,
              error: "Not a directory",
            };
          }
          
          // Read directory contents
          const files = await fs.readdir(dirPath);
          
          // Process each entry
          const entries: FileEntry[] = [];
          
          for (const file of files) {
            // Skip hidden files if not requested
            if (!showHidden && file.startsWith(".")) {
              continue;
            }
            
            // Check if file matches pattern
            if (pattern !== "*" && !minimatch(file, pattern)) {
              continue;
            }
            
            try {
              const filePath = path.join(dirPath, file);
              const fileStats = await fs.stat(filePath);
              
              // Determine file type
              let type: FileEntry["type"] = "other";
              if (fileStats.isFile()) {
                type = "file";
              } else if (fileStats.isDirectory()) {
                type = "directory";
              } else if (fileStats.isSymbolicLink()) {
                type = "symlink";
              }
              
              // Create entry
              const entry: FileEntry = {
                name: file,
                type,
                size: fileStats.size,
                mtime: fileStats.mtime,
              };
              
              // Add additional info if requested
              if (long) {
                entry.mode = fileStats.mode;
                // Owner and group require additional modules in Node.js
                // We'll skip them for simplicity
              }
              
              entries.push(entry);
            } catch (error) {
              // Skip files that can't be stat'd
              continue;
            }
          }
          
          // Sort entries
          entries.sort((a, b) => {
            if (sort === "name") {
              return a.name.localeCompare(b.name);
            } else if (sort === "size") {
              return (a.size || 0) - (b.size || 0);
            } else if (sort === "mtime") {
              return (a.mtime?.getTime() || 0) - (b.mtime?.getTime() || 0);
            }
            return 0;
          });
          
          // Reverse if requested
          if (reverse) {
            entries.reverse();
          }
          
          return {
            success: true,
            path: dirPath,
            entries,
            count: entries.length,
          };
        } catch (error) {
          return {
            success: false,
            path: dirPath,
            error: (error as Error).message,
          };
        }
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error in ls: ${(error as Error).message}`);
      } else {
        console.error(`Error in ls: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        path: dirPath,
        error: (error as Error).message,
      };
    }
  },
});

