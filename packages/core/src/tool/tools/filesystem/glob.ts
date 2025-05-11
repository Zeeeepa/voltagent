import path from "path";
import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a glob operation
 */
export interface GlobResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Pattern used for the glob
   */
  pattern: string;
  
  /**
   * Base directory for the glob
   */
  baseDir?: string;
  
  /**
   * Files matching the glob pattern
   */
  files?: string[];
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Total number of files found
   */
  count?: number;
}

/**
 * Tool for finding files using glob patterns
 */
export const GlobTool = createTool({
  name: "glob",
  description: `- Finds files matching glob patterns
- Supports standard glob syntax (*, **, ?, [...], etc.)
- Can search recursively through directories
- Can filter by file type or extension
- Use this tool to find files matching specific patterns

Usage notes:
- Provide a glob pattern to match files
- Use * to match any characters in a filename
- Use ** to match any files in any subdirectories
- Use ? to match a single character
- Use [...] to match a range of characters
- Use {a,b,c} to match any of the patterns a, b, or c
- Returns a list of files matching the pattern`,
  category: ToolCategory.READONLY,
  source: "serv",
  parameters: z.object({
    pattern: z.string().describe("Glob pattern to match files. Examples: '**/*.js', 'src/**/*.{ts,tsx}', 'docs/*.md'"),
    baseDir: z.string().optional().describe("Base directory for the glob. Default: current directory"),
    dot: z.boolean().optional().describe("Whether to include dotfiles. Default: false"),
    maxDepth: z.number().optional().describe("Maximum depth to search. Default: unlimited"),
    maxResults: z.number().optional().describe("Maximum number of results to return. Default: 1000"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const pattern = args.pattern;
    const baseDir = args.baseDir || ".";
    const dot = args.dot || false;
    const maxDepth = args.maxDepth;
    const maxResults = args.maxResults || 1000;

    // Check if we're running in a sandbox environment
    const isSandbox = !!(context && (context as any).sandbox);
    if (isSandbox && path.isAbsolute(baseDir)) {
      // In sandbox mode, log warnings about absolute paths that don't match expected pattern
      const sandboxRoot = (context && (context as any).sandboxRoot) || "/home/user/app";
      // If the path doesn't start with sandbox root, log a warning
      if (!baseDir.startsWith(sandboxRoot)) {
        if (context && (context as any).logger) {
          (context as any).logger.warn(`Warning: GlobTool: Using absolute path outside sandbox: ${baseDir}. This may fail.`);
        } else {
          console.warn(`Warning: GlobTool: Using absolute path outside sandbox: ${baseDir}. This may fail.`);
        }
      }
    }

    try {
      // Use the execution adapter if available, otherwise use Node.js glob
      if (context && (context as any).executionAdapter) {
        return await (context as any).executionAdapter.glob(
          (context as any).executionId,
          pattern,
          baseDir,
          {
            dot,
            maxDepth,
            maxResults,
          }
        );
      } else {
        // Fallback to Node.js glob
        try {
          const { glob } = await import("glob");
          
          const options: any = {
            dot,
            cwd: baseDir,
            absolute: false, // Return paths relative to baseDir
            nodir: true, // Only return files, not directories
          };
          
          if (maxDepth !== undefined) {
            options.depth = maxDepth;
          }
          
          // Execute the glob
          const files = await glob(pattern, options);
          
          // Limit the number of results
          const limitedFiles = files.slice(0, maxResults);
          
          return {
            success: true,
            pattern,
            baseDir,
            files: limitedFiles,
            count: limitedFiles.length,
          };
        } catch (error) {
          return {
            success: false,
            pattern,
            baseDir,
            error: (error as Error).message,
          };
        }
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error in glob: ${(error as Error).message}`);
      } else {
        console.error(`Error in glob: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        pattern,
        baseDir,
        error: (error as Error).message,
      };
    }
  },
});

