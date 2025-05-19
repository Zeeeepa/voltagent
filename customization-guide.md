# Customization Guide for CreatePR Template

This guide provides detailed instructions for customizing the CreatePR template for specific project types and integrating it with Codegen.

## Customizing for Different Project Types

### 1. Frontend Applications

When customizing the template for frontend applications, focus on these key areas:

```markdown
## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * [COMPONENT_FILES]: UI components
  * [STATE_MANAGEMENT_FILES]: State management
  * [STYLE_FILES]: Styling and theming
* Ensure implementation follows these principles:
  * Component composition
  * State management patterns
  * Responsive design principles
* Handle edge cases:
  * Loading states
  * Error states
  * Empty states
  * Responsive breakpoints
  * Accessibility considerations

### 2. Test Coverage
* Implement unit tests for all components
* Create integration tests for user flows
* Implement visual regression tests
* Ensure test coverage meets minimum threshold of [COVERAGE_PERCENTAGE]%
* Include accessibility testing

### 3. Documentation
* Update component documentation
* Add usage examples
* Include prop documentation
* Add storybook stories or examples
```

**Additional Frontend Considerations:**
* Include browser compatibility requirements
* Add performance optimization guidelines
* Specify animation and transition requirements
* Include internationalization considerations
* Add theme and dark mode support requirements

### 2. Backend Services

When customizing the template for backend services, focus on these key areas:

```markdown
## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * [API_ENDPOINT_FILES]: API controllers/routes
  * [SERVICE_FILES]: Business logic services
  * [DATA_ACCESS_FILES]: Database access
  * [MIDDLEWARE_FILES]: Cross-cutting concerns
* Ensure implementation follows these principles:
  * Separation of concerns
  * Dependency injection
  * Error handling patterns
* Handle edge cases:
  * Input validation
  * Error scenarios
  * Performance edge cases
  * Concurrency issues

### 2. Test Coverage
* Implement unit tests for all services
* Create integration tests for API endpoints
* Implement performance tests
* Ensure test coverage meets minimum threshold of [COVERAGE_PERCENTAGE]%
* Include security testing

### 3. Documentation
* Update API documentation
* Add usage examples
* Include request/response examples
* Add sequence diagrams for complex flows
```

**Additional Backend Considerations:**
* Include database migration strategies
* Add API versioning guidelines
* Specify rate limiting requirements
* Include caching strategies
* Add monitoring and logging requirements

### 3. Infrastructure as Code

When customizing the template for infrastructure as code, focus on these key areas:

```markdown
## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * [INFRASTRUCTURE_DEFINITION_FILES]: Infrastructure definitions
  * [DEPLOYMENT_FILES]: Deployment configurations
  * [SECURITY_FILES]: Security policies
  * [MONITORING_FILES]: Monitoring configurations
* Ensure implementation follows these principles:
  * Infrastructure as code best practices
  * Security by design
  * Cost optimization
* Handle edge cases:
  * Resource provisioning failures
  * Scaling scenarios
  * Disaster recovery
  * Multi-region considerations

### 2. Test Coverage
* Implement unit tests for infrastructure modules
* Create integration tests for infrastructure deployment
* Implement security compliance tests
* Ensure test coverage meets minimum threshold of [COVERAGE_PERCENTAGE]%
* Include cost analysis

### 3. Documentation
* Update infrastructure documentation
* Add architecture diagrams
* Include deployment instructions
* Add runbooks for common operations
```

**Additional Infrastructure Considerations:**
* Include cost estimation and optimization
* Add compliance and security requirements
* Specify monitoring and alerting setup
* Include backup and disaster recovery strategies
* Add performance and scaling guidelines

### 4. Mobile Applications

When customizing the template for mobile applications, focus on these key areas:

```markdown
## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * [UI_FILES]: UI components
  * [NAVIGATION_FILES]: Navigation structure
  * [STATE_FILES]: State management
  * [NATIVE_INTEGRATION_FILES]: Native feature integration
* Ensure implementation follows these principles:
  * Platform-specific design guidelines
  * Performance optimization
  * Battery efficiency
* Handle edge cases:
  * Offline functionality
  * Device fragmentation
  * Permission handling
  * Low memory scenarios

### 2. Test Coverage
* Implement unit tests for all components
* Create integration tests for user flows
* Implement device-specific tests
* Ensure test coverage meets minimum threshold of [COVERAGE_PERCENTAGE]%
* Include performance testing on target devices

### 3. Documentation
* Update component documentation
* Add usage examples
* Include platform-specific considerations
* Add screenshots for different devices
```

