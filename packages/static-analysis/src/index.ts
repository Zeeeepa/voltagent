// Main exports for the static analysis package
export * from "./types";
export * from "./parsers";
export * from "./analyzers";
export * from "./utils";

// Convenience exports for common use cases
export { UnusedFunctionAnalyzer } from "./analyzers/unused-function-analyzer";
export { ParserFactory } from "./parsers";
export { ConfigUtils, DEFAULT_CONFIG } from "./utils/config-utils";
export { FileUtils } from "./utils/file-utils";

// Main analysis function for easy usage
import { UnusedFunctionAnalyzer } from "./analyzers/unused-function-analyzer";
import { ConfigUtils } from "./utils/config-utils";
import { FileUtils } from "./utils/file-utils";
import type { AnalysisInput, UnusedFunctionAnalysisResult, AnalysisConfig } from "./types";

/**
 * Perform unused function analysis on a codebase
 * @param rootPath - Root directory of the codebase
 * @param config - Analysis configuration (optional)
 * @returns Analysis result with unused function findings
 */
export async function analyzeUnusedFunctions(
  rootPath: string,
  config?: Partial<AnalysisConfig>
): Promise<UnusedFunctionAnalysisResult> {
  const analyzer = new UnusedFunctionAnalyzer();
  const mergedConfig = ConfigUtils.mergeConfig(config || {});
  
  // Validate configuration
  const validation = ConfigUtils.validateConfig(mergedConfig);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
  }

  // Find all files to analyze
  const extensions = ConfigUtils.getExtensionsForLanguages(mergedConfig.languages);
  const allFiles = await FileUtils.findFiles(rootPath, extensions, mergedConfig.excludePatterns);
  
  // Filter files based on include patterns
  const filesToAnalyze = mergedConfig.includePatterns.length > 0
    ? allFiles.filter(file => 
        mergedConfig.includePatterns.some(pattern => 
          FileUtils.matchesPattern(file, pattern)
        )
      )
    : allFiles;

  const input: AnalysisInput = {
    codebaseContext: {
      rootPath,
      filePaths: filesToAnalyze,
    },
    config: mergedConfig,
  };

  return analyzer.analyze(input);
}

/**
 * Perform unused function analysis on PR diff files
 * @param rootPath - Root directory of the codebase
 * @param prDiffFiles - Array of file paths that changed in the PR
 * @param config - Analysis configuration (optional)
 * @returns Analysis result with unused function findings
 */
export async function analyzePRUnusedFunctions(
  rootPath: string,
  prDiffFiles: string[],
  config?: Partial<AnalysisConfig>
): Promise<UnusedFunctionAnalysisResult> {
  const analyzer = new UnusedFunctionAnalyzer();
  const prConfig = ConfigUtils.createPRConfig(prDiffFiles);
  const mergedConfig = ConfigUtils.mergeConfig({ ...prConfig, ...config });
  
  const input: AnalysisInput = {
    prDiffFiles,
    codebaseContext: {
      rootPath,
      filePaths: prDiffFiles,
    },
    config: mergedConfig,
  };

  return analyzer.analyze(input);
}

