/**
 * path-utils.ts
 * Utility functions for file path operations in Task Management System
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';

// Store last found project root to improve performance on subsequent calls
export let lastFoundProjectRoot: string | null = null;

// Project marker files that indicate a potential project root
export const PROJECT_MARKERS = [
  // Task Management specific
  'tasks.json',
  'tasks/tasks.json',

  // Common version control
  '.git',
  '.svn',

  // Common package files
  'package.json',
  'pyproject.toml',
  'Gemfile',
  'go.mod',
  'Cargo.toml',

  // Common IDE/editor folders
  '.cursor',
  '.vscode',
  '.idea',

  // Common dependency directories (check if directory)
  'node_modules',
  'venv',
  '.venv',

  // Common config files
  '.env',
  '.eslintrc',
  'tsconfig.json',
  'babel.config.js',
  'jest.config.js',
  'webpack.config.js',

  // Common CI/CD files
  '.github/workflows',
  '.gitlab-ci.yml',
  '.circleci/config.yml'
];

/**
 * Logger interface for path utilities
 */
export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Arguments for finding tasks.json
 */
export interface FindTasksJsonArgs {
  projectRoot?: string;
  file?: string;
}

/**
 * Gets the path to the task-management package installation directory
 * @returns Absolute path to the package installation directory
 */
export function getPackagePath(): string {
  // When running from source, __dirname is the directory containing this file
  // When running from npm, we need to find the package root
  const thisFilePath = fileURLToPath(import.meta.url);
  const thisFileDir = path.dirname(thisFilePath);

  // Navigate from task-management/utils up to the package root
  return path.resolve(thisFileDir, '../../../../');
}

/**
 * Finds the absolute path to the tasks.json file based on project root and arguments.
 * @param args - Command arguments, potentially including 'projectRoot' and 'file'.
 * @param log - Logger object.
 * @returns Absolute path to the tasks.json file.
 * @throws Error - If tasks.json cannot be found.
 */
export function findTasksJsonPath(args: FindTasksJsonArgs, log: Logger): string {
  // PRECEDENCE ORDER for finding tasks.json:
  // 1. Explicitly provided `projectRoot` in args (Highest priority)
  // 2. Previously found/cached `lastFoundProjectRoot` (primarily for CLI performance)
  // 3. Search upwards from current working directory (`process.cwd()`)

  // 1. If project root is explicitly provided, use it directly
  if (args.projectRoot) {
    const projectRoot = args.projectRoot;
    log.info(`Using explicitly provided project root: ${projectRoot}`);
    try {
      // This will throw if tasks.json isn't found within this root
      return findTasksJsonInDirectory(projectRoot, args.file, log);
    } catch (error: any) {
      // Include debug info in error
      const debugInfo = {
        projectRoot,
        currentDir: process.cwd(),
        serverDir: path.dirname(process.argv[1]),
        possibleProjectRoot: path.resolve(
          path.dirname(process.argv[1]),
          '../..'
        ),
        lastFoundProjectRoot,
        searchedPaths: error.message
      };

      error.message = `Tasks file not found in any of the expected locations relative to project root "${projectRoot}".
Debug Info: ${JSON.stringify(debugInfo, null, 2)}`;
      throw error;
    }
  }

  // --- Fallback logic primarily for CLI or when projectRoot isn't passed ---

  // 2. If we have a last known project root that worked, try it first
  if (lastFoundProjectRoot) {
    log.info(`Trying last known project root: ${lastFoundProjectRoot}`);
    try {
      // Use the cached root
      const tasksPath = findTasksJsonInDirectory(
        lastFoundProjectRoot,
        args.file,
        log
      );
      return tasksPath; // Return if found in cached root
    } catch (error) {
      log.info(
        `Task file not found in last known project root, continuing search.`
      );
      // Continue with search if not found in cache
    }
  }

  // 3. Start search from current directory (most common CLI scenario)
  const startDir = process.cwd();
  log.info(
    `Searching for tasks.json starting from current directory: ${startDir}`
  );

  // Try to find tasks.json by walking up the directory tree from cwd
  try {
    // This will throw if not found in the CWD tree
    return findTasksJsonWithParentSearch(startDir, args.file, log);
  } catch (error: any) {
    // If all attempts fail, augment and throw the original error from CWD search
    error.message = `${error.message}

Possible solutions:
1. Run the command from your project directory containing tasks.json
2. Use --project-root=/path/to/project to specify the project location (if using CLI)
3. Ensure the project root is correctly passed from the client

Current working directory: ${startDir}
Last known project root: ${lastFoundProjectRoot}
Project root from args: ${args.projectRoot}`;
    throw error;
  }
}

/**
 * Check if a directory contains any project marker files or directories
 * @param dirPath - Directory to check
 * @returns True if the directory contains any project markers
 */
function hasProjectMarkers(dirPath: string): boolean {
  return PROJECT_MARKERS.some((marker) => {
    const markerPath = path.join(dirPath, marker);
    // Check if the marker exists as either a file or directory
    return fs.existsSync(markerPath);
  });
}

/**
 * Search for tasks.json in a specific directory
 * @param dirPath - Directory to search in
 * @param explicitFilePath - Optional explicit file path relative to dirPath
 * @param log - Logger object
 * @returns Absolute path to tasks.json
 * @throws Error - If tasks.json cannot be found
 */