**Additional Mobile Considerations:**
* Include app store submission requirements
* Add analytics and crash reporting
* Specify minimum OS version requirements
* Include push notification handling
* Add deep linking support requirements

### 5. Data Processing Systems

When customizing the template for data processing systems, focus on these key areas:

```markdown
## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * [PIPELINE_FILES]: Data pipeline definitions
  * [PROCESSOR_FILES]: Data processors
  * [CONNECTOR_FILES]: Data source/sink connectors
  * [SCHEMA_FILES]: Data schemas
* Ensure implementation follows these principles:
  * Data validation
  * Error handling and recovery
  * Performance optimization
* Handle edge cases:
  * Data quality issues
  * Processing failures
  * Scaling for large datasets
  * Backfilling historical data

### 2. Test Coverage
* Implement unit tests for all processors
* Create integration tests for end-to-end pipelines
* Implement performance tests with large datasets
* Ensure test coverage meets minimum threshold of [COVERAGE_PERCENTAGE]%
* Include data quality tests

### 3. Documentation
* Update pipeline documentation
* Add data flow diagrams
* Include schema documentation
* Add performance benchmarks
```

**Additional Data Processing Considerations:**
* Include data privacy and compliance requirements
* Add monitoring and alerting setup
* Specify error handling and recovery strategies
* Include data retention policies
* Add data lineage tracking requirements

## Customizing for Team Workflows

### 1. Agile Teams

For teams following Agile methodologies, customize the template to include:

```markdown
## CONTEXT
**Sprint**: [SPRINT_NUMBER]
**User Stories**: [USER_STORY_REFERENCES]
**Story Points**: [STORY_POINTS]

## IMPLEMENTATION TASKS
...

## ACCEPTANCE CRITERIA
- [ ] Meets all acceptance criteria from user stories
- [ ] Demo-ready for sprint review
- [ ] Documentation updated for sprint review
...

## ADDITIONAL NOTES
* Impact on sprint velocity: [VELOCITY_IMPACT]
* Demo preparation notes: [DEMO_NOTES]
```

### 2. DevOps-Focused Teams

For teams with a strong DevOps culture, customize the template to include:

```markdown
## IMPLEMENTATION TASKS
...

### 4. Deployment Strategy
* Deployment approach: [DEPLOYMENT_APPROACH]
* Feature flag configuration: [FEATURE_FLAG_DETAILS]
* Rollback procedure: [ROLLBACK_PROCEDURE]
* Monitoring setup: [MONITORING_DETAILS]

## ACCEPTANCE CRITERIA
- [ ] CI/CD pipeline successfully deploys changes
- [ ] Feature flags properly configured
- [ ] Monitoring alerts properly configured
- [ ] Rollback procedure tested
...
```

### 3. Security-Focused Teams

For teams with a strong security focus, customize the template to include:

```markdown
## IMPLEMENTATION TASKS
...

### 4. Security Validation
* Threat modeling: [THREAT_MODEL_DETAILS]
* Security testing: [SECURITY_TESTING_APPROACH]
* Compliance verification: [COMPLIANCE_REQUIREMENTS]
* Security documentation: [SECURITY_DOCUMENTATION]

## ACCEPTANCE CRITERIA
- [ ] Passes security static analysis
- [ ] Complies with security requirements
- [ ] No new vulnerabilities introduced
- [ ] Security documentation updated
...
```

## Integration with Codegen

### Using the Template with Codegen

#### 1. Direct Template Usage

The simplest way to use the template with Codegen is to copy it into your prompt when working with Codegen:

1. Copy the template from `createpr-prompt-template.md`
2. Fill in the placeholders with your specific project details
3. Use the completed template as your prompt to Codegen

Example prompt:

```
I need to create a PR for implementing a new user authentication system. Here's my template:

# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in Node.js and Express, specializing in code quality, testing, and deployment best practices.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a new user authentication system with complete test coverage, documentation, and validation.

...
[rest of the filled-in template]
```

#### 2. Creating a Custom Command

