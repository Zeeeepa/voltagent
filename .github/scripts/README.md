# GitHub PR Validation Scripts

This directory contains comprehensive PR validation scripts designed for TypeScript/JavaScript projects.

## Scripts Overview

### 1. `pr_validator.py` - Structural Validation
A comprehensive structural validator that checks:
- **File Structure**: Validates file existence and basic syntax
- **TypeScript Compilation**: Ensures code compiles without errors
- **ESLint Rules**: Enforces code quality standards
- **Prettier Formatting**: Ensures consistent code formatting
- **Package Dependencies**: Validates package.json and checks for security vulnerabilities
- **Import/Export Analysis**: Detects unused imports and deep relative imports
- **Test Coverage**: Checks for corresponding test files
- **Architectural Patterns**: Validates file organization and naming conventions

### 2. `intelligent_pr_validator.py` - AI-Enhanced Validation
An intelligent validator that combines structural validation with AI-powered analysis:
- **All structural validation features** from `pr_validator.py`
- **AI-Powered Analysis**: Uses Codegen to provide intelligent code review
- **Framework-Specific Insights**: Tailored analysis based on detected framework (React, Vue, Angular, etc.)
- **Security & Performance Review**: AI-driven security and performance analysis
- **Architecture Assessment**: Evaluates design patterns and architectural decisions
- **Combined Scoring**: Provides a weighted score combining structural and AI analysis

## Usage

### Local Development
```bash
# Run structural validation only
python .github/scripts/pr_validator.py

# Run intelligent validation with AI (requires Codegen credentials)
export CODEGEN_ORG_ID="your-org-id"
export CODEGEN_API_TOKEN="your-api-token"
python .github/scripts/intelligent_pr_validator.py
```

### GitHub Actions Integration
The scripts are automatically triggered by the GitHub workflows:
- `pr-validation.yml`: Runs structural validation on every PR
- `intelligent-pr-validation.yml`: Runs AI-enhanced validation (requires secrets)

## Configuration

### Required Secrets (for AI validation)
Add these secrets to your GitHub repository:
- `CODEGEN_ORG_ID`: Your Codegen organization ID
- `CODEGEN_API_TOKEN`: Your Codegen API token

### Project Requirements
The validators work best with projects that have:
- `package.json` with proper dependencies
- `tsconfig.json` for TypeScript configuration
- `.eslintrc.js` or similar for ESLint configuration
- `.prettierrc` for Prettier configuration
- Test files following naming conventions (`*.test.ts`, `*.spec.ts`)

## Validation Categories

### Structural Validation
- **File Structure**: File existence, syntax errors
- **TypeScript Compilation**: Type checking and compilation errors
- **ESLint**: Code quality and style issues
- **Formatting**: Prettier formatting compliance
- **Dependencies**: Package security and validity
- **Imports**: Import/export analysis
- **Test Coverage**: Test file presence
- **Architecture**: File organization and naming

### AI Validation (Intelligent Validator Only)
- **Code Quality**: AI assessment of code maintainability
- **TypeScript Usage**: Type safety and best practices
- **Framework Practices**: Framework-specific recommendations
- **Security**: Security vulnerability detection
- **Performance**: Performance optimization suggestions
- **Testing**: Test quality and coverage analysis
- **Architecture**: Design pattern evaluation

## Output

### Reports Generated
- `pr_validation_report.md`: Human-readable validation report
- `pr_validation_result.json`: Machine-readable results
- `intelligent_validation_report.md`: Enhanced report with AI insights
- `intelligent_validation_result.json`: Combined structural + AI results

### Scoring System
- **Structural Score**: Based on errors (-20 points), warnings (-5 points), info (-1 point)
- **AI Score**: Provided by Codegen analysis (0-100)
- **Combined Score**: Weighted average (60% structural, 40% AI)

### Exit Codes
- `0`: Validation passed
- `1`: Validation failed (errors found or score below threshold)

## Customization

### Modifying Validation Rules
Edit the validator classes to add or modify validation rules:
- Add new validation methods to `PRValidator` class
- Modify scoring logic in `_calculate_structural_score`
- Customize AI prompts in `_create_ai_validation_prompt`

### Framework-Specific Validation
The intelligent validator automatically detects frameworks and provides tailored analysis:
- React: Component patterns, hooks usage, performance
- Vue: Composition API, reactivity patterns
- Angular: Dependency injection, lifecycle hooks
- Node.js/Express: Security, async patterns

## Troubleshooting

### Common Issues
1. **TypeScript compiler not found**: Ensure `typescript` is installed
2. **ESLint not available**: Install ESLint in your project
3. **Codegen authentication**: Check your org ID and API token
4. **File encoding issues**: Ensure files are UTF-8 encoded

### Debug Mode
Set environment variable for verbose output:
```bash
export DEBUG=1
python .github/scripts/pr_validator.py
```

## Contributing

To improve the validation scripts:
1. Add new validation rules to the appropriate category
2. Update the AI prompts for better analysis
3. Add support for new frameworks or tools
4. Improve error handling and reporting

## License

These scripts are part of the VoltAgent project and follow the same MIT license.

