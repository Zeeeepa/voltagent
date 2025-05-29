import type { AnalysisConfig, SupportedLanguage } from "../types";
import { ParserFactory } from "../parsers";

/**
 * Default configuration for unused function analysis
 */
export const DEFAULT_CONFIG: AnalysisConfig = {
  languages: ParserFactory.getSupportedLanguages(),
  includePatterns: [],
  excludePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/coverage/**",
    "**/*.min.js",
    "**/*.bundle.js",
  ],
  confidenceThreshold: 0.7,
  includeTests: false,
  includeNodeModules: false,
  maxAnalysisTime: 30000, // 30 seconds
};

/**
 * Utility functions for configuration management
 */
export class ConfigUtils {
  /**
   * Merge user config with default config
   */
  static mergeConfig(userConfig: Partial<AnalysisConfig>): AnalysisConfig {
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      excludePatterns: [
        ...DEFAULT_CONFIG.excludePatterns,
        ...(userConfig.excludePatterns || []),
      ],
    };
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: AnalysisConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate languages
    if (!Array.isArray(config.languages) || config.languages.length === 0) {
      errors.push("At least one language must be specified");
    } else {
      const supportedLanguages = ParserFactory.getSupportedLanguages();
      const invalidLanguages = config.languages.filter(
        lang => !supportedLanguages.includes(lang)
      );
      if (invalidLanguages.length > 0) {
        errors.push(`Unsupported languages: ${invalidLanguages.join(", ")}`);
      }
    }

    // Validate confidence threshold
    if (typeof config.confidenceThreshold !== "number" || 
        config.confidenceThreshold < 0 || 
        config.confidenceThreshold > 1) {
      errors.push("Confidence threshold must be a number between 0 and 1");
    }

    // Validate max analysis time
    if (typeof config.maxAnalysisTime !== "number" || config.maxAnalysisTime <= 0) {
      errors.push("Max analysis time must be a positive number");
    }

    // Validate patterns
    if (!Array.isArray(config.includePatterns)) {
      errors.push("Include patterns must be an array");
    }

    if (!Array.isArray(config.excludePatterns)) {
      errors.push("Exclude patterns must be an array");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create configuration for specific languages
   */
  static createLanguageConfig(languages: SupportedLanguage[]): Partial<AnalysisConfig> {
    const extensions = languages.flatMap(lang => {
      const parser = ParserFactory.getParser(lang);
      return parser ? parser.supportedExtensions : [];
    });

    return {
      languages,
      includePatterns: extensions.map(ext => `**/*${ext}`),
    };
  }

  /**
   * Create configuration for PR analysis
   */
  static createPRConfig(changedFiles: string[]): Partial<AnalysisConfig> {
    // Extract unique extensions from changed files
    const extensions = [...new Set(
      changedFiles
        .map(file => file.substring(file.lastIndexOf(".")))
        .filter(ext => ParserFactory.getSupportedExtensions().includes(ext))
    )];

    // Determine languages based on extensions
    const languages = extensions.map(ext => {
      const parser = ParserFactory.getAllParsers().find(p => 
        p.supportedExtensions.includes(ext)
      );
      return parser?.language;
    }).filter((lang): lang is SupportedLanguage => lang !== undefined);

    return {
      languages: [...new Set(languages)],
      includePatterns: changedFiles,
      confidenceThreshold: 0.8, // Higher threshold for PR analysis
      includeTests: true, // Include tests in PR analysis
    };
  }

  /**
   * Create configuration for test files only
   */
  static createTestConfig(): Partial<AnalysisConfig> {
    return {
      includePatterns: [
        "**/*.test.*",
        "**/*.spec.*",
        "**/test/**/*",
        "**/tests/**/*",
        "**/__tests__/**/*",
      ],
      includeTests: true,
      confidenceThreshold: 0.9, // Higher threshold for test files
    };
  }

  /**
   * Create configuration for specific directories
   */
  static createDirectoryConfig(directories: string[]): Partial<AnalysisConfig> {
    return {
      includePatterns: directories.map(dir => `${dir}/**/*`),
    };
  }

  /**
   * Create minimal configuration for fast analysis
   */
  static createFastConfig(): Partial<AnalysisConfig> {
    return {
      excludePatterns: [
        ...DEFAULT_CONFIG.excludePatterns,
        "**/*.d.ts", // Exclude TypeScript declaration files
        "**/vendor/**", // Exclude vendor directories
        "**/third_party/**",
      ],
      confidenceThreshold: 0.8,
      maxAnalysisTime: 10000, // 10 seconds
      includeTests: false,
      includeNodeModules: false,
    };
  }

  /**
   * Create comprehensive configuration for thorough analysis
   */
  static createThoroughConfig(): Partial<AnalysisConfig> {
    return {
      confidenceThreshold: 0.6, // Lower threshold for more findings
      maxAnalysisTime: 60000, // 60 seconds
      includeTests: true,
      includeNodeModules: false, // Still exclude node_modules for performance
    };
  }

  /**
   * Get file extensions for specified languages
   */
  static getExtensionsForLanguages(languages: SupportedLanguage[]): string[] {
    return languages.flatMap(lang => {
      const parser = ParserFactory.getParser(lang);
      return parser ? parser.supportedExtensions : [];
    });
  }

  /**
   * Check if configuration is suitable for large codebases
   */
  static isConfigSuitableForLargeCodebase(config: AnalysisConfig, fileCount: number): boolean {
    const threshold = 1000; // Consider large if more than 1000 files
    
    if (fileCount <= threshold) {
      return true;
    }

    // For large codebases, ensure reasonable limits
    return (
      config.maxAnalysisTime >= 30000 && // At least 30 seconds
      !config.includeNodeModules && // Don't include node_modules
      config.excludePatterns.length > 0 // Have some exclusions
    );
  }
}

