# EvaluatePR Prompt Engineering Template

## Overview

The EvaluatePR Prompt Engineering Template is a comprehensive framework for conducting thorough Pull Request evaluations that assess code quality, security, performance, and adherence to best practices while providing actionable feedback. This template is designed to be used with AI assistants like Codegen to automate and enhance the PR review process.

## Purpose

The purpose of this template is to:

1. Provide a structured approach to PR evaluation that covers all important aspects
2. Enable parallel processing of different evaluation dimensions
3. Generate specific, actionable feedback with concrete examples
4. Maintain consistency in review quality across all PRs
5. Save time for human reviewers who can focus on higher-level concerns

## Repository Structure

This repository contains the following components:

- **Base Template**: The core template structure that can be customized for different projects
- **Examples**: Implementations of the template for specific technology stacks
- **Customization Guide**: Instructions for adapting the template to your specific needs
- **Integration Guide**: Instructions for integrating the template with Codegen

## Key Features

### 1. Comprehensive Evaluation Framework

The template provides a structured approach to PR evaluation covering:

- Code quality assessment
- Functionality verification
- Security analysis
- Performance evaluation
- Test coverage analysis
- Documentation review
- Architectural alignment

### 2. Parallel Processing Strategy

The template is designed to support parallel processing of different evaluation aspects:

- Divide PR evaluation into independent assessment categories
- Create separate Linear sub-issues for each evaluation dimension
- Implement parallel review workflows for different aspects
- Define clear integration points for consolidated feedback

### 3. Actionable Feedback Structure

The template generates specific, actionable feedback:

- Categorized by type, severity, scope, and nature
- Includes file paths and line numbers
- Provides clear descriptions of concerns
- Assesses potential impact
- Offers specific improvement recommendations
- Includes code examples of improved implementations
- References relevant documentation or best practices

### 4. Technology Stack Examples

The repository includes examples for common technology stacks:

- React/Node.js
- Python/Django
- Java/Spring

Each example customizes the base template with technology-specific evaluation criteria and best practices.

## Getting Started

1. Review the base template in `base-template/evaluatepr-base-template.md`
2. Explore the examples in the `examples` directory to find one close to your technology stack
3. Follow the customization guide in `customization-guide/customization-guide.md` to adapt the template to your needs
4. Use the integration guide in `integration-guide/codegen-integration-guide.md` to set up automated PR reviews with Codegen

## Example Usage

Here's a simple example of how to use the template with Codegen:

1. Create a Linear issue for a PR that needs review
2. Include the PR URL, technology stack, and any specific review focus
3. Tag Codegen in the issue description
4. Codegen will analyze the PR and provide comprehensive feedback

Example Linear issue:

```
# PR Review Request

## PR Details
**Repository**: https://github.com/organization/repo-name
**PR Number**: 123
**Technology Stack**: React, Node.js, Express, MongoDB
**Review Focus**: Security, Performance

## Review Request
@codegen Please review this PR using the EvaluatePR template.

## Additional Context
This PR implements a new authentication system using OAuth. Please pay special attention to the security aspects.
```

## Customization

The template is designed to be highly customizable. You can adapt it for:

- Different technology stacks
- Various project types (microservices, monoliths, libraries)
- Different team maturity levels
- Specific regulatory compliance requirements
- Custom organizational standards

See the customization guide for detailed instructions.

## Integration with Codegen

The template can be integrated with Codegen in several ways:

1. Direct PR comment trigger
2. Linear issue-based workflow
3. Parallel processing with sub-issues

See the integration guide for detailed instructions on setting up these workflows.

## Contributing

Contributions to improve the template are welcome! Please feel free to submit pull requests with:

- Additional technology stack examples
- Enhancements to the base template
- Improvements to the customization or integration guides
- Bug fixes or clarifications

## License

This project is licensed under the MIT License - see the LICENSE file for details.