For more efficient usage, create a custom command or script that pre-fills the template:

```javascript
// createpr.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get command line arguments
const args = process.argv.slice(2);
const feature = args.find(arg => arg.startsWith('--feature=')).split('=')[1];
const techStack = args.find(arg => arg.startsWith('--tech-stack=')).split('=')[1];
const coverage = args.find(arg => arg.startsWith('--coverage=')).split('=')[1] || '85';

// Get repository information
const repoUrl = execSync('git config --get remote.origin.url').toString().trim();
const baseBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const featureBranch = `feature/${feature.toLowerCase().replace(/\s+/g, '-')}`;

// Read template
const templatePath = path.join(__dirname, 'createpr-prompt-template.md');
let template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders
template = template.replace('[TECHNOLOGY_STACK]', techStack);
template = template.replace('[FEATURE_DESCRIPTION]', feature);
template = template.replace('[REPO_URL]', repoUrl);
template = template.replace('[BASE_BRANCH]', baseBranch);
template = template.replace('[FEATURE_BRANCH]', featureBranch);
template = template.replace(/\[COVERAGE_PERCENTAGE\]/g, coverage);

// Output the filled template
console.log(template);
```

Usage:
```bash
node createpr.js --feature="User Authentication" --tech-stack="Node.js, Express" --coverage=90 | codegen
```

#### 3. Integration with Linear Workflows

To integrate with Linear workflows:

1. Create a Linear issue template that references the CreatePR template
2. Use Linear webhooks to trigger Codegen with the template
3. Use Linear custom fields to populate template variables

Example Linear issue template:

```markdown
## CreatePR Template

This issue requires a PR that follows the CreatePR Excellence Framework.

Feature: {{feature}}
Tech Stack: {{techStack}}
Coverage Requirement: {{coverage}}

@codegen Please create a PR using the CreatePR template with the above parameters.
```

### Best Practices for Codegen Integration

#### 1. Provide Comprehensive Context

For best results with Codegen:

* Include relevant code snippets from your codebase
* Link to related issues and PRs for context
* Specify exact file paths that need to be modified
* Include examples of similar implementations in your codebase

Example context enhancement:

```markdown
**Existing Implementation**:
```typescript
// src/services/auth.ts
export class AuthService {
  // Current implementation only supports basic login
  async login(username: string, password: string): Promise<User | null> {
    // Implementation details...
  }
}
```

**Similar Implementations**:
- User profile service: src/services/profile.ts
- Similar authentication flow in admin service: src/services/admin-auth.ts

**Related PRs**:
- PR #123: Initial authentication service implementation
- PR #456: Security improvements for existing auth flows
```

#### 2. Use Parallel Processing

To maximize efficiency with Codegen:

* Break down large PRs into sub-tasks
* Specify clear integration points between components
* Define dependencies between components
* Use Linear sub-issues for complex features

Example parallel processing strategy:

```markdown
## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - Authentication Service: Implement core authentication logic
  - API Endpoints: Implement REST API for auth flows
  - Email Service Integration: Implement verification emails
  - Frontend Components: Implement login/register forms
- Integration points between sub-tasks:
  - Auth service interfaces must be finalized before API implementation
  - API endpoints must be defined before frontend implementation
  - All components required for end-to-end testing
```

#### 3. Validate Results

Always validate Codegen's output:

* Review generated code for quality and correctness
* Verify test coverage meets requirements
* Ensure documentation is complete and accurate
* Run linting and static analysis tools
* Test the implementation thoroughly

#### 4. Iterative Refinement

Use an iterative approach with Codegen:

1. Start with a basic implementation request
2. Review the initial output
3. Provide feedback and additional context
4. Request specific improvements
5. Finalize the implementation

Example iterative conversation:

```
User: Here's my CreatePR template for a new authentication system...

Codegen: [Provides initial implementation]

User: The implementation looks good, but we need to add rate limiting to prevent brute force attacks. Also, the password reset flow should use our existing email service.

Codegen: [Refines implementation with rate limiting and email service integration]

User: Perfect! Now let's add comprehensive tests for the rate limiting functionality.

Codegen: [Adds tests for rate limiting]
```

By following these guidelines, you can effectively customize the CreatePR template for your specific project types and team workflows, and integrate it seamlessly with Codegen to produce high-quality Pull Requests.

