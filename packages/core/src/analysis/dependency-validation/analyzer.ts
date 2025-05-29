import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";
import type {
  AnalysisOptions,
  DependencyValidationResult,
  Finding,
  ImportStatement,
  DependencyGraph,
  DependencyNode,
  PackageInfo,
  PackageManagerConfig,
  Severity,
  AutoFixResult,
} from "./types";
import { ImportParser } from "./parsers/import-parser";
import { CircularDependencyDetector } from "./detectors/circular-dependency-detector";
import { VersionAnalyzer } from "./analyzers/version-analyzer";
import { DeprecationChecker } from "./analyzers/deprecation-checker";
import { AutoFixer } from "./fixers/auto-fixer";

/**
 * Main dependency validation analyzer
 */
export class DependencyAnalyzer {
  private options: Required<AnalysisOptions>;
  private importParser: ImportParser;
  private circularDetector: CircularDependencyDetector;
  private versionAnalyzer: VersionAnalyzer;
  private deprecationChecker: DeprecationChecker;
  private autoFixer: AutoFixer;

  constructor(options: AnalysisOptions) {
    this.options = this.normalizeOptions(options);
    this.importParser = new ImportParser();
    this.circularDetector = new CircularDependencyDetector();
    this.versionAnalyzer = new VersionAnalyzer();
    this.deprecationChecker = new DeprecationChecker();
    this.autoFixer = new AutoFixer();
  }

  /**
   * Perform comprehensive dependency analysis
   */
  async analyze(): Promise<DependencyValidationResult> {
    const startTime = Date.now();
    const findings: Finding[] = [];

    try {
      // 1. Discover files to analyze
      const files = await this.discoverFiles();
      
      // 2. Parse imports from all files
      const imports = await this.parseImports(files);
      
      // 3. Build dependency graph
      const dependencyGraph = await this.buildDependencyGraph(imports);
      
      // 4. Load package information
      const packageInfo = await this.loadPackageInfo();
      
      // 5. Run analysis modules
      const unusedImports = await this.findUnusedImports(imports, files);
      const missingImports = await this.findMissingImports(imports, packageInfo);
      const circularDeps = await this.findCircularDependencies(dependencyGraph);
      const versionConflicts = await this.findVersionConflicts(packageInfo);
      const deprecatedPackages = await this.findDeprecatedPackages(packageInfo);
      const duplicateImports = await this.findDuplicateImports(imports);
      
      // 6. Collect all findings
      findings.push(
        ...unusedImports,
        ...missingImports,
        ...circularDeps,
        ...versionConflicts,
        ...deprecatedPackages,
        ...duplicateImports
      );

      // 7. Apply auto-fixes if enabled
      let autoFixResults: AutoFixResult[] = [];
      if (this.options.autoFix) {
        autoFixResults = await this.applyAutoFixes(findings);
      }

      // 8. Calculate severity and summary
      const severity = this.calculateOverallSeverity(findings);
      const summary = this.generateSummary(findings, files.length, packageInfo.length);
      
      const result: DependencyValidationResult = {
        module: "dependency_validation",
        severity,
        findings,
        summary,
        metadata: {
          analysisTimestamp: new Date().toISOString(),
          analysisVersion: "1.0.0",
          projectType: await this.detectProjectType(),
          packageManager: await this.detectPackageManager(),
        },
      };

      return result;
    } catch (error) {
      throw new Error(`Dependency analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Discover files to analyze based on options
   */
  private async discoverFiles(): Promise<string[]> {
    const patterns = this.options.include.length > 0 
      ? this.options.include 
      : ["**/*.{ts,tsx,js,jsx,mts,cts}"];
    
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.options.rootDir,
        ignore: this.options.exclude,
        absolute: true,
      });
      allFiles.push(...files);
    }

    // Remove duplicates and sort
    return [...new Set(allFiles)].sort();
  }

  /**
   * Parse import statements from files
   */
  private async parseImports(files: string[]): Promise<ImportStatement[]> {
    const allImports: ImportStatement[] = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf-8");
        const imports = await this.importParser.parseFile(file, content);
        allImports.push(...imports);
      } catch (error) {
        console.warn(`Failed to parse imports from ${file}:`, error);
      }
    }
    
    return allImports;
  }

  /**
   * Build dependency graph from imports
   */
  private async buildDependencyGraph(imports: ImportStatement[]): Promise<DependencyGraph> {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
    };

    // Group imports by file
    const importsByFile = new Map<string, ImportStatement[]>();
    for (const imp of imports) {
      if (!importsByFile.has(imp.file)) {
        importsByFile.set(imp.file, []);
      }
      importsByFile.get(imp.file)!.push(imp);
    }

    // Create nodes and edges
    for (const [file, fileImports] of importsByFile) {
      const nodeId = this.normalizeFilePath(file);
      
      if (!graph.nodes.has(nodeId)) {
        graph.nodes.set(nodeId, {
          id: nodeId,
          type: "file",
          path: file,
          dependencies: new Set(),
          dependents: new Set(),
          isExternal: false,
        });
      }

      const node = graph.nodes.get(nodeId)!;
      
      for (const imp of fileImports) {
        const depPath = await this.resolveImportPath(imp.module, file);
        if (depPath) {
          const depId = this.normalizeFilePath(depPath);
          node.dependencies.add(depId);
          
          if (!graph.edges.has(nodeId)) {
            graph.edges.set(nodeId, new Set());
          }
          graph.edges.get(nodeId)!.add(depId);
          
          // Create dependent node if it doesn't exist
          if (!graph.nodes.has(depId)) {
            graph.nodes.set(depId, {
              id: depId,
              type: this.isExternalModule(imp.module) ? "package" : "file",
              path: depPath,
              dependencies: new Set(),
              dependents: new Set(),
              isExternal: this.isExternalModule(imp.module),
            });
          }
          
          graph.nodes.get(depId)!.dependents.add(nodeId);
        }
      }
    }

    return graph;
  }

  /**
   * Load package information from package.json and lock files
   */
  private async loadPackageInfo(): Promise<PackageInfo[]> {
    const packageJsonPath = path.join(this.options.rootDir, "package.json");
    const packages: PackageInfo[] = [];
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
      
      // Process dependencies
      const deps = packageJson.dependencies || {};
      const devDeps = packageJson.devDependencies || {};
      const optionalDeps = packageJson.optionalDependencies || {};
      
      for (const [name, version] of Object.entries(deps)) {
        packages.push({
          name,
          version: version as string,
          isDevDependency: false,
          isOptionalDependency: false,
          isDirect: true,
        });
      }
      
      for (const [name, version] of Object.entries(devDeps)) {
        packages.push({
          name,
          version: version as string,
          isDevDependency: true,
          isOptionalDependency: false,
          isDirect: true,
        });
      }
      
      for (const [name, version] of Object.entries(optionalDeps)) {
        packages.push({
          name,
          version: version as string,
          isDevDependency: false,
          isOptionalDependency: true,
          isDirect: true,
        });
      }
    } catch (error) {
      console.warn("Failed to load package.json:", error);
    }
    
    return packages;
  }

  /**
   * Find unused imports
   */
  private async findUnusedImports(imports: ImportStatement[], files: string[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf-8");
        const fileImports = imports.filter(imp => imp.file === file);
        
        for (const imp of fileImports) {
          if (await this.isImportUnused(imp, content)) {
            findings.push({
              file: imp.file,
              line: imp.line,
              import: imp.module,
              issue: "unused_import",
              suggestion: `Remove unused import '${imp.module}'`,
              auto_fixable: true,
              severity: this.options.severityThresholds.unusedImports,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to analyze unused imports in ${file}:`, error);
      }
    }
    
