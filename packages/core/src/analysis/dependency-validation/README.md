# Import & Dependency Validation Module

A comprehensive static analysis module for validating imports, detecting circular dependencies, and optimizing dependency usage in TypeScript/JavaScript projects.

## Features

- **Import Analysis**: Detect unused, missing, and incorrect imports
- **Circular Dependency Detection**: Find and analyze circular dependencies with suggestions
- **Version Conflict Detection**: Identify version conflicts and compatibility issues
- **Deprecated Package Detection**: Check for deprecated and vulnerable packages
- **Auto-fixing**: Automatically fix simple import issues
- **Multiple Project Types**: Support for TypeScript, JavaScript, Go, and Python projects
- **Package Manager Integration**: Works with npm, yarn, pnpm, and other package managers

## Quick Start

```typescript
import { DependencyAnalyzer, analyzeDependencies } from "@voltagent/core/analysis";

// Simple analysis
const result = await analyzeDependencies("/path/to/project");
console.log(`Found ${result.summary.totalIssues} issues`);

// Advanced analysis with custom options
const analyzer = new DependencyAnalyzer({
  rootDir: "/path/to/project",
  include: ["src/**/*.ts", "lib/**/*.ts"],
  exclude: ["**/*.spec.ts", "**/node_modules/**"],
  autoFix: true,
  checkDeprecated: true,
  checkVersions: true,
  maxCircularDepth: 10,
  severityThresholds: {
    unusedImports: "low",
    circularDependencies: "high",
    versionConflicts: "medium",
    deprecatedPackages: "medium",
  },
});

const result = await analyzer.analyze();
```

## Using with VoltAgent Tools

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { dependencyValidationTools } from "@voltagent/core/analysis";

const agent = new Agent({
  name: "Code Analyzer",
  description: "Analyzes code for dependency issues",
  tools: dependencyValidationTools,
});

const voltAgent = new VoltAgent({
  agents: { analyzer: agent },
});
```

## Analysis Results

The analyzer returns a comprehensive result object:

```typescript
interface DependencyValidationResult {
  module: "dependency_validation";
  severity: "low" | "medium" | "high";
  findings: Finding[];
  summary: {
    totalIssues: number;
    autoFixableIssues: number;
    criticalIssues: number;
    filesAnalyzed: number;
    dependenciesAnalyzed: number;
  };
  metadata: {
    analysisTimestamp: string;
    analysisVersion: string;
    projectType: "typescript" | "javascript" | "go" | "python" | "unknown";
    packageManager?: "npm" | "yarn" | "pnpm" | "go" | "pip";
  };
}
```

## Finding Types

### Import Issues

```typescript
{
  file: "src/utils.ts",
  line: 5,
  import: "lodash",
  issue: "unused_import",
  suggestion: "Remove unused import 'lodash'",
  auto_fixable: true,
  severity: "low"
}
```

### Circular Dependencies

```typescript
{
  type: "circular_dependency",
  cycle: ["auth.ts", "user.ts", "session.ts", "auth.ts"],
  suggestion: "Break circular dependency by extracting shared interfaces",
  severity: "high",
  files: ["src/auth.ts", "src/user.ts", "src/session.ts"]
}
```

### Version Conflicts

```typescript
{
  type: "version_conflict",
  package: "react",
  versions: ["^17.0.0", "^18.0.0"],
  suggestion: "Use React version 18.0.0 consistently",
  severity: "medium",
  files: ["package.json", "packages/ui/package.json"]
}
```

### Deprecated Packages

```typescript
{
  type: "deprecated_package",
  package: "request",
  version: "^2.88.0",
  deprecationReason: "Package is deprecated and no longer maintained",
  alternative: "axios, node-fetch, or built-in fetch",
  suggestion: "Replace deprecated package 'request' with 'axios'",
  severity: "medium",
  files: ["src/api.ts"]
}
```

## Configuration Options

### Analysis Options

```typescript
interface AnalysisOptions {
  rootDir: string;                    // Root directory to analyze
  include?: string[];                 // File patterns to include
  exclude?: string[];                 // File patterns to exclude
  analyzeExternalDeps?: boolean;      // Analyze external dependencies
  checkDeprecated?: boolean;          // Check for deprecated packages
  checkVersions?: boolean;            // Validate version compatibility
  maxCircularDepth?: number;          // Max depth for circular detection
  autoFix?: boolean;                  // Auto-fix simple issues
  severityThresholds?: {              // Custom severity levels
    unusedImports?: Severity;
    circularDependencies?: Severity;
    versionConflicts?: Severity;
    deprecatedPackages?: Severity;
  };
}
```

### Default Configuration

```typescript
{
  include: [],                        // All supported files
  exclude: [                          // Common exclusions
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ],
  analyzeExternalDeps: true,
  checkDeprecated: true,
  checkVersions: true,
  maxCircularDepth: 10,
  autoFix: false,
  severityThresholds: {
    unusedImports: "low",
    circularDependencies: "high",
    versionConflicts: "medium",
    deprecatedPackages: "medium",
  }
}
```

## Auto-fixing

The module can automatically fix several types of issues:

- **Unused imports**: Remove unused import statements
- **Duplicate imports**: Remove duplicate import statements
- **Import organization**: Sort and organize imports
- **Basic path corrections**: Fix simple import path issues

```typescript
const analyzer = new DependencyAnalyzer({
  rootDir: "/path/to/project",
  autoFix: true,
});

