import path from "path";
import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a grep operation
 */
export interface GrepResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Pattern used for the search
   */
  pattern: string;
  
  /**
   * Base directory for the search
   */
  baseDir?: string;
  
  /**
   * Files searched
   */
  filesSearched?: number;
  
  /**
   * Matches found
   */
  matches?: Array<{
    /**
     * Path to the file containing the match
     */
    file: string;
    
    /**
     * Line number of the match
     */
    line: number;
    
    /**
     * Column number of the match
     */
    column: number;
    
    /**
     * Text of the line containing the match
     */
    text: string;
    
    /**
     * Match context (lines before and after)
     */
    context?: string[];
  }>;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Total number of matches found
   */
  count?: number;
}

/**
 * Tool for searching file contents using grep
 */
export const GrepTool = createTool({
  name: "grep",
  description: `- Searches file contents for patterns
- Supports regex pattern matching
- Can search recursively through directories
- Can filter by file type or extension
- Can show context lines before and after matches
- Use this tool to find text in files

Usage notes:
- Provide a pattern to search for
- Use regex for more complex pattern matching
- Use filePattern to limit the search to specific files
- Use contextLines to show lines before and after matches
- Returns a list of matches with file, line, and column information`,
  category: ToolCategory.READONLY,
  source: "serv",
  parameters: z.object({
    pattern: z.string().describe("Pattern to search for. Can be a string or regex pattern"),
    baseDir: z.string().optional().describe("Base directory for the search. Default: current directory"),
    filePattern: z.string().optional().describe("Glob pattern to match files to search. Default: '**/*'"),
    regex: z.boolean().optional().describe("Whether to treat the pattern as a regex. Default: false"),
    ignoreCase: z.boolean().optional().describe("Whether to ignore case. Default: false"),
    contextLines: z.number().optional().describe("Number of context lines to include before and after matches. Default: 0"),
    maxResults: z.number().optional().describe("Maximum number of results to return. Default: 100"),
    maxFilesToSearch: z.number().optional().describe("Maximum number of files to search. Default: 1000"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const pattern = args.pattern;
    const baseDir = args.baseDir || ".";
    const filePattern = args.filePattern || "**/*";
    const regex = args.regex || false;
    const ignoreCase = args.ignoreCase || false;
    const contextLines = args.contextLines || 0;
    const maxResults = args.maxResults || 100;
    const maxFilesToSearch = args.maxFilesToSearch || 1000;

    // Check if we're running in a sandbox environment
    const isSandbox = !!(context && (context as any).sandbox);
    if (isSandbox && path.isAbsolute(baseDir)) {
      // In sandbox mode, log warnings about absolute paths that don't match expected pattern
      const sandboxRoot = (context && (context as any).sandboxRoot) || "/home/user/app";
      // If the path doesn't start with sandbox root, log a warning
      if (!baseDir.startsWith(sandboxRoot)) {
        if (context && (context as any).logger) {
          (context as any).logger.warn(`Warning: GrepTool: Using absolute path outside sandbox: ${baseDir}. This may fail.`);
        } else {
          console.warn(`Warning: GrepTool: Using absolute path outside sandbox: ${baseDir}. This may fail.`);
        }
      }
    }

    try {
      // Use the execution adapter if available, otherwise use Node.js implementation
      if (context && (context as any).executionAdapter) {
        return await (context as any).executionAdapter.grep(
          (context as any).executionId,
          pattern,
          baseDir,
          {
            filePattern,
            regex,
            ignoreCase,
            contextLines,
            maxResults,
            maxFilesToSearch,
          }
        );
      } else {
        // Fallback to Node.js implementation
        try {
          const { glob } = await import("glob");
          const fs = await import("fs/promises");
          
          // Find files to search
          const files = await glob(filePattern, {
            cwd: baseDir,
            absolute: false, // Return paths relative to baseDir
            nodir: true, // Only return files, not directories
          });
          
          // Limit the number of files to search
          const limitedFiles = files.slice(0, maxFilesToSearch);
          
          // Create regex pattern
          let searchPattern: RegExp;
          if (regex) {
            const flags = ignoreCase ? "gi" : "g";
            searchPattern = new RegExp(pattern, flags);
          } else {
            const flags = ignoreCase ? "gi" : "g";
            searchPattern = new RegExp(escapeRegExp(pattern), flags);
          }
          
          // Search files
          const matches: GrepResult["matches"] = [];
          let filesSearched = 0;
          
          for (const file of limitedFiles) {
            if (matches.length >= maxResults) {
              break;
            }
            
            try {
              const filePath = path.join(baseDir, file);
              const content = await fs.readFile(filePath, "utf8");
              const lines = content.split("\n");
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let match: RegExpExecArray | null;
                
                // Reset lastIndex to ensure we find all matches in the line
                searchPattern.lastIndex = 0;
                
                while ((match = searchPattern.exec(line)) !== null) {
                  // Get context lines
                  const contextStart = Math.max(0, i - contextLines);
                  const contextEnd = Math.min(lines.length - 1, i + contextLines);
                  const context = contextLines > 0
                    ? lines.slice(contextStart, contextEnd + 1)
                    : undefined;
                  
                  matches.push({
                    file,
                    line: i + 1, // 1-based line number
                    column: match.index + 1, // 1-based column number
                    text: line,
                    context,
                  });
                  
                  if (matches.length >= maxResults) {
                    break;
                  }
                }
                
                if (matches.length >= maxResults) {
                  break;
                }
              }
              
              filesSearched++;
            } catch (error) {
              // Skip files that can't be read
              filesSearched++;
              continue;
            }
          }
          
          return {
            success: true,
            pattern,
            baseDir,
            filesSearched,
            matches,
            count: matches.length,
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
        (context as any).logger.error(`Error in grep: ${(error as Error).message}`);
      } else {
        console.error(`Error in grep: ${(error as Error).message}`);
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

/**
 * Escape special characters in a string for use in a regular expression
 * @param string String to escape
 * @returns Escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

