#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import { registerInitCommand } from "./commands/init";
import { registerUpdateCommand } from "./commands/update";
import { registerWhoamiCommand } from "./commands/whoami";
import { registerAddCommand } from "./commands/add";
import { registerAgentCommands } from "./commands/agent";
import { registerTaskCommands } from "./commands/task";
import { registerMcpCommands } from "./commands/mcp";
import { captureError } from "./utils/analytics";
import posthogClient from "./utils/analytics";

const createCLI = () => {
  // Create Commander program
  const program = new Command();

  // Set CLI information
  program
    .name("volt")
    .description("VoltAgent CLI - Tools for agent development and task management")
    .version("0.1.0");

  // Register commands
  registerInitCommand(program);
  registerUpdateCommand(program);
  registerWhoamiCommand(program);
  registerAddCommand(program);
  
  // Register command groups
  registerAgentCommands(program);
  registerTaskCommands(program);
  registerMcpCommands(program);

  return program;
};

const runCLI = async () => {
  try {
    // Welcome message
    console.log(
      chalk.cyan(
        figlet.textSync("VoltAgent CLI", {
          font: "Standard",
          horizontalLayout: "default",
          verticalLayout: "default",
        }),
      ),
    );

    // Run CLI
    const program = createCLI();
    await program.parseAsync(process.argv);

    // Ensure PostHog events are sent before exiting
    await posthogClient.shutdown();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("An unexpected error occurred:"));
    console.error(errorMessage);

    // Track unexpected error
    captureError({
      command: "unknown",
      errorMessage,
    });

    // Ensure PostHog events are sent before exiting with error
    await posthogClient.shutdown();
    process.exit(1);
  }
};

// Run
runCLI().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${errorMessage}`);

  // Track error in the CLI runner
  captureError({
    command: "cli_runner",
    errorMessage,
  });

  // Shutdown PostHog client before exiting
  posthogClient.shutdown().then(() => {
    process.exit(1);
  });
});

export { runCLI };
