# CodebaseErrorCheck Prompt Engineering Template

## Overview

The CodebaseErrorCheck Prompt Engineering Template is a comprehensive framework for systematic codebase error detection, analysis, and remediation. It helps identify bugs, security vulnerabilities, and performance issues across various technology stacks and project types.

## Key Features

- **Comprehensive Analysis Framework**: Covers static analysis, security vulnerability assessment, performance analysis, code quality assessment, and architecture review
- **Detailed Remediation Planning**: Provides structured approach to fixing identified issues with code examples and verification steps
- **Parallel Processing Strategy**: Enables efficient analysis through zone-based division and concurrent processing
- **Technology Stack Adaptability**: Customizable for different programming languages and frameworks
- **Integration with Development Workflows**: Seamlessly fits into existing Agile and DevOps processes
- **Codegen Integration**: Designed to work with Codegen for automated analysis and remediation

## Repository Structure

- [`codebase_error_check_template.md`](codebase_error_check_template.md): The core template with all sections and placeholders
- [`implementations/`](implementations/): Example implementations for different technology stacks
  - [`nodejs_react_implementation.md`](implementations/nodejs_react_implementation.md): Implementation for Node.js and React applications
  - [`python_django_implementation.md`](implementations/python_django_implementation.md): Implementation for Python and Django applications
  - [`java_spring_implementation.md`](implementations/java_spring_implementation.md): Implementation for Java and Spring Boot applications
- [`customization_guidelines.md`](customization_guidelines.md): Detailed guide for adapting the template to specific project types
- [`codegen_integration.md`](codegen_integration.md): Instructions for using the template with Codegen

## Getting Started

1. **Select the appropriate template**: Choose the base template or a specific implementation based on your technology stack
2. **Customize for your project**: Follow the customization guidelines to adapt the template to your specific needs
3. **Set up Codegen integration**: Use the integration guide to configure Codegen for automated analysis
4. **Create Linear issues**: Set up the main issue and sub-issues for parallel processing
5. **Execute the analysis**: Run the analysis using Codegen and collect findings
6. **Implement remediation**: Use the remediation planning framework to fix identified issues

## Example Usage

### Basic Usage

1. Create a new Linear issue with the title "CodebaseErrorCheck: [Your Project Name]"
2. Copy the content from `codebase_error_check_template.md` into the issue description
3. Replace all placeholders (text in [SQUARE_BRACKETS]) with your project-specific information
4. Assign the issue to Codegen
5. Follow Codegen's instructions for next steps

### Advanced Usage with Parallel Processing

1. Create the main issue as described above
2. Instruct Codegen to create sub-issues for different analysis categories
3. Configure each sub-issue with specific focus areas and methodologies
4. Use the main issue for coordination and consolidation
5. Follow the remediation planning process for identified issues

## Customization

The template can be customized based on:

- **Technology Stack**: Adapt for different programming languages and frameworks
- **Project Type**: Customize for monoliths, microservices, or serverless architectures
- **Team Structure**: Adjust for different team sizes and expertise levels
- **Organizational Requirements**: Incorporate specific compliance or security standards
- **Analysis Depth**: Scale from lightweight reviews to comprehensive audits

See [`customization_guidelines.md`](customization_guidelines.md) for detailed instructions.

## Integration with Codegen

The template is designed to work seamlessly with Codegen:

- **Automated Analysis**: Leverage Codegen's code analysis capabilities
- **Parallel Processing**: Distribute work across multiple Codegen agents
- **Remediation Assistance**: Get help implementing fixes for identified issues
- **Documentation Generation**: Automatically generate reports and documentation

See [`codegen_integration.md`](codegen_integration.md) for detailed integration instructions.

## Example Implementations

The repository includes example implementations for common technology stacks:

- **Node.js/React**: Web applications using JavaScript/TypeScript
- **Python/Django**: Web applications using Python
- **Java/Spring Boot**: Enterprise applications using Java

Each implementation includes technology-specific analysis methodologies, patterns to identify, and example remediation approaches.

## Contributing

To contribute to this template:

1. Fork the repository
2. Create a new implementation for your technology stack
3. Submit a pull request with your changes
4. Ensure your implementation follows the established structure

## License

This project is licensed under the MIT License - see the LICENSE file for details.

