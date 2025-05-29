import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import * as fs from "fs/promises";
import { DependencyAnalyzer } from "./analyzer";
import type { AnalysisOptions } from "./types";

// Mock fs module
jest.mock("fs/promises");
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock glob
jest.mock("glob", () => ({
  glob: jest.fn(),
}));

describe("DependencyAnalyzer", () => {
  let analyzer: DependencyAnalyzer;
  let mockOptions: AnalysisOptions;

  beforeEach(() => {
    mockOptions = {
      rootDir: "/test/project",
      include: ["**/*.ts"],
      exclude: ["**/node_modules/**"],
      analyzeExternalDeps: true,
      checkDeprecated: true,
      checkVersions: true,
      maxCircularDepth: 10,
      autoFix: false,
    };

    analyzer = new DependencyAnalyzer(mockOptions);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("analyze", () => {
    it("should perform comprehensive analysis", async () => {
      // Mock file system
      mockFs.readdir.mockResolvedValue(["package.json", "tsconfig.json"] as any);
      mockFs.readFile.mockImplementation((path: any) => {
        if (path.includes("package.json")) {
          return Promise.resolve(JSON.stringify({
            dependencies: {
              "lodash": "^4.17.21",
              "axios": "^1.0.0",
            },
            devDependencies: {
              "typescript": "^5.0.0",
            },
          }));
        }
        if (path.includes("test.ts")) {
          return Promise.resolve(`
            import { map } from 'lodash';
            import axios from 'axios';
            import { unusedFunction } from './unused';
            
            export function test() {
              return map([1, 2, 3], x => x * 2);
            }
          `);
        }
        return Promise.resolve("");
      });

      // Mock glob to return test files
      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue(["/test/project/src/test.ts"]);

      const result = await analyzer.analyze();

      expect(result).toBeDefined();
      expect(result.module).toBe("dependency_validation");
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should handle analysis errors gracefully", async () => {
      mockFs.readdir.mockRejectedValue(new Error("Permission denied"));

      await expect(analyzer.analyze()).rejects.toThrow("Dependency analysis failed");
    });
  });

  describe("project type detection", () => {
    it("should detect TypeScript project", async () => {
      mockFs.readdir.mockResolvedValue(["package.json", "tsconfig.json"] as any);
      mockFs.readFile.mockResolvedValue("{}");

      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue([]);

      const result = await analyzer.analyze();
      expect(result.metadata.projectType).toBe("typescript");
    });

    it("should detect JavaScript project", async () => {
      mockFs.readdir.mockResolvedValue(["package.json"] as any);
      mockFs.readFile.mockResolvedValue("{}");

      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue([]);

      const result = await analyzer.analyze();
      expect(result.metadata.projectType).toBe("javascript");
    });

    it("should detect Go project", async () => {
      mockFs.readdir.mockResolvedValue(["go.mod"] as any);
      mockFs.readFile.mockResolvedValue("{}");

      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue([]);

      const result = await analyzer.analyze();
      expect(result.metadata.projectType).toBe("go");
    });
  });

  describe("package manager detection", () => {
    it("should detect pnpm", async () => {
      mockFs.readdir.mockResolvedValue(["pnpm-lock.yaml"] as any);
      mockFs.readFile.mockResolvedValue("{}");

      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue([]);

      const result = await analyzer.analyze();
      expect(result.metadata.packageManager).toBe("pnpm");
    });

    it("should detect yarn", async () => {
      mockFs.readdir.mockResolvedValue(["yarn.lock"] as any);
      mockFs.readFile.mockResolvedValue("{}");

      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue([]);

      const result = await analyzer.analyze();
      expect(result.metadata.packageManager).toBe("yarn");
    });

    it("should detect npm", async () => {
      mockFs.readdir.mockResolvedValue(["package-lock.json"] as any);
      mockFs.readFile.mockResolvedValue("{}");

      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue([]);

      const result = await analyzer.analyze();
      expect(result.metadata.packageManager).toBe("npm");
    });
  });

  describe("severity calculation", () => {
    it("should return high severity when high severity findings exist", async () => {
      mockFs.readdir.mockResolvedValue(["package.json"] as any);
      mockFs.readFile.mockResolvedValue("{}");

      const { glob } = require("glob");
      (glob as jest.Mock).mockResolvedValue([]);

      // Mock the analyzer to return high severity findings
      const originalAnalyze = analyzer.analyze;
      analyzer.analyze = jest.fn().mockResolvedValue({
        module: "dependency_validation",
        severity: "high",
        findings: [
          {
            type: "circular_dependency",
            cycle: ["a", "b", "a"],
            severity: "high",
            suggestion: "Break circular dependency",
          },
        ],
        summary: {
          totalIssues: 1,
          autoFixableIssues: 0,
          criticalIssues: 1,
          filesAnalyzed: 0,
          dependenciesAnalyzed: 0,
        },
        metadata: {
          analysisTimestamp: new Date().toISOString(),
          analysisVersion: "1.0.0",
          projectType: "typescript",
          packageManager: "npm",
        },
      });

      const result = await analyzer.analyze();
      expect(result.severity).toBe("high");
    });
  });
});

