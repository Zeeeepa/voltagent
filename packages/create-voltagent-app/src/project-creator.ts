import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import type { ProjectOptions } from "./types";
import { createSpinner } from "./utils/animation";
import fileManager from "./utils/file-manager";
import { getAllTemplates } from "./utils/templates";

export const createProject = async (options: ProjectOptions, targetDir: string): Promise<void> => {
  // Check and create folder
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      throw new Error(`The directory ${options.projectName} already exists and is not empty`);
    }
  }

  // Animated spinner
  const spinner = createSpinner("Creating project files...");
  spinner.start();

  try {
    // Create base directory structure
    await fileManager.ensureDir(targetDir);
    spinner.text = "Creating directory structure...";
    await fileManager.ensureDir(path.join(targetDir, "src"));
    await fileManager.ensureDir(path.join(targetDir, ".voltagent")); // VoltAgent folder

    // Try processing templates, use default content if error occurs
    spinner.text = "Processing templates...";
    const templates = getAllTemplates();

    // Log the sourcePath of the first template
    if (templates.length > 0) {
      console.log("[project-creator.ts] First template sourcePath:", templates[0].sourcePath);
    }

    let templateCounter = 0;
    const totalTemplates = templates.length;

    for (const template of templates) {
      templateCounter++;
      spinner.text = `Processing template ${templateCounter}/${totalTemplates}: ${chalk.dim(template.targetPath)}`;

      await fileManager.processTemplateFile(template, options, targetDir);
    }

    // Create .gitignore file
    spinner.text = "Setting up git configuration...";
    await fileManager.writeFile(
      path.join(targetDir, ".gitignore"),
      "node_modules\ndist\n.DS_Store\n",
    );

    spinner.succeed(chalk.green("VoltAgent project created successfully! 📁"));
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    throw error;
  }
};