const result = await analyzer.analyze();
console.log(`Auto-fixed ${result.summary.autoFixableIssues} issues`);
```

## Integration Examples

### CI/CD Integration

```typescript
// ci-check.ts
import { analyzeDependencies, getCriticalFindings } from "@voltagent/core/analysis";

async function checkDependencies() {
  const result = await analyzeDependencies(process.cwd(), {
    checkDeprecated: true,
    checkVersions: true,
  });
  
  const criticalIssues = getCriticalFindings(result.findings);
  
  if (criticalIssues.length > 0) {
    console.error(`Found ${criticalIssues.length} critical dependency issues`);
    process.exit(1);
  }
  
  console.log("✅ No critical dependency issues found");
}

checkDependencies().catch(console.error);
```

### Pre-commit Hook

```typescript
// pre-commit.ts
import { DependencyAnalyzer } from "@voltagent/core/analysis";

async function preCommitCheck() {
  const analyzer = new DependencyAnalyzer({
    rootDir: process.cwd(),
    autoFix: true,
    include: ["src/**/*.ts"],
  });
  
  const result = await analyzer.analyze();
  
  if (result.summary.totalIssues > 0) {
    console.log(`Fixed ${result.summary.autoFixableIssues} dependency issues`);
  }
}

preCommitCheck().catch(console.error);
```

### Custom Analysis

```typescript
import { 
  DependencyAnalyzer,
  ImportParser,
  CircularDependencyDetector 
} from "@voltagent/core/analysis";

// Custom circular dependency analysis
const detector = new CircularDependencyDetector();
const graph = await buildDependencyGraph();
const cycles = await detector.detect(graph, 5);

console.log(`Found ${cycles.length} circular dependencies`);

// Custom import parsing
const parser = new ImportParser();
const imports = await parser.parseFile("src/app.ts", fileContent);
console.log(`Found ${imports.length} import statements`);
```

## Performance Considerations

- **File Filtering**: Use `include` and `exclude` patterns to limit analysis scope
- **Circular Depth**: Reduce `maxCircularDepth` for faster analysis
- **External Dependencies**: Set `analyzeExternalDeps: false` to skip external package analysis
- **Parallel Processing**: The analyzer processes files in parallel for better performance

## Supported File Types

- TypeScript: `.ts`, `.tsx`, `.mts`, `.cts`
- JavaScript: `.js`, `.jsx`, `.mjs`, `.cjs`
- Configuration: `package.json`, `tsconfig.json`, `go.mod`, `requirements.txt`

## Error Handling

The analyzer handles errors gracefully:

```typescript
try {
  const result = await analyzeDependencies("/path/to/project");
  // Process result
} catch (error) {
  console.error("Analysis failed:", error.message);
  // Handle error appropriately
}
```

## Contributing

To extend the dependency validation module:

1. **Add new detectors**: Implement new analysis types in the `detectors/` directory
2. **Add new analyzers**: Create specialized analyzers in the `analyzers/` directory
3. **Add new fixers**: Implement auto-fix logic in the `fixers/` directory
4. **Add new parsers**: Support new file types in the `parsers/` directory

## License

This module is part of the VoltAgent framework and follows the same license terms.