function findTasksJsonInDirectory(
  dirPath: string, 
  explicitFilePath?: string, 
  log?: Logger
): string {
  const possiblePaths: string[] = [];

  // 1. If a file is explicitly provided relative to dirPath
  if (explicitFilePath) {
    possiblePaths.push(path.resolve(dirPath, explicitFilePath));
  }

  // 2. Check the standard locations relative to dirPath
  possiblePaths.push(
    path.join(dirPath, 'tasks.json'),
    path.join(dirPath, 'tasks', 'tasks.json')
  );

  log?.info(`Checking potential task file paths: ${possiblePaths.join(', ')}`);

  // Find the first existing path
  for (const p of possiblePaths) {
    log?.info(`Checking if exists: ${p}`);
    const exists = fs.existsSync(p);
    log?.info(`Path ${p} exists: ${exists}`);

    if (exists) {
      log?.info(`Found tasks file at: ${p}`);
      // Store the project root for future use
      lastFoundProjectRoot = dirPath;
      return p;
    }
  }

  // If no file was found, throw an error
  const error = new Error(
    `Tasks file not found in any of the expected locations relative to ${dirPath}: ${possiblePaths.join(', ')}`
  );
  (error as any).code = 'TASKS_FILE_NOT_FOUND';
  throw error;
}

/**
 * Recursively search for tasks.json in the given directory and parent directories
 * Also looks for project markers to identify potential project roots
 * @param startDir - Directory to start searching from
 * @param explicitFilePath - Optional explicit file path
 * @param log - Logger object
 * @returns Absolute path to tasks.json
 * @throws Error - If tasks.json cannot be found in any parent directory
 */
function findTasksJsonWithParentSearch(
  startDir: string, 
  explicitFilePath?: string, 
  log?: Logger
): string {
  let currentDir = startDir;
  const rootDir = path.parse(currentDir).root;

  // Keep traversing up until we hit the root directory
  while (currentDir !== rootDir) {
    // First check for tasks.json directly
    try {
      return findTasksJsonInDirectory(currentDir, explicitFilePath, log);
    } catch (error) {
      // If tasks.json not found but the directory has project markers,
      // log it as a potential project root (helpful for debugging)
      if (hasProjectMarkers(currentDir)) {
        log?.info(`Found project markers in ${currentDir}, but no tasks.json`);
      }

      // Move up to parent directory
      const parentDir = path.dirname(currentDir);

      // Check if we've reached the root
      if (parentDir === currentDir) {
        break;
      }

      log?.info(
        `Tasks file not found in ${currentDir}, searching in parent directory: ${parentDir}`
      );
      currentDir = parentDir;
    }
  }

  // If we've searched all the way to the root and found nothing
  const error = new Error(
    `Tasks file not found in ${startDir} or any parent directory.`
  );
  (error as any).code = 'TASKS_FILE_NOT_FOUND';
  throw error;
}

/**
 * Finds potential PRD document files based on common naming patterns
 * @param projectRoot - The project root directory
 * @param explicitPath - Optional explicit path provided by the user
 * @param log - Logger object
 * @returns The path to the first found PRD file, or null if none found
 */
export function findPRDDocumentPath(
  projectRoot: string, 
  explicitPath?: string | null, 
  log?: Logger
): string | null {
  // If explicit path is provided, check if it exists
  if (explicitPath) {
    const fullPath = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(projectRoot, explicitPath);

    if (fs.existsSync(fullPath)) {
      log?.info(`Using provided PRD document path: ${fullPath}`);
      return fullPath;
    } else {
      log?.warn(
        `Provided PRD document path not found: ${fullPath}, will search for alternatives`
      );
    }
  }

  // Common locations and file patterns for PRD documents
  const commonLocations = [
    '', // Project root
    'scripts/'
  ];

  const commonFileNames = ['PRD.md', 'prd.md', 'PRD.txt', 'prd.txt'];

  // Check all possible combinations
  for (const location of commonLocations) {
    for (const fileName of commonFileNames) {
      const potentialPath = path.join(projectRoot, location, fileName);
      if (fs.existsSync(potentialPath)) {
        log?.info(`Found PRD document at: ${potentialPath}`);
        return potentialPath;
      }
    }
  }

  log?.warn(`No PRD document found in common locations within ${projectRoot}`);
  return null;
}

/**
 * Resolves the tasks output directory path
 * @param projectRoot - The project root directory
 * @param explicitPath - Optional explicit output path provided by the user
 * @param log - Logger object
 * @returns The resolved tasks directory path
 */
export function resolveTasksOutputPath(
  projectRoot: string, 
  explicitPath?: string | null, 
  log?: Logger
): string {
  // If explicit path is provided, use it
  if (explicitPath) {
    const outputPath = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(projectRoot, explicitPath);

    log?.info(`Using provided tasks output path: ${outputPath}`);
    return outputPath;
  }

  // Default output path: tasks/tasks.json in the project root
  const defaultPath = path.resolve(projectRoot, 'tasks', 'tasks.json');
  log?.info(`Using default tasks output path: ${defaultPath}`);

  // Ensure the directory exists
  const outputDir = path.dirname(defaultPath);
  if (!fs.existsSync(outputDir)) {
    log?.info(`Creating tasks directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return defaultPath;
}

/**
 * Resolves various file paths needed for operations based on project root
 * @param projectRoot - The project root directory
 * @param args - Command arguments that may contain explicit paths
 * @param log - Logger object
 * @returns An object containing resolved paths
 */
export function resolveProjectPaths(
  projectRoot: string, 
  args: { input?: string; output?: string }, 
  log?: Logger
): Record<string, string | null> {
  const prdPath = findPRDDocumentPath(projectRoot, args.input, log);
  const tasksJsonPath = resolveTasksOutputPath(projectRoot, args.output, log);

  // You can add more path resolutions here as needed

  return {
    projectRoot,
    prdPath,
    tasksJsonPath
    // Add additional path properties as needed
  };
}

