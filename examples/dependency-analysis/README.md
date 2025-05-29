# Dependency Analysis Example

This example demonstrates VoltAgent's comprehensive dependency analysis capabilities, including import validation, circular dependency detection, and automated code quality improvements.

## Features Demonstrated

- **Import Analysis**: Detect unused, missing, and incorrect imports
- **Circular Dependency Detection**: Find and analyze circular dependencies
- **Version Conflict Detection**: Identify version conflicts and compatibility issues
- **Deprecated Package Detection**: Check for deprecated and vulnerable packages
- **Auto-fixing**: Automatically fix simple import issues
- **Import Organization**: Sort and organize import statements

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up your OpenAI API key:**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

3. **Run the example:**
   ```bash
   pnpm dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Example Interactions

### Basic Dependency Analysis

**User:** "Analyze the dependencies in my project at /path/to/my-project"

**Agent Response:**
```
🔍 Analyzing dependencies in /path/to/my-project...

📊 Analysis Results:
- Total Issues: 12
- Critical Issues: 2
- Auto-fixable Issues: 8
- Files Analyzed: 45
- Dependencies Analyzed: 23

🚨 Critical Issues Found:
1. Circular dependency: auth.ts → user.ts → session.ts → auth.ts
2. Deprecated package: 'request' (use axios or fetch instead)

✅ Auto-fixable Issues:
- 5 unused imports
- 2 duplicate imports
- 1 incorrect import path

Would you like me to auto-fix the simple issues?
```

### Circular Dependency Detection

**User:** "Check for circular dependencies in my codebase"

**Agent Response:**
```
🔄 Scanning for circular dependencies...

Found 1 circular dependency:
📁 src/auth/auth.ts → src/user/user.ts → src/auth/session.ts → src/auth/auth.ts

💡 Suggestion: Break this cycle by:
1. Extract shared interfaces to src/types/auth.ts
2. Use dependency inversion for the auth service
3. Consider moving session logic to a separate module

This is a HIGH severity issue that should be addressed immediately.
```

### Auto-fixing Imports

**User:** "Find and fix unused imports in my TypeScript files"

**Agent Response:**
```
🔧 Scanning and fixing import issues...

Fixed 8 files:
✅ src/utils/helpers.ts - Removed 2 unused imports
✅ src/components/Button.tsx - Removed 1 unused import
✅ src/services/api.ts - Removed 3 unused imports
✅ src/hooks/useAuth.ts - Fixed 1 import path
✅ src/types/user.ts - Removed 1 duplicate import

📊 Summary:
- Removed 7 unused imports
- Fixed 1 incorrect import path
- Removed 1 duplicate import
- Organized imports in 8 files

Your code is now cleaner and more maintainable! 🎉
```

### Import Organization

**User:** "Organize imports in my TypeScript files"

**Agent Response:**
```
📝 Organizing imports...

Processed 23 TypeScript files:
✅ Sorted imports alphabetically
✅ Grouped external and internal imports
✅ Added proper spacing between import groups
✅ Removed duplicate imports

Files updated:
- src/components/*.tsx (12 files)
- src/services/*.ts (5 files)
- src/utils/*.ts (4 files)
- src/hooks/*.ts (2 files)

Your imports are now properly organized! 📚
```

## Advanced Usage

### Custom Analysis Options

The agent can accept custom analysis parameters:

**User:** "Analyze my project with custom settings: focus on high-severity issues only, enable auto-fix, and check for deprecated packages"

### CI/CD Integration

**User:** "Generate a CI-friendly report for my project that will fail the build if critical issues are found"

### Specific File Analysis

**User:** "Check only the files in src/components/ for dependency issues"

## Configuration

The example includes several pre-configured analysis tools:

1. **Full Dependency Analysis** - Comprehensive analysis with all checks enabled
2. **Quick Dependency Check** - Fast analysis focusing on critical issues only
3. **Import Organization** - Specialized tool for organizing import statements

## Understanding the Results

### Severity Levels

- **High**: Critical issues that should be fixed immediately (circular dependencies, security vulnerabilities)
- **Medium**: Important issues that should be addressed (version conflicts, deprecated packages)
- **Low**: Minor issues that improve code quality (unused imports, formatting)

### Auto-fixable Issues

The following issues can be automatically fixed:
- Unused imports
- Duplicate imports
- Basic import path corrections
- Import organization and sorting

### Manual Review Required

These issues require manual intervention:
- Circular dependencies (architectural changes needed)
- Version conflicts (dependency updates required)
- Deprecated packages (replacement packages needed)
- Missing dependencies (package installation required)

## Integration with Your Workflow

### Pre-commit Hooks

Add dependency analysis to your pre-commit hooks:

```bash
# .husky/pre-commit
npx voltagent-dependency-check --auto-fix
```

### CI/CD Pipeline

Include in your GitHub Actions or other CI systems:

```yaml
- name: Dependency Analysis
  run: npx voltagent-dependency-check --fail-on-critical
```

### IDE Integration

The analysis results can be integrated with popular IDEs for real-time feedback.

## Extending the Example

You can extend this example by:

1. **Adding custom rules**: Implement project-specific dependency rules
2. **Integration with linters**: Combine with ESLint, TSLint, or other tools
3. **Custom reporting**: Generate reports in different formats (JSON, HTML, etc.)
4. **Team notifications**: Send analysis results to Slack or other team channels

## Troubleshooting

### Common Issues

1. **Permission errors**: Ensure the agent has read/write access to your project files
2. **Large projects**: Use file filtering options for better performance
3. **False positives**: Configure severity thresholds to reduce noise

### Performance Tips

- Use `include` and `exclude` patterns to limit analysis scope
- Reduce `maxCircularDepth` for faster circular dependency detection
- Set `analyzeExternalDeps: false` to skip external package analysis for speed

## Learn More

- [VoltAgent Documentation](https://voltagent.dev/docs)
- [Dependency Analysis API Reference](https://voltagent.dev/docs/analysis)
- [Best Practices Guide](https://voltagent.dev/docs/best-practices)

