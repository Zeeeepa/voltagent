# EvaluatePR Template Customization Guide

This guide provides instructions for customizing the EvaluatePR prompt template for specific project types, technology stacks, and organizational needs.

## Core Template Structure

The EvaluatePR template is designed with a modular structure that allows for easy customization:

```
# Pull Request Evaluation Excellence Framework v2.0

## ROLE
## OBJECTIVE
## CONTEXT
## EVALUATION METHODOLOGY
   ### 1. Code Quality Assessment
   ### 2. Functionality Verification
   ### 3. Security Analysis
   ### 4. Performance Evaluation
   ### 5. Test Coverage Analysis
   ### 6. Documentation Review
   ### 7. Architectural Alignment
## FEEDBACK CATEGORIZATION
## FEEDBACK STRUCTURE
## SUMMARY EVALUATION
## DELIVERABLES
## ADDITIONAL CONSIDERATIONS
## PARALLEL PROCESSING STRATEGY
```

## Customization Parameters

The following sections of the template are designed to be customized for your specific needs:

### 1. Technology Stack Customization

The template contains placeholders that should be replaced with your specific technology stack:

- `[TECHNOLOGY_STACK]`: Replace with your primary technologies (e.g., "React and Node.js", "Python/Django", "Java/Spring")
- `[DOMAIN_SPECIFIC]`: Replace with your application domain (e.g., "full-stack JavaScript", "web", "enterprise Java", "mobile")
- `[TECH_STACK_DETAILS]`: Provide a detailed list of technologies used in your project
- `[ADDITIONAL_TECH]`: Add any additional technologies specific to your project

Example customization:
```
**Technology Stack**: React, Redux, Node.js, Express, MongoDB, Jest, Cypress, Docker
```

### 2. Quality Standards Customization

Replace the quality standard placeholders with your organization's specific standards:

- `[QUALITY_STANDARD_1]`, `[QUALITY_STANDARD_2]`, `[QUALITY_STANDARD_3]`: Replace with your specific code quality standards
- `[REVIEW_STANDARDS]`: List the coding standards and style guides used in your organization
- `[ADDITIONAL_STANDARDS]`: Add any additional standards specific to your project

Example customization:
```
**Review Standards**: Google JavaScript Style Guide, React Best Practices, Node.js Best Practices, Company API Design Guidelines
```

### 3. Security Concerns Customization

Replace the security concern placeholders with security issues relevant to your technology stack:

- `[SECURITY_CONCERN_1]`, `[SECURITY_CONCERN_2]`, `[SECURITY_CONCERN_3]`: Replace with specific security concerns for your application
- `[SECURITY_STANDARD_1]`, `[SECURITY_STANDARD_2]`: Replace with security standards relevant to your organization

Example customization:
```
- Identify potential security issues:
  - Authentication token handling and storage
  - CSRF protection in forms and API endpoints
  - Input validation and sanitization
  - Secure data transmission
  - Proper permission checks
```

### 4. Project Context Customization

Add project-specific context to help the reviewer understand the PR better:

- `[PROJECT_CONTEXT]`: Provide relevant information about the project, its goals, and constraints

Example customization:
```
**Project Context**: This is a customer-facing e-commerce application with high traffic volumes. The system processes sensitive payment information and must comply with PCI-DSS requirements. The application is deployed in a Kubernetes cluster on AWS.
```

### 5. Additional Considerations Customization

Replace the consideration placeholders with project-specific considerations:

- `[CONSIDERATION_1]`, `[CONSIDERATION_2]`, `[CONSIDERATION_3]`: Add specific considerations relevant to your project

Example customization:
```
## ADDITIONAL CONSIDERATIONS
- This feature will be highlighted in the upcoming product release next month
- The system experiences peak loads during holiday shopping seasons
- We've had performance issues with similar features in the past
- Accessibility compliance (WCAG 2.1 AA) is required for all UI components
- This code will be reviewed by external security auditors next quarter
```

## Customization for Different Project Types

### Microservices Architecture

For microservices projects, emphasize:

- Service boundaries and API contracts
- Inter-service communication patterns
- Distributed transaction handling
- Service discovery and registration
- Circuit breaker patterns
- Observability and monitoring

Example addition:
```
### 7. Architectural Alignment
- Evaluate alignment with microservices principles:
  - Service boundary definition
  - API contract design and versioning
  - Inter-service communication patterns
  - Event-driven architecture implementation
  - Circuit breaker and fallback mechanisms
  - Distributed tracing integration
  - Health check endpoints
```

### Frontend Applications

For frontend-focused projects, emphasize:

- Component architecture
- State management
- UI/UX consistency
- Accessibility compliance
- Browser compatibility
- Performance optimization

Example addition:
```
### 4. Performance Evaluation
- Assess frontend performance implications:
  - Bundle size and code splitting
  - Rendering optimization
  - Network request efficiency
  - Asset optimization (images, fonts, etc.)
  - Memory leaks in component lifecycle
  - Animation performance
```

