# CreatePR Prompt Engineering Template

## Overview

This repository contains a comprehensive prompt template for generating high-quality Pull Requests that are ready for review, with proper documentation, testing, and validation. The template is designed to be customizable for different technology stacks and project types, and integrates seamlessly with Codegen.

## Contents

- [Core Template](createpr-prompt-template.md) - The complete CreatePR template with all sections
- [Example Implementations](examples/) - Example implementations for different technology stacks:
  - [React and TypeScript](examples/react-typescript-example.md)
  - [Python and Django](examples/python-django-example.md)
  - [Node.js and Express](examples/nodejs-express-example.md)
- [Customization Guide](customization-guide.md) - Guidelines for customizing the template for specific project types
- [Codegen Integration Guide](codegen-integration-guide.md) - Instructions for using the template with Codegen

## Key Features

1. **Parallel Processing Strategy**
   * Break down PR creation into parallel sub-tasks (implementation, testing, documentation)
   * Create Linear sub-issues for each component that can be worked on independently
   * Define clear integration points between parallel work streams

2. **Context Gathering**
   * Specify exact files to examine before implementation
   * Include instructions for analyzing related PRs and issues
   * Define required background knowledge and prerequisites

3. **Quality Assurance**
   * Include comprehensive checklist for PR validation
   * Define specific test coverage requirements
   * Specify documentation standards and review process

4. **Comprehensive Structure**
   * Role definition for the implementer
   * Clear objective statement
   * Detailed context information
   * Structured implementation tasks
   * Specific deliverables
   * Measurable acceptance criteria

## How to Use

### Basic Usage

1. Copy the template from [createpr-prompt-template.md](createpr-prompt-template.md)
2. Fill in the placeholders with your specific project details
3. Use the completed template as your prompt to Codegen

### Advanced Usage

For more advanced usage, including customization for specific project types and integration with Codegen, refer to:

- [Customization Guide](customization-guide.md)
- [Codegen Integration Guide](codegen-integration-guide.md)

## Example

Here's a simplified example of how to use the template:

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in React and TypeScript.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a user authentication system.

## CONTEXT
**Repository**: https://github.com/organization/auth-service
**Base Branch**: main
**Feature Branch**: feature/user-authentication
**Related Issues**: AUTH-123, AUTH-124

**Requirements**:
- Implement user registration with email verification
- Add password reset functionality
- Implement multi-factor authentication support
- Ensure GDPR compliance for user data

## IMPLEMENTATION TASKS
...

## DELIVERABLES
...

## ACCEPTANCE CRITERIA
...
```

## Benefits

Using the CreatePR template provides several benefits:

1. **Consistency** - Ensures all PRs follow a consistent structure and quality standard
2. **Completeness** - Ensures all aspects of a quality PR are addressed
3. **Efficiency** - Enables parallel processing and clear task division
4. **Quality** - Emphasizes testing, documentation, and validation
5. **Clarity** - Provides clear expectations and acceptance criteria

## Contributing

Feel free to customize and extend this template for your specific needs. If you have improvements or additional examples, please submit a PR!

## License

This template is available under the MIT License. See the LICENSE file for more information.

