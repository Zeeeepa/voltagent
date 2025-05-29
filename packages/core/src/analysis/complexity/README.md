# Code Complexity & Maintainability Analysis Module

This module provides comprehensive static analysis capabilities for measuring code complexity, maintainability metrics, and identifying refactoring candidates in TypeScript and JavaScript codebases.

## Features

- **Cyclomatic Complexity**: Measures the number of linearly independent paths through code
- **Cognitive Complexity**: Evaluates how difficult code is for humans to understand
- **Halstead Metrics**: Calculates volume, difficulty, and effort metrics
- **Maintainability Index**: Composite score indicating code maintainability (0-100)
- **Technical Debt Scoring**: Quantifies technical debt for prioritization
- **Nesting Depth Analysis**: Identifies deeply nested code structures
- **Parameter Count Analysis**: Flags functions with too many parameters

## Usage

### Basic Analysis

```typescript
import { ComplexityAnalyzer, analyzeFileComplexity, analyzeProjectComplexity } from '@voltagent/core';

// Analyze a single file
const findings = await analyzeFileComplexity('./src/complex-file.ts');
console.log(findings);

// Analyze entire project
const report = await analyzeProjectComplexity('./src');
console.log(report);
```

### Custom Configuration

```typescript
import { ComplexityAnalyzer } from '@voltagent/core';

const analyzer = new ComplexityAnalyzer({
  thresholds: {
    cyclomatic: { warning: 8, critical: 12 },
    cognitive: { warning: 12, critical: 20 },
    lines_of_code: { warning: 40, critical: 80 },
    nesting_depth: { warning: 3, critical: 5 },
    parameter_count: { warning: 4, critical: 6 },
  },
  exclude_patterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.*',
    '**/*.spec.*',
  ],
  calculate_halstead: true,
});

const result = await analyzer.analyzeProject('./src');
```

### Using as VoltAgent Tools

```typescript
import { complexityAnalysisTools } from '@voltagent/core';
import { createAgent } from '@voltagent/core';

const agent = createAgent({
  name: 'code-analyzer',
  tools: complexityAnalysisTools,
  // ... other config
});

// The agent can now use:
// - analyze_code_complexity
// - get_complexity_recommendations
```

## Output Format

### Analysis Result

```json
{
  "module": "complexity_analysis",
  "severity": "medium",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total_functions": 45,
    "functions_with_issues": 12,
    "average_complexity": 6.8,
    "highest_complexity": 18,
    "total_technical_debt": 245.6
  },
  "findings": [
    {
      "file": "src/handlers/api.ts",
      "function": "processRequest",
      "line_start": 15,
      "line_end": 67,
      "metrics": {
        "cyclomatic_complexity": 15,
        "cognitive_complexity": 22,
        "maintainability_index": 45,
        "lines_of_code": 52,
        "halstead_volume": 156.3,
        "halstead_difficulty": 8.2,
        "halstead_effort": 1281.7,
        "nesting_depth": 4,
        "parameter_count": 3
      },
      "thresholds_exceeded": ["cyclomatic", "cognitive"],
      "suggestion": "Break function into smaller, more focused methods; Reduce nesting by using early returns or guard clauses",
      "refactor_priority": "high",
      "technical_debt_score": 67.8
    }
  ],
  "thresholds": {
    "cyclomatic": { "warning": 10, "critical": 15 },
    "cognitive": { "warning": 15, "critical": 25 },
    "lines_of_code": { "warning": 50, "critical": 100 },
    "nesting_depth": { "warning": 4, "critical": 6 },
    "parameter_count": { "warning": 5, "critical": 8 }
  }
}
```

## Complexity Metrics Explained

### Cyclomatic Complexity
- **Formula**: Number of decision points + 1
- **Thresholds**: 
  - 1-10: Simple, low risk
  - 11-15: Moderate complexity, medium risk
  - 16+: High complexity, high risk

### Cognitive Complexity
- Measures how difficult code is for humans to understand
- Considers nesting levels and control flow
- More sophisticated than cyclomatic complexity

### Halstead Metrics
- **Volume**: Length × log₂(vocabulary)
- **Difficulty**: (unique operators / 2) × (total operands / unique operands)
- **Effort**: Difficulty × Volume

### Maintainability Index
- **Formula**: 171 - 5.2×ln(Volume) - 0.23×Complexity - 16.2×ln(LOC)
- **Scale**: 0-100 (higher is better)
- **Thresholds**:
  - 85-100: Highly maintainable
  - 65-84: Moderately maintainable
  - 0-64: Difficult to maintain

## Integration with CI/CD

This module is designed to integrate with the larger PR Analysis & CI/CD Automation System (ZAM-813). It can be used to:

1. **Automated PR Analysis**: Analyze complexity changes in pull requests
2. **Quality Gates**: Block merges based on complexity thresholds
3. **Technical Debt Tracking**: Monitor complexity trends over time
4. **Refactoring Prioritization**: Identify high-impact refactoring opportunities

## Best Practices

1. **Set Appropriate Thresholds**: Adjust thresholds based on your team's standards
2. **Focus on High-Impact Issues**: Prioritize critical and high-priority findings
3. **Track Trends**: Monitor complexity changes over time
4. **Integrate with Reviews**: Use findings to guide code review discussions
5. **Gradual Improvement**: Address technical debt incrementally

## Supported Languages

- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx)

## Limitations

- Uses lightweight AST parsing (not full TypeScript compiler)
- May not catch all edge cases in complex syntax
- Designed for typical TypeScript/JavaScript patterns

## Contributing

This module is part of the VoltAgent framework. For contributions and issues, please refer to the main VoltAgent repository.