    return findings;
  }

  /**
   * Find missing imports
   */
  private async findMissingImports(imports: ImportStatement[], packages: PackageInfo[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const packageNames = new Set(packages.map(p => p.name));
    
    for (const imp of imports) {
      if (this.isExternalModule(imp.module) && !packageNames.has(this.getPackageName(imp.module))) {
        findings.push({
          file: imp.file,
          line: imp.line,
          import: imp.module,
          issue: "missing_dependency",
          suggestion: `Add '${this.getPackageName(imp.module)}' to dependencies`,
          auto_fixable: false,
          severity: "medium",
        });
      }
    }
    
    return findings;
  }

  /**
   * Find circular dependencies
   */
  private async findCircularDependencies(graph: DependencyGraph): Promise<Finding[]> {
    return this.circularDetector.detect(graph, this.options.maxCircularDepth);
  }

  /**
   * Find version conflicts
   */
  private async findVersionConflicts(packages: PackageInfo[]): Promise<Finding[]> {
    if (!this.options.checkVersions) return [];
    return this.versionAnalyzer.findConflicts(packages);
  }

  /**
   * Find deprecated packages
   */
  private async findDeprecatedPackages(packages: PackageInfo[]): Promise<Finding[]> {
    if (!this.options.checkDeprecated) return [];
    return this.deprecationChecker.check(packages);
  }

  /**
   * Find duplicate imports
   */
  private async findDuplicateImports(imports: ImportStatement[]): Promise<Finding[]> {
    const findings: Finding[] = [];
    const importsByFile = new Map<string, ImportStatement[]>();
    
    // Group imports by file
    for (const imp of imports) {
      if (!importsByFile.has(imp.file)) {
        importsByFile.set(imp.file, []);
      }
      importsByFile.get(imp.file)!.push(imp);
    }
    
    // Check for duplicates within each file
    for (const [file, fileImports] of importsByFile) {
      const seen = new Set<string>();
      
      for (const imp of fileImports) {
        if (seen.has(imp.module)) {
          findings.push({
            file: imp.file,
            line: imp.line,
            import: imp.module,
            issue: "duplicate_import",
            suggestion: `Remove duplicate import of '${imp.module}'`,
            auto_fixable: true,
            severity: "low",
          });
        } else {
          seen.add(imp.module);
        }
      }
    }
    
    return findings;
  }

  /**
   * Apply auto-fixes to findings
   */
  private async applyAutoFixes(findings: Finding[]): Promise<AutoFixResult[]> {
    const autoFixableFindings = findings.filter(f => 
      "auto_fixable" in f && f.auto_fixable
    );
    
    return this.autoFixer.applyFixes(autoFixableFindings);
  }

  /**
   * Calculate overall severity
   */
  private calculateOverallSeverity(findings: Finding[]): Severity {
    const severities = findings.map(f => f.severity || "low");
    
    if (severities.includes("high")) return "high";
    if (severities.includes("medium")) return "medium";
    return "low";
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(findings: Finding[], filesAnalyzed: number, dependenciesAnalyzed: number) {
    const autoFixableIssues = findings.filter(f => 
      "auto_fixable" in f && f.auto_fixable
    ).length;
    
    const criticalIssues = findings.filter(f => f.severity === "high").length;
    
    return {
      totalIssues: findings.length,
      autoFixableIssues,
      criticalIssues,
      filesAnalyzed,
      dependenciesAnalyzed,
    };
  }

  /**
   * Detect project type
   */
  private async detectProjectType(): Promise<"typescript" | "javascript" | "go" | "python" | "unknown"> {
    const files = await fs.readdir(this.options.rootDir);
    
    if (files.includes("tsconfig.json")) return "typescript";
    if (files.includes("go.mod")) return "go";
    if (files.includes("requirements.txt") || files.includes("pyproject.toml")) return "python";
    if (files.includes("package.json")) return "javascript";
    
    return "unknown";
  }

  /**
   * Detect package manager
   */
  private async detectPackageManager(): Promise<"npm" | "yarn" | "pnpm" | "go" | "pip" | undefined> {
    const files = await fs.readdir(this.options.rootDir);
    
    if (files.includes("pnpm-lock.yaml")) return "pnpm";
    if (files.includes("yarn.lock")) return "yarn";
    if (files.includes("package-lock.json")) return "npm";
    if (files.includes("go.mod")) return "go";
    if (files.includes("requirements.txt")) return "pip";
    
    return undefined;
  }

  /**
   * Normalize analysis options with defaults
   */
  private normalizeOptions(options: AnalysisOptions): Required<AnalysisOptions> {
    return {
      rootDir: options.rootDir,
      include: options.include || [],
      exclude: options.exclude || ["**/node_modules/**", "**/dist/**", "**/build/**"],
      analyzeExternalDeps: options.analyzeExternalDeps ?? true,
      checkDeprecated: options.checkDeprecated ?? true,
      checkVersions: options.checkVersions ?? true,
      maxCircularDepth: options.maxCircularDepth ?? 10,
      autoFix: options.autoFix ?? false,
      severityThresholds: {
        unusedImports: "low",
        circularDependencies: "high",
        versionConflicts: "medium",
        deprecatedPackages: "medium",
        ...options.severityThresholds,
      },
    };
  }

  /**
   * Helper methods
   */
  private normalizeFilePath(filePath: string): string {
    return path.resolve(filePath);
  }

  private async resolveImportPath(module: string, fromFile: string): Promise<string | null> {
    // This is a simplified implementation
    // In a real implementation, you'd use Node.js module resolution
    if (this.isExternalModule(module)) {
      return module;
    }
    
    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, module);
    
    // Try different extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      try {
        await fs.access(withExt);
        return withExt;
      } catch {
        // Continue to next extension
      }
    }
    
    // Try index files
    for (const ext of extensions) {
      const indexFile = path.join(resolved, `index${ext}`);
      try {
        await fs.access(indexFile);
        return indexFile;
      } catch {
        // Continue to next extension
      }
    }
    
    return null;
  }

  private isExternalModule(module: string): boolean {
    return !module.startsWith(".") && !module.startsWith("/");
  }

  private getPackageName(module: string): string {
    if (module.startsWith("@")) {
      const parts = module.split("/");
      return parts.slice(0, 2).join("/");
    }
    return module.split("/")[0];
  }

  private async isImportUnused(imp: ImportStatement, content: string): Promise<boolean> {
    // Simplified unused import detection
    // In a real implementation, you'd use AST analysis
    for (const importName of imp.imports) {
      const regex = new RegExp(`\\b${importName}\\b`, "g");
      const matches = content.match(regex);
      if (matches && matches.length > 1) { // More than just the import declaration
        return false;
      }
    }
    return true;
  }
}

