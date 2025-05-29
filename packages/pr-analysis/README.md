# PR Analysis Package

Comprehensive code analysis modules for pull requests, focusing on compliance, security, and code quality.

## 📋 Compliance Analysis Module

The Compliance Analysis Module enforces coding standards, best practices, and regulatory compliance requirements across multiple programming languages.

### 🎯 Features

- **Code Style Validation**: Enforces language-specific formatting and style guidelines
- **Documentation Requirements**: Validates JSDoc, docstrings, and API documentation
- **License Compliance**: Checks license headers and validates license compatibility
- **Naming Conventions**: Enforces camelCase, PascalCase, snake_case per language standards
- **Security Compliance**: Detects security vulnerabilities and regulatory compliance issues (GDPR, SOX)

### 🔧 Supported Languages

- **TypeScript/JavaScript**: ESLint-compatible rules, JSDoc validation
- **Python**: PEP 8 compliance, docstring validation
- **Go**: gofmt standards, exported function documentation
- **Java**: Oracle style guide, Javadoc validation
- **C/C++**: Basic style and documentation checks

### 📊 Analysis Output

```json
{
  "module": "compliance_standards_analysis",
  "severity": "high",
  "findings": [
    {
      "type": "naming_convention",
      "file": "models/user.go",
      "line": 15,
      "variable": "userID",
      "expected": "UserID",
      "rule": "go_naming_convention",
      "auto_fixable": true
    }
  ],
  "metadata": {
    "executionTime": 1250,
    "filesAnalyzed": 42,
    "rulesApplied": ["style_guide", "documentation", "security_compliance"]
  }
}
```

## 🚀 Quick Start

### Installation

```bash
npm install @voltagent/pr-analysis
```

### Basic Usage

```typescript
import { ComplianceAnalysisModule, analyzeCompliance } from '@voltagent/pr-analysis';

// Using the factory function
const files = [
  { path: 'src/user.ts', content: 'export class user_service { ... }' },
  { path: 'src/api.py', content: 'def create_user(): ...' }
];

const result = await analyzeCompliance(files);
console.log(`Found ${result.findings.length} compliance issues`);

// Using the module directly
const module = new ComplianceAnalysisModule();
const analysis = await module.analyze(fileInfos);
```

### Configuration

```typescript
const config = module.getConfiguration();

// Customize rules
config.rules = {
  enforceStyleGuide: true,
  requireDocumentation: true,
  validateLicenses: true,
  enforceNamingConventions: true,
  securityCompliance: true,
  autoFixStyleViolations: true,
  documentationCoverage: 80,
  allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause']
};
```

## 🛠️ Analysis Categories

### 1. Code Style Validation

- **Indentation**: Consistent spacing (2 spaces for TS/JS, 4 for Python, tabs for Go)
- **Line Length**: Maximum line length enforcement
- **Semicolons**: Required in JavaScript/TypeScript
- **Trailing Whitespace**: Detection and auto-fix suggestions

### 2. Documentation Requirements

- **Function Documentation**: JSDoc, docstrings, Go comments
- **Class Documentation**: Comprehensive class-level documentation
- **File Headers**: License headers and file descriptions
- **API Documentation**: Public interface documentation

### 3. Naming Conventions

| Language | Variables | Functions | Classes | Constants |
|----------|-----------|-----------|---------|-----------|
| TypeScript/JS | camelCase | camelCase | PascalCase | CONSTANT_CASE |
| Python | snake_case | snake_case | PascalCase | CONSTANT_CASE |
| Go | camelCase/PascalCase | camelCase/PascalCase | PascalCase | CONSTANT_CASE |
| Java | camelCase | camelCase | PascalCase | CONSTANT_CASE |

### 4. License Compliance

- **Allowed Licenses**: MIT, Apache-2.0, BSD-3-Clause, ISC, GPL-3.0, LGPL-3.0
- **License Headers**: Required in source files
- **Package.json Validation**: License field validation
- **License File Validation**: Valid license text verification

### 5. Security Compliance

#### Data Protection (GDPR)
- Personal data handling detection
- Encryption requirement validation
- Data access logging requirements

#### Authentication & Authorization
- Hardcoded secrets detection
- API endpoint access control validation
- Weak cryptography detection

#### Regulatory Compliance (SOX)
- Audit logging requirements
- Critical operation tracking
- Data integrity validation

## 🔍 Security Rules

### High Severity
- **Hardcoded Secrets**: API keys, passwords, tokens in source code
- **SQL Injection**: Dynamic query construction vulnerabilities
- **Missing Access Control**: Unprotected API endpoints
- **Weak Cryptography**: MD5, SHA1, DES, RC4 usage

### Medium Severity
- **Insecure HTTP**: HTTP usage instead of HTTPS
- **Insufficient Logging**: Missing audit trails for critical operations
- **Environment Variable Exposure**: Env vars in logs

### Low Severity
- **Missing License Headers**: Source files without license information
- **Documentation Gaps**: Missing function or class documentation

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testNamePattern="Security Compliance"
```

## 📈 Performance

- **Analysis Speed**: < 5 minutes for typical PR (100-500 files)
- **Memory Usage**: < 100MB for large codebases
- **Auto-fix Rate**: > 80% for style violations
- **Accuracy**: > 95% issue detection rate

## 🔧 Integration

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Run Compliance Analysis
  run: |
    npm install @voltagent/pr-analysis
    node scripts/analyze-pr.js
```

### Webhook Integration

```typescript
// Express.js webhook handler
app.post('/webhook/pr', async (req, res) => {
  const { files } = await getPRFiles(req.body.pull_request);
  const analysis = await analyzeCompliance(files);
  
  if (analysis.severity === 'high') {
    await createLinearIssue(analysis);
  }
  
  res.json({ status: 'analyzed', findings: analysis.findings.length });
});
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new rules
4. Ensure all tests pass
5. Submit a pull request

### Adding New Rules

```typescript
// Add to appropriate validator
this.securityRules.push({
  id: 'new_security_rule',
  name: 'New Security Rule',
  description: 'Description of the rule',
  category: 'data_protection',
  severity: 'high',
  validator: (content: string, file: FileInfo) => {
    // Rule implementation
    return findings;
  }
});
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Support

- GitHub Issues: [Report bugs or request features](https://github.com/voltagent/voltagent/issues)
- Documentation: [Full API documentation](https://docs.voltagent.ai)
- Community: [Join our Discord](https://discord.gg/voltagent)

