import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a bash command execution
 */
export interface BashResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Command that was executed
   */
  command: string;
  
  /**
   * Working directory where the command was executed
   */
  cwd?: string;
  
  /**
   * Standard output of the command
   */
  stdout?: string;
  
  /**
   * Standard error of the command
   */
  stderr?: string;
  
  /**
   * Exit code of the command
   */
  exitCode?: number;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Execution time in milliseconds
   */
  executionTime?: number;
}

/**
 * Tool for executing bash commands
 */
export const BashTool = createTool({
  name: "bash",
  description: `- Executes bash commands in the shell
- Can run any command available in the environment
- Can capture stdout and stderr
- Can set working directory
- Can set environment variables
- Use this tool to run shell commands

Usage notes:
- Provide a command to execute
- Use cwd to set the working directory
- Use env to set environment variables
- Use timeout to limit execution time
- Returns stdout, stderr, and exit code`,
  category: ToolCategory.SHELL_EXECUTION,
  source: "serv",
  requiresPermission: true,
  parameters: z.object({
    command: z.string().describe("Command to execute"),
    cwd: z.string().optional().describe("Working directory. Default: current directory"),
    env: z.record(z.string()).optional().describe("Environment variables"),
    timeout: z.number().optional().describe("Timeout in milliseconds. Default: 30000 (30 seconds)"),
    shell: z.string().optional().describe("Shell to use. Default: '/bin/bash'"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const command = args.command;
    const cwd = args.cwd || process.cwd();
    const env = args.env || {};
    const timeout = args.timeout || 30000;
    const shell = args.shell || "/bin/bash";

    try {
      // Use the execution adapter if available, otherwise use Node.js child_process
      if (context && (context as any).executionAdapter) {
        return await (context as any).executionAdapter.executeCommand(
          (context as any).executionId,
          command,
          {
            cwd,
            env,
            timeout,
            shell,
          }
        );
      } else {
        // Fallback to Node.js child_process
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execPromise = promisify(exec);
        
        const startTime = Date.now();
        
        try {
          // Execute the command
          const { stdout, stderr } = await execPromise(command, {
            cwd,
            env: { ...process.env, ...env },
            timeout,
            shell,
          });
          
          const executionTime = Date.now() - startTime;
          
          return {
            success: true,
            command,
            cwd,
            stdout,
            stderr,
            exitCode: 0,
            executionTime,
          };
        } catch (error: any) {
          const executionTime = Date.now() - startTime;
          
          return {
            success: false,
            command,
            cwd,
            stdout: error.stdout,
            stderr: error.stderr,
            exitCode: error.code,
            error: error.message,
            executionTime,
          };
        }
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error executing command: ${(error as Error).message}`);
      } else {
        console.error(`Error executing command: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        command,
        error: (error as Error).message,
      };
    }
  },
});

