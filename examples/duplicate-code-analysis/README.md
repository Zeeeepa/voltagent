# Duplicate Code Detection Example

This example demonstrates how to use VoltAgent's duplicate code detection tool to analyze source code files for duplicated functionality, similar code blocks, and refactoring opportunities.

## Features

- **Exact Duplicate Detection**: Identifies identical code blocks with 100% accuracy
- **Semantic Similarity Analysis**: Finds structurally similar code with configurable thresholds
- **Cross-file Analysis**: Detects duplicates across multiple files
- **Refactoring Suggestions**: Provides specific recommendations for code improvement
- **Multi-language Support**: Works with TypeScript, JavaScript, Python, Java, Go, Rust, and more

## Usage

```typescript
import { Agent } from '@voltagent/core';
import { duplicateCodeDetectionTool } from '@voltagent/core/analysis';

// Create an agent with duplicate code detection capabilities
const codeAnalyzer = new Agent({
  name: 'Code Quality Analyzer',
  description: 'Analyzes code for duplicates and refactoring opportunities',
  tools: [duplicateCodeDetectionTool],
});

// Example files to analyze
const sourceFiles = [
  {
    path: 'src/auth/login.ts',
    content: `
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export function loginUser(email: string, password: string) {
  if (!validateEmail(email)) {
    throw new Error('Invalid email');
  }
  // Login logic...
}
    `
  },
  {
    path: 'src/auth/register.ts',
    content: `
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export function registerUser(email: string, password: string) {
  if (!validateEmail(email)) {
    throw new Error('Invalid email');
  }
  // Registration logic...
}
    `
  }
];

// Analyze the code
const result = await codeAnalyzer.run(
  'Analyze these files for duplicate code and provide refactoring suggestions',
  {
    tools: {
      duplicate_code_detection: {
        files: sourceFiles,
        config: {
          minLines: 3,
          minTokens: 30,
          similarityThreshold: 0.8,
          ignoreComments: true,
          ignoreWhitespace: true,
          fileExtensions: ['.ts', '.js'],
          excludePatterns: ['node_modules', 'dist'],
          enableSemanticAnalysis: true,
        }
      }
    }
  }
);

console.log('Analysis Results:', result);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minLines` | number | 5 | Minimum number of lines for a code block |
| `minTokens` | number | 50 | Minimum number of tokens for a code block |
| `similarityThreshold` | number | 0.8 | Similarity threshold for detecting duplicates (0-1) |
| `ignoreComments` | boolean | true | Whether to ignore comments in comparison |
| `ignoreWhitespace` | boolean | true | Whether to ignore whitespace in comparison |
| `fileExtensions` | string[] | ['.ts', '.js', '.tsx', '.jsx'] | File extensions to analyze |
| `excludePatterns` | string[] | ['node_modules', 'dist', 'build'] | Patterns to exclude |
| `enableSemanticAnalysis` | boolean | true | Whether to enable semantic similarity analysis |

## Output Format

The tool returns a comprehensive analysis result:

```json
{
  "module": "duplicate_code_detection",
  "severity": "medium",
  "findings": [
    {
      "type": "exact_duplicate",
      "similarity_score": 1.0,
      "locations": [
        {"file": "src/auth/login.ts", "lines": "2-5", "startLine": 2, "endLine": 5},
        {"file": "src/auth/register.ts", "lines": "2-5", "startLine": 2, "endLine": 5}
      ],
      "suggestion": "Extract common function or module",
      "refactor_opportunity": "create_shared_function",
      "code_snippet": "function validateEmail(email: string): boolean {\\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\\n  return emailRegex.test(email);\\n}",
      "hash": "a1b2c3d4"
    }
  ],
  "summary": {
    "total_duplicates": 1,
    "exact_duplicates": 1,
    "semantic_duplicates": 0,
    "files_analyzed": 2,
    "refactor_opportunities": 1
  },
  "config_used": { /* configuration that was used */ },
  "analysis_timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Finding Types

- **exact_duplicate**: Identical code blocks (similarity_score = 1.0)
- **structural_similar**: Very similar structure (similarity_score > 0.95)
- **semantic_similar**: Semantically similar code (similarity_score > threshold)
- **pattern_duplicate**: Repeated patterns or templates

## Refactoring Opportunities

The tool suggests specific refactoring strategies:

- `create_shared_function`: Extract duplicate code into a shared function
- `extract_common_structure`: Create a common base class or interface
- `potential_refactor`: Review for possible refactoring opportunities

## Integration with CI/CD

You can integrate this tool into your CI/CD pipeline to automatically detect code duplicates:

```yaml
# .github/workflows/code-quality.yml
name: Code Quality Analysis
on: [push, pull_request]

jobs:
  duplicate-detection:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run duplicate code detection
        run: node scripts/analyze-duplicates.js
```

## Best Practices

1. **Regular Analysis**: Run duplicate code detection regularly as part of your development workflow
2. **Threshold Tuning**: Adjust similarity thresholds based on your codebase characteristics
3. **Exclude Generated Code**: Use exclude patterns to skip auto-generated files
4. **Review Suggestions**: Manually review refactoring suggestions before implementing
5. **Team Guidelines**: Establish team guidelines for acceptable duplication levels

## Advanced Usage

For more advanced scenarios, you can extend the tool or combine it with other static analysis tools:

```typescript
import { createToolkit } from '@voltagent/core';
import { duplicateCodeDetectionTool } from '@voltagent/core/analysis';

const codeQualityToolkit = createToolkit({
  name: 'Code Quality Toolkit',
  description: 'Comprehensive code quality analysis tools',
  tools: [
    duplicateCodeDetectionTool,
    // Add other analysis tools here
  ],
});

const qualityAgent = new Agent({
  name: 'Quality Assurance Agent',
  description: 'Performs comprehensive code quality analysis',
  toolkits: [codeQualityToolkit],
});
```