### Data-Intensive Applications

For data-intensive applications, emphasize:

- Data modeling and schema design
- Query optimization
- Data processing pipelines
- Caching strategies
- Data consistency and integrity
- Batch processing efficiency

Example addition:
```
### 4. Performance Evaluation
- Assess data processing performance:
  - Query optimization and indexing strategy
  - Data access patterns
  - Batch processing efficiency
  - Memory usage for large datasets
  - Caching strategy and invalidation
  - Connection pooling configuration
```

### Mobile Applications

For mobile applications, emphasize:

- Platform-specific guidelines (iOS/Android)
- Offline functionality
- Battery and resource usage
- Screen size adaptability
- Native integration points
- App store compliance

Example addition:
```
### 1. Code Quality Assessment
- Evaluate code against quality standards:
  - Platform-specific guidelines (iOS Human Interface Guidelines, Material Design)
  - Mobile performance best practices
  - Battery optimization techniques
  - Offline-first design patterns
```

## Customization for Different Team Maturity Levels

### Junior Teams

For less experienced teams, emphasize:

- Educational aspects in feedback
- More detailed explanations
- Clear examples of best practices
- References to learning resources
- Positive reinforcement of good patterns

Example addition:
```
## FEEDBACK STRUCTURE
For each identified issue:
1. **Issue Location**: File path and line numbers
2. **Issue Description**: Clear description of the concern
3. **Educational Context**: Explanation of why this is an issue and the underlying principle
4. **Impact Assessment**: Potential impact on system
5. **Improvement Recommendation**: Specific, actionable suggestion with step-by-step guidance
6. **Code Example**: Example of improved implementation with comments explaining the changes
7. **Learning Resources**: Links to tutorials, documentation, or courses on the topic
```

### Senior Teams

For experienced teams, emphasize:

- Higher-level architectural feedback
- Performance optimization opportunities
- Advanced patterns and techniques
- Trade-off discussions
- Forward-looking considerations

Example addition:
```
## SUMMARY EVALUATION
Provide an overall assessment including:
1. **Strengths**: What aspects of the PR are well-implemented
2. **Areas for Improvement**: Key issues that should be addressed
3. **Architectural Implications**: How this change affects the broader system architecture
4. **Technical Debt Considerations**: Any technical debt created or addressed
5. **Future Scalability**: How this change will scale with increasing load or data
6. **Recommendation**: Approve, Request Changes, or Comment
```

## Customization for Regulatory Compliance

For projects with specific compliance requirements, add sections focused on those regulations:

### HIPAA Compliance (Healthcare)

Example addition:
```
### 3. Security Analysis
- Check for HIPAA compliance:
  - PHI data handling and storage
  - Access controls and audit logging
  - Encryption of data in transit and at rest
  - Authentication and authorization mechanisms
  - Breach notification capabilities
```

### PCI-DSS Compliance (Payment Processing)

Example addition:
```
### 3. Security Analysis
- Check for PCI-DSS compliance:
  - Secure handling of cardholder data
  - Encryption of sensitive authentication data
  - Access control implementation
  - Network security measures
  - Vulnerability management
  - Audit logging and monitoring
```

### GDPR Compliance (Data Protection)

Example addition:
```
### 3. Security Analysis
- Check for GDPR compliance:
  - User consent mechanisms
  - Data minimization principles
  - Right to access and right to be forgotten implementation
  - Data portability features
  - Privacy by design implementation
  - Data breach notification capabilities
```

## Template Extension Points

The template includes several extension points where you can add custom evaluation criteria:

1. Add new subsections to existing methodology sections
2. Add entirely new methodology sections for domain-specific concerns
3. Extend the feedback categorization with custom categories
4. Add project-specific deliverables

Example extension:
```
### 8. Localization and Internationalization
- Assess internationalization implementation:
  - String externalization
  - Date, time, and number formatting
  - RTL language support
  - Cultural considerations
  - Translation workflow integration
```

## Best Practices for Template Customization

1. **Start with a base template**: Begin with one of the provided examples closest to your technology stack
2. **Customize incrementally**: Make small, focused changes rather than rewriting the entire template
3. **Test with real PRs**: Apply your customized template to actual PRs to verify its effectiveness
4. **Gather feedback**: Ask team members for input on the template's usefulness
5. **Iterate and improve**: Continuously refine the template based on team feedback and changing project needs
6. **Version control**: Maintain your templates in version control to track changes over time
7. **Document customizations**: Add comments explaining why certain customizations were made

## Example Customization Workflow

1. Select the base template most relevant to your technology stack
2. Replace all placeholder values with your specific information
3. Add or remove evaluation criteria based on your project's needs
4. Adjust the feedback structure to match your team's communication style
5. Add any project-specific considerations or requirements
6. Test the template on a recent PR to verify its effectiveness
7. Gather feedback from the team and iterate on the template

