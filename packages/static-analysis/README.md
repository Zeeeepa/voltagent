# @voltagent/static-analysis

A comprehensive static analysis module for detecting unused functions, methods, and procedures across codebases. Part of the Voltagent AI Agent Framework.

## Features

- 🔍 **Multi-language Support**: TypeScript, JavaScript, Python, and Go
- 🎯 **Unused Function Detection**: Identifies unused functions with high accuracy
- 📊 **Call Graph Analysis**: Builds function call relationships
- ⚡ **Fast Analysis**: Optimized for performance with configurable timeouts
- 🔧 **Configurable**: Flexible configuration options for different use cases
- 📈 **Confidence Scoring**: Provides confidence levels for findings
- 🔗 **Import/Export Tracking**: Analyzes module dependencies

## Installation

```bash
npm install @voltagent/static-analysis
# or
pnpm add @voltagent/static-analysis
# or
yarn add @voltagent/static-analysis
```

## Quick Start

### Basic Usage

```typescript
import { analyzeUnusedFunctions } from "@voltagent/static-analysis";

// Analyze entire codebase
const result = await analyzeUnusedFunctions("/path/to/codebase");

console.log(`Found ${result.findings.length} unused functions`);
result.findings.forEach(finding => {
  console.log(`${finding.file}:${finding.line} - ${finding.function} (${finding.confidence})`);
});
```

### PR Analysis

```typescript
import { analyzePRUnusedFunctions } from "@voltagent/static-analysis";

// Analyze only files changed in a PR
const changedFiles = ["src/utils.ts", "src/components/Button.tsx"];
const result = await analyzePRUnusedFunctions("/path/to/codebase", changedFiles);
```

### Advanced Configuration

```typescript
import { analyzeUnusedFunctions, SupportedLanguage } from "@voltagent/static-analysis";

const result = await analyzeUnusedFunctions("/path/to/codebase", {
  languages: [SupportedLanguage.TYPESCRIPT, SupportedLanguage.JAVASCRIPT],
  confidenceThreshold: 0.8,
  includeTests: false,
  excludePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.min.js"
  ],
  maxAnalysisTime: 30000 // 30 seconds
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `languages` | `SupportedLanguage[]` | All supported | Languages to analyze |
| `includePatterns` | `string[]` | `[]` | File patterns to include |
| `excludePatterns` | `string[]` | See defaults | File patterns to exclude |
| `confidenceThreshold` | `number` | `0.7` | Minimum confidence for reporting (0-1) |
| `includeTests` | `boolean` | `false` | Whether to analyze test files |
| `includeNodeModules` | `boolean` | `false` | Whether to analyze node_modules |
| `maxAnalysisTime` | `number` | `30000` | Maximum analysis time in milliseconds |

## Analysis Result

The analysis returns a structured result with the following format:

```typescript
interface UnusedFunctionAnalysisResult {
  module: "unused_function_detection";
  severity: "low" | "medium" | "high";
  findings: UnusedFunctionFinding[];
  metadata: {
    totalFunctions: number;
    filesAnalyzed: number;
    analysisTime: number;
    languagesAnalyzed: SupportedLanguage[];
    timestamp: string;
  };
}
```

### Finding Structure

Each finding includes:

```typescript
interface UnusedFunctionFinding {
  file: string;           // File path
  function: string;       // Function name
  line: number;          // Line number
  type: FunctionType;    // Type of function
  confidence: number;    // Confidence score (0-1)
  suggestion: string;    // Suggested action
  context?: string;      // Additional context
}
```

## Supported Languages

### TypeScript/JavaScript
- Function declarations
- Arrow functions
- Class methods
- Anonymous functions
- Import/export analysis

### Python
- Function definitions (`def`)
- Async functions (`async def`)
- Class methods
- Import statements

### Go
- Function declarations
- Methods with receivers
- Package imports

## Integration Examples

### CI/CD Pipeline

```typescript
import { analyzePRUnusedFunctions } from "@voltagent/static-analysis";

// In your CI script
const prFiles = process.env.PR_CHANGED_FILES?.split(',') || [];
const result = await analyzePRUnusedFunctions(process.cwd(), prFiles, {
  confidenceThreshold: 0.8,
  maxAnalysisTime: 15000
});

if (result.findings.length > 0) {
  console.log("⚠️ Unused functions detected:");
  result.findings.forEach(finding => {
    console.log(`  ${finding.file}:${finding.line} - ${finding.function}`);
  });
  process.exit(1);
}
```

### Linear Issue Creation

```typescript
import { analyzeUnusedFunctions } from "@voltagent/static-analysis";

const result = await analyzeUnusedFunctions("/path/to/codebase");

// Create Linear issues for high-confidence findings
const highConfidenceFindings = result.findings.filter(f => f.confidence > 0.9);

for (const finding of highConfidenceFindings) {
  await createLinearIssue({
    title: `Remove unused function: ${finding.function}`,
    description: `
      **File**: ${finding.file}:${finding.line}
      **Function**: ${finding.function}
      **Confidence**: ${(finding.confidence * 100).toFixed(1)}%
      **Suggestion**: ${finding.suggestion}
      ${finding.context ? `**Context**: ${finding.context}` : ''}
    `,
    labels: ["code-quality", "unused-code"]
  });
}
```

### Custom Parser

You can extend the analysis by registering custom parsers:

```typescript
import { ParserFactory, AbstractParser } from "@voltagent/static-analysis";

class CustomParser extends AbstractParser {
  readonly language = "custom" as any;
  readonly supportedExtensions = [".custom"];

  async extractFunctionDefinitions(filePath: string, content: string) {
    // Your custom parsing logic
    return [];
  }

  // Implement other required methods...
}

ParserFactory.registerParser(new CustomParser());
```

## Performance Considerations

- **Large Codebases**: Use `excludePatterns` to skip unnecessary files
- **Time Limits**: Set appropriate `maxAnalysisTime` for your use case
- **Memory Usage**: Consider analyzing in batches for very large projects
- **Confidence Threshold**: Higher thresholds reduce false positives but may miss some unused functions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `pnpm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

