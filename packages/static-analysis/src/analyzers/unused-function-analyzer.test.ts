import { describe, it, expect, beforeEach } from "vitest";
import { UnusedFunctionAnalyzer } from "./unused-function-analyzer";
import type { AnalysisInput, SupportedLanguage } from "../types";
import { ConfigUtils } from "../utils/config-utils";

describe("UnusedFunctionAnalyzer", () => {
  let analyzer: UnusedFunctionAnalyzer;

  beforeEach(() => {
    analyzer = new UnusedFunctionAnalyzer();
  });

  it("should create analyzer instance", () => {
    expect(analyzer).toBeInstanceOf(UnusedFunctionAnalyzer);
  });

  it("should handle empty codebase", async () => {
    const input: AnalysisInput = {
      codebaseContext: {
        rootPath: "/test",
        filePaths: [],
      },
      config: ConfigUtils.mergeConfig({}),
    };

    const result = await analyzer.analyze(input);

    expect(result.module).toBe("unused_function_detection");
    expect(result.findings).toHaveLength(0);
    expect(result.metadata.totalFunctions).toBe(0);
    expect(result.metadata.filesAnalyzed).toBe(0);
  });

  it("should handle analysis timeout gracefully", async () => {
    const input: AnalysisInput = {
      codebaseContext: {
        rootPath: "/test",
        filePaths: ["test.ts"],
      },
      config: ConfigUtils.mergeConfig({
        maxAnalysisTime: 1, // Very short timeout
      }),
    };

    const result = await analyzer.analyze(input);

    expect(result.module).toBe("unused_function_detection");
    expect(result.metadata.analysisTime).toBeGreaterThan(0);
  });

  it("should validate configuration", () => {
    const validConfig = ConfigUtils.mergeConfig({
      languages: [SupportedLanguage.TYPESCRIPT],
      confidenceThreshold: 0.8,
    });

    const validation = ConfigUtils.validateConfig(validConfig);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("should reject invalid configuration", () => {
    const invalidConfig = ConfigUtils.mergeConfig({
      confidenceThreshold: 1.5, // Invalid threshold
    });

    const validation = ConfigUtils.validateConfig(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

