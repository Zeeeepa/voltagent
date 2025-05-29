# @voltagent/analysis

A comprehensive code analysis package for the VoltAgent framework, providing atomic analysis modules for PR automation and CI/CD systems.

## 🎯 Overview

This package implements the **Access Control & Authentication Module** as part of the comprehensive PR analysis system. It provides automated security analysis capabilities to detect authentication, authorization, and access control vulnerabilities in codebases.

## 🚀 Features

### Security Analysis Modules

- **Access Control Analyzer**: Validates authentication flows, authorization patterns, and access control mechanisms
- **Pattern Detection**: Identifies common security vulnerabilities across multiple frameworks
- **Multi-Language Support**: Supports JavaScript/TypeScript, Python, Go, Java, and more
- **Framework-Aware**: Recognizes Express.js, React, Django, Flask, Spring Boot patterns

### Key Capabilities

- ✅ **Authentication Validation**: Detects missing authentication middleware
- ✅ **Authorization Checks**: Identifies weak role-based access controls
- ✅ **Privilege Escalation**: Finds potential privilege escalation vulnerabilities
- ✅ **Session Management**: Validates session configuration and security
- ✅ **Token Validation**: Checks JWT token configuration and expiration
- ✅ **CSRF Protection**: Detects missing CSRF protection on state-changing endpoints
- ✅ **Secret Detection**: Identifies hardcoded secrets and credentials
- ✅ **Rate Limiting**: Checks for missing rate limiting on sensitive endpoints

## 📦 Installation

```bash
npm install @voltagent/analysis
# or
pnpm add @voltagent/analysis
```

## 🔧 Usage

### Basic Usage

```typescript
import { AccessControlAnalyzer, createAnalysisContext } from '@voltagent/analysis';

// Create analyzer
const analyzer = new AccessControlAnalyzer();

// Create analysis context
const context = createAnalysisContext(
  'routes/admin.js',
  `
    app.get('/admin/users', (req, res) => {
      res.json({ users: [] });
    });
  `,
  { framework: 'express' }
);

// Run analysis
const result = await analyzer.analyze([context]);

console.log('Findings:', result.findings);
console.log('Severity:', result.severity);
```

### Using the Factory

```typescript
import { AnalyzerFactory } from '@voltagent/analysis';

// Create analyzer using factory
const analyzer = AnalyzerFactory.createAnalyzer('access_control');

// Get all available analyzers
const availableAnalyzers = AnalyzerFactory.getAvailableAnalyzers();

// Create all security analyzers
const securityAnalyzers = AnalyzerFactory.createSecurityAnalyzers();
```

### Multiple File Analysis

```typescript
import { createAnalysisContext, mergeAnalysisResults } from '@voltagent/analysis';

const files = [
  { path: 'routes/admin.js', content: '...' },
  { path: 'auth/middleware.js', content: '...' },
  { path: 'config/database.js', content: '...' }
];

const contexts = files.map(file => 
  createAnalysisContext(file.path, file.content, { framework: 'express' })
);

const result = await analyzer.analyze(contexts);
```

## 📊 Analysis Output

The analyzer returns results in a structured format:

```json
{
  "module": "access_control_analysis",
  "severity": "high",
  "findings": [
    {
      "type": "missing_authentication",
      "file": "routes/admin.js",
      "line": 15,
      "endpoint": "GET /admin/users",
      "risk": "unauthorized_access",
      "suggestion": "Add authentication middleware",
      "description": "Admin endpoint lacks proper authentication",
      "severity": "critical"
    }
  ],
  "metadata": {
    "analysisTime": 150,
    "filesAnalyzed": 3,
    "totalLines": 245,
    "coverage": 85
  }
}
```

## 🔍 Supported Vulnerability Types

### Authentication Issues
- `missing_authentication`: Endpoints without authentication
- `weak_session_handling`: Insecure session configuration
- `token_validation`: JWT tokens without expiration

### Authorization Issues
- `weak_authorization`: Simple string role comparisons
- `privilege_escalation`: User-controlled role assignments
- `missing_authentication`: Admin functions without role checks

### Security Vulnerabilities
- `csrf_vulnerability`: Missing CSRF protection
- `insecure_storage`: Hardcoded secrets and credentials
- `rate_limiting`: Missing rate limiting on sensitive endpoints

## 🛠️ Framework Support

### Express.js / Node.js
- Route handler analysis
- Middleware detection
- JWT token validation
- Session configuration

### React / Frontend
- Component authentication guards
- API key exposure detection
- Client-side security patterns

### Python (Django/Flask)
- Decorator-based authentication
- View protection analysis
- Django middleware validation

### Java (Spring Boot)
- Annotation-based security
- Endpoint protection analysis
- Spring Security patterns

### Go
- HTTP handler analysis
- Middleware pattern detection
- Authentication flow validation

## 📈 Severity Levels

- **Critical**: Admin access vulnerabilities, privilege escalation, hardcoded secrets
- **High**: Missing authentication on sensitive endpoints, unprotected state-changing operations
- **Medium**: Weak authorization patterns, missing CSRF protection, insecure session config
- **Low**: Minor security improvements, best practice violations

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test
npm test -- access-control-analyzer.test.ts
```

## 📝 Configuration

The analyzer can be configured for different environments and frameworks:

```typescript
const analyzer = new AccessControlAnalyzer();

// Custom security patterns can be added
analyzer.addCustomPattern({
  name: 'custom_auth_check',
  pattern: /customAuth\(/gi,
  type: 'missing_authentication',
  severity: 'medium',
  description: 'Custom authentication pattern',
  suggestion: 'Use standard authentication middleware',
  risk: 'custom_auth_bypass'
});
```

## 🔗 Integration

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Security Analysis
  run: |
    npx @voltagent/analysis analyze --input ./src --output ./security-report.json
```

### Webhook Integration

```typescript
// Express webhook handler
app.post('/webhook/pr', async (req, res) => {
  const { files } = req.body;
  
  const contexts = files.map(file => 
    createAnalysisContext(file.path, file.content)
  );
  
  const result = await analyzer.analyze(contexts);
  
  // Create Linear issues for findings
  await createLinearIssues(result.findings);
  
  res.json({ status: 'analyzed', findings: result.findings.length });
});
```

## 🎯 Success Metrics

- **Coverage**: 100% endpoint security validation
- **Detection**: >95% access control issues found
- **Compliance**: Zero unprotected sensitive endpoints
- **Performance**: <5 minutes analysis time for typical PRs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Packages

- `@voltagent/core` - Core VoltAgent framework
- `@voltagent/cli` - Command-line interface
- `@voltagent/webhook` - Webhook integration (coming soon)

## 📞 Support

For issues and questions:
- GitHub Issues: [voltagent/issues](https://github.com/Zeeeepa/voltagent/issues)
- Documentation: [voltagent.dev](https://voltagent.dev)
- Discord: [VoltAgent Community](https://discord.gg/voltagent)

