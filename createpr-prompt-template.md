# CreatePR Prompt Engineering Template

## Overview

This document provides a comprehensive prompt template for generating high-quality Pull Requests that are ready for review, with proper documentation, testing, and validation. The template is designed to be customizable for different technology stacks and project types.

## Core Template

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in [TECHNOLOGY_STACK], specializing in code quality, testing, and deployment best practices. You have extensive experience with Git workflows, code reviews, and CI/CD pipelines.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements [FEATURE_DESCRIPTION] with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: [REPO_URL]
**Base Branch**: [BASE_BRANCH]
**Feature Branch**: [FEATURE_BRANCH]
**Related Issues**: [ISSUE_REFERENCES]

**Existing Implementation**:
```[LANGUAGE]
[RELEVANT_CODE_SNIPPETS]
```

**Requirements**:
- [SPECIFIC_REQUIREMENT_1]
- [SPECIFIC_REQUIREMENT_2]
- [SPECIFIC_REQUIREMENT_3]

## IMPLEMENTATION TASKS

### 1. Code Implementation
- Create/modify the following files:
  - [FILE_PATH_1]: [PURPOSE_1]
  - [FILE_PATH_2]: [PURPOSE_2]
- Ensure implementation follows these principles:
  - [PRINCIPLE_1]
  - [PRINCIPLE_2]
- Handle edge cases:
  - [EDGE_CASE_1]
  - [EDGE_CASE_2]

### 2. Test Coverage
- Implement unit tests for all new functionality
- Create integration tests for system interactions
- Verify edge cases and error handling
- Ensure test coverage meets minimum threshold of [COVERAGE_PERCENTAGE]%

### 3. Documentation
- Update relevant documentation files:
  - [DOC_FILE_1]: [UPDATE_DESCRIPTION_1]
  - [DOC_FILE_2]: [UPDATE_DESCRIPTION_2]
- Add inline code documentation following [DOCUMENTATION_STANDARD]
- Include usage examples for new functionality

### 4. Validation
- Verify all tests pass locally
- Ensure code meets linting standards
- Validate performance meets requirements
- Check for security vulnerabilities

### 5. PR Preparation
- Create a detailed PR description with:
  - Summary of changes
  - Implementation approach
  - Testing methodology
  - Screenshots/demos (if applicable)
- Add appropriate labels
- Request reviews from relevant team members

## DELIVERABLES
1. Complete implementation of [FEATURE_DESCRIPTION]
2. Comprehensive test suite with [COVERAGE_PERCENTAGE]% coverage
3. Updated documentation
4. Pull Request with detailed description

## ACCEPTANCE CRITERIA
- [ ] All tests pass in CI pipeline
- [ ] Code meets project's style guidelines
- [ ] Documentation is complete and accurate
- [ ] Implementation satisfies all requirements
- [ ] PR description is comprehensive and clear
- [ ] No security vulnerabilities introduced

## ADDITIONAL NOTES
- [ANY_SPECIAL_CONSIDERATIONS]
- [POTENTIAL_FUTURE_IMPROVEMENTS]
- [KNOWN_LIMITATIONS]

## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - [SUB_TASK_1]: [DESCRIPTION_1]
  - [SUB_TASK_2]: [DESCRIPTION_2]
  - [SUB_TASK_3]: [DESCRIPTION_3]
- Integration points between sub-tasks:
  - [INTEGRATION_POINT_1]: [DESCRIPTION_1]
  - [INTEGRATION_POINT_2]: [DESCRIPTION_2]
```

## Implementation Guidelines

### 1. Parallel Processing Strategy

To maximize efficiency and enable concurrent work streams:

* **Task Decomposition**: Break down PR creation into parallel sub-tasks:
  * Implementation of core functionality
  * Test suite development
  * Documentation updates
  * Integration and validation

* **Linear Sub-Issues**: Create Linear sub-issues for each component that can be worked on independently:
  ```
  - Parent Issue: Implement User Authentication System
    - Sub-Issue 1: Core Authentication Service Implementation
    - Sub-Issue 2: Test Suite Development
    - Sub-Issue 3: Documentation and API Examples
    - Sub-Issue 4: Security Validation and Compliance
  ```

* **Integration Points**: Define clear integration points between parallel work streams:
  ```
  - Integration Point 1: Service interfaces must be finalized before test development
  - Integration Point 2: Test coverage report required before documentation finalization
  - Integration Point 3: Security validation must be completed before PR submission
  ```

### 2. Context Gathering

Ensure comprehensive context is available before implementation:

* **File Examination**: Specify exact files to examine before implementation:
  ```
  Examine the following files before implementation:
  - src/services/auth.ts: Current authentication implementation
  - src/models/user.ts: User data model
  - src/config/security.ts: Security configuration
  ```

* **Related Work Analysis**: Include instructions for analyzing related PRs and issues:
  ```
  Review the following related work:
  - PR #123: Previous authentication refactoring
  - Issue AUTH-456: Security requirements specification
  - Wiki page: Authentication System Architecture
  ```

* **Prerequisites**: Define required background knowledge and prerequisites:
  ```
  Required knowledge:
  - OAuth 2.0 and OpenID Connect protocols
  - JWT token handling and validation
  - Rate limiting and security best practices
  ```

### 3. Quality Assurance

Establish clear quality standards:

* **Validation Checklist**: Include comprehensive checklist for PR validation:
  ```
  Validation Checklist:
  - [ ] All unit tests pass locally and in CI
  - [ ] Integration tests verify all user flows
  - [ ] No security vulnerabilities detected by SAST tools
  - [ ] Performance meets specified requirements
  - [ ] Code follows project style guidelines
  - [ ] Documentation is complete and accurate
  ```

* **Test Coverage**: Define specific test coverage requirements:
  ```
  Test Coverage Requirements:
  - Minimum 85% overall code coverage
  - 100% coverage for security-critical functions
  - All edge cases and error paths tested
  - Performance tests for high-traffic scenarios
  ```

* **Documentation Standards**: Specify documentation standards and review process:
  ```
  Documentation Standards:
  - JSDoc comments for all public APIs
  - README updates for new features
  - API examples for all new endpoints
  - Sequence diagrams for complex flows
  ```

## Example Implementations

### Example 1: React and TypeScript Frontend Feature

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in React and TypeScript, specializing in code quality, testing, and deployment best practices. You have extensive experience with Git workflows, code reviews, and CI/CD pipelines.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a new user authentication flow with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: https://github.com/organization/auth-service
**Base Branch**: main
**Feature Branch**: feature/user-authentication
**Related Issues**: AUTH-123, AUTH-124

**Existing Implementation**:
```typescript
// src/services/auth.ts
export class AuthService {
  // Current implementation only supports basic login
  async login(username: string, password: string): Promise<User | null> {
    // Implementation details...
  }
  
  // Need to add registration, password reset, and MFA
}
```

**Requirements**:
* Implement user registration with email verification
* Add password reset functionality
* Implement multi-factor authentication support
* Ensure GDPR compliance for user data

## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * src/services/auth.ts: Extend AuthService with new methods
  * src/controllers/auth-controller.ts: Add API endpoints
  * src/models/user.ts: Update user model for MFA
* Ensure implementation follows these principles:
  * Separation of concerns
  * Proper error handling
  * Input validation
* Handle edge cases:
  * Rate limiting for registration attempts
  * Secure token generation and validation
  * Expired verification links

### 2. Test Coverage
* Implement unit tests for all new functionality
* Create integration tests for API endpoints
* Verify edge cases and error handling
* Ensure test coverage meets minimum threshold of 85%

### 3. Documentation
* Update relevant documentation files:
  * docs/auth-flow.md: Add new authentication flows
  * README.md: Update API documentation
* Add inline code documentation following JSDoc standards
* Include usage examples for new functionality

### 4. Validation
* Verify all tests pass locally
* Ensure code meets ESLint standards
* Validate performance meets requirements
* Check for security vulnerabilities using OWASP guidelines

### 5. PR Preparation
* Create a detailed PR description with:
  * Summary of changes
  * Implementation approach
  * Testing methodology
  * Screenshots of new auth flows
* Add appropriate labels: feature, auth, security
* Request reviews from security team and senior developers

## DELIVERABLES
1. Complete implementation of enhanced authentication system
2. Comprehensive test suite with 85% coverage
3. Updated documentation with flow diagrams
4. Pull Request with detailed description

## ACCEPTANCE CRITERIA
- [ ] All tests pass in CI pipeline
- [ ] Code meets project's TypeScript style guidelines
- [ ] Documentation is complete and accurate
- [ ] Implementation satisfies all requirements
- [ ] PR description is comprehensive and clear
- [ ] No security vulnerabilities introduced

## ADDITIONAL NOTES
* Consider future integration with SSO providers
* Performance testing recommended for high-traffic scenarios
* Known limitation: Initial MFA implementation supports TOTP only

## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - Core Authentication Service: Implement registration, password reset, and MFA methods
  - API Controllers: Create endpoints for new authentication flows
  - Test Suite: Develop comprehensive tests for all new functionality
  - Documentation: Update docs and create usage examples
- Integration points between sub-tasks:
  - Service interfaces must be finalized before controller implementation
  - Test coverage report required before documentation finalization
  - Security validation must be completed before PR submission
```

### Example 2: Python Backend API Feature

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in Python and FastAPI, specializing in code quality, testing, and deployment best practices. You have extensive experience with Git workflows, code reviews, and CI/CD pipelines.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a new data processing pipeline with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: https://github.com/organization/data-service
**Base Branch**: main
**Feature Branch**: feature/data-processing-pipeline
**Related Issues**: DATA-456, DATA-457

**Existing Implementation**:
```python
# src/services/data_processor.py
class DataProcessor:
    # Current implementation only supports basic data validation
    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        # Basic validation logic
        return validated_data
    
    # Need to add advanced processing, transformation, and export capabilities
```

**Requirements**:
* Implement data transformation pipeline with configurable stages
* Add support for multiple export formats (JSON, CSV, Parquet)
* Implement caching for improved performance
* Add comprehensive logging and monitoring

## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * src/services/data_processor.py: Extend DataProcessor with pipeline capabilities
  * src/services/exporters/: Add exporters for different formats
  * src/services/transformers/: Add transformation stages
  * src/models/pipeline_config.py: Create configuration model
* Ensure implementation follows these principles:
  * Single responsibility principle
  * Dependency injection
  * Immutable data structures
* Handle edge cases:
  * Malformed input data
  * Pipeline stage failures
  * Resource constraints during processing

### 2. Test Coverage
* Implement unit tests for all pipeline stages
* Create integration tests for end-to-end pipelines
* Verify edge cases and error handling
* Ensure test coverage meets minimum threshold of 90%

### 3. Documentation
* Update relevant documentation files:
  * docs/data-pipeline.md: Add pipeline architecture documentation
  * README.md: Update API documentation
* Add inline code documentation following Google Python Style Guide
* Include usage examples for common pipeline configurations

### 4. Validation
* Verify all tests pass locally and in CI
* Ensure code meets Black and Flake8 standards
* Validate performance meets requirements
* Check for security vulnerabilities

### 5. PR Preparation
* Create a detailed PR description with:
  * Summary of changes
  * Implementation approach
  * Testing methodology
  * Performance benchmarks
* Add appropriate labels: feature, data-processing, performance
* Request reviews from data team and senior developers

## DELIVERABLES
1. Complete implementation of data processing pipeline
2. Comprehensive test suite with 90% coverage
3. Updated documentation with architecture diagrams
4. Pull Request with detailed description

## ACCEPTANCE CRITERIA
- [ ] All tests pass in CI pipeline
- [ ] Code meets project's Python style guidelines
- [ ] Documentation is complete and accurate
- [ ] Implementation satisfies all requirements
- [ ] PR description is comprehensive and clear
- [ ] No security vulnerabilities introduced
- [ ] Performance meets or exceeds requirements

## ADDITIONAL NOTES
* Consider future integration with streaming data sources
* Performance testing with large datasets recommended
* Known limitation: Initial implementation has limited parallelization

## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - Core Pipeline Framework: Implement the pipeline architecture and stage interfaces
  - Transformers: Implement individual transformation stages
  - Exporters: Implement export format handlers
  - Documentation and Examples: Create comprehensive documentation
- Integration points between sub-tasks:
  - Pipeline interfaces must be finalized before transformer implementation
  - Transformer implementations required before end-to-end testing
  - Performance benchmarks needed before documentation finalization
```

### Example 3: Java Microservice Feature

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in Java and Spring Boot, specializing in code quality, testing, and deployment best practices. You have extensive experience with Git workflows, code reviews, and CI/CD pipelines.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a new event-driven notification system with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: https://github.com/organization/notification-service
**Base Branch**: main
**Feature Branch**: feature/event-driven-notifications
**Related Issues**: NOTIF-789, NOTIF-790

**Existing Implementation**:
```java
// src/main/java/com/organization/notification/service/NotificationService.java
public class NotificationService {
    // Current implementation only supports direct API calls
    public void sendNotification(NotificationRequest request) {
        // Direct notification logic
    }
    
    // Need to add event-driven capabilities, templates, and delivery tracking
}
```

**Requirements**:
* Implement event-driven notification system using Kafka
* Add support for notification templates with variable substitution
* Implement delivery tracking and retry mechanisms
* Add support for multiple delivery channels (email, SMS, push)

## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * src/main/java/com/organization/notification/service/NotificationService.java: Add event handling
  * src/main/java/com/organization/notification/kafka/: Add Kafka consumers
  * src/main/java/com/organization/notification/template/: Add template engine
  * src/main/java/com/organization/notification/delivery/: Add delivery channels
* Ensure implementation follows these principles:
  * Interface segregation
  * Dependency injection
  * Resilience patterns
* Handle edge cases:
  * Kafka outages and rebalancing
  * Template rendering failures
  * Delivery channel unavailability

### 2. Test Coverage
* Implement unit tests for all components
* Create integration tests with embedded Kafka
* Implement end-to-end tests for notification flows
* Ensure test coverage meets minimum threshold of 85%

### 3. Documentation
* Update relevant documentation files:
  * docs/notification-system.md: Add system architecture
  * README.md: Update API documentation
* Add inline code documentation following Javadoc standards
* Include usage examples for common notification scenarios

### 4. Validation
* Verify all tests pass locally and in CI
* Ensure code meets Checkstyle standards
* Validate performance meets requirements
* Check for security vulnerabilities

### 5. PR Preparation
* Create a detailed PR description with:
  * Summary of changes
  * Implementation approach
  * Testing methodology
  * Performance benchmarks
* Add appropriate labels: feature, event-driven, kafka
* Request reviews from messaging team and senior developers

## DELIVERABLES
1. Complete implementation of event-driven notification system
2. Comprehensive test suite with 85% coverage
3. Updated documentation with architecture diagrams
4. Pull Request with detailed description

## ACCEPTANCE CRITERIA
- [ ] All tests pass in CI pipeline
- [ ] Code meets project's Java style guidelines
- [ ] Documentation is complete and accurate
- [ ] Implementation satisfies all requirements
- [ ] PR description is comprehensive and clear
- [ ] No security vulnerabilities introduced
- [ ] Performance meets or exceeds requirements

## ADDITIONAL NOTES
* Consider future integration with additional messaging systems
* Load testing with high message volumes recommended
* Known limitation: Initial implementation has limited batching capabilities

## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - Kafka Integration: Implement event consumers and producers
  - Template Engine: Implement template rendering system
  - Delivery Channels: Implement email, SMS, and push notification channels
  - Tracking System: Implement delivery tracking and retry mechanisms
- Integration points between sub-tasks:
  - Message format definitions required before consumer implementation
  - Template interfaces needed before delivery channel implementation
  - All components required for end-to-end testing
```

## Guidelines for Customizing the Template

### Adapting for Different Project Types

1. **Frontend Applications**
   * Emphasize UI/UX considerations
   * Include accessibility requirements
   * Add browser compatibility testing
   * Include responsive design validation
   * Consider state management patterns

2. **Backend Services**
   * Focus on API design and documentation
   * Include performance benchmarking
   * Add database migration strategies
   * Consider scalability and resilience patterns
   * Include API versioning guidelines

3. **Data Processing Systems**
   * Emphasize data validation and integrity
   * Include performance optimization techniques
   * Add data privacy and compliance requirements
   * Consider error handling and recovery strategies
   * Include monitoring and observability guidelines

4. **Mobile Applications**
   * Add platform-specific guidelines (iOS/Android)
   * Include offline functionality considerations
   * Add battery and resource usage optimization
   * Consider app store submission requirements
   * Include device compatibility testing

5. **Infrastructure as Code**
   * Focus on security and compliance
   * Include rollback and disaster recovery strategies
   * Add cost optimization considerations
   * Consider multi-environment deployment
   * Include infrastructure testing approaches

### Customizing for Team Workflows

1. **Agile Teams**
   * Link to user stories and acceptance criteria
   * Include sprint context and velocity impact
   * Add demo preparation guidelines
   * Consider incremental delivery approach
   * Include stakeholder review process

2. **DevOps-Focused Teams**
   * Emphasize CI/CD integration
   * Include deployment strategy details
   * Add monitoring and observability setup
   * Consider feature flag implementation
   * Include rollback procedures

3. **Security-Focused Teams**
   * Add detailed security review requirements
   * Include threat modeling considerations
   * Add compliance validation steps
   * Consider penetration testing requirements
   * Include security documentation updates

## Integration with Codegen

### Using the Template with Codegen

1. **Direct Template Usage**
   * Copy the template into your prompt when working with Codegen
   * Fill in the placeholders with your specific project details
   * Provide as much context as possible for better results

2. **Creating a Custom Command**
   * Create a custom command in your project that pre-fills the template
   * Include project-specific defaults for technology stack, style guides, etc.
   * Use environment variables to dynamically populate repository information

3. **Integration with Linear Workflows**
   * Link the template in your Linear issue templates
   * Reference the template in PR creation tasks
   * Use Linear custom fields to populate template variables

### Example Codegen Command

```bash
# Example usage with Codegen
codegen create-pr --template=pr-excellence --feature="User Authentication" --requirements="Auth flow, Password reset, MFA" --tech-stack="React, TypeScript" --coverage=85
```

### Best Practices for Codegen Integration

1. **Provide Comprehensive Context**
   * Always include relevant code snippets
   * Link to related issues and PRs
   * Specify exact file paths for modifications

2. **Use Parallel Processing**
   * Break down large PRs into sub-tasks
   * Specify clear integration points
   * Define dependencies between components

3. **Validate Results**
   * Review generated code for quality and correctness
   * Verify test coverage meets requirements
   * Ensure documentation is complete and accurate

4. **Iterative Refinement**
   * Start with a basic implementation
   * Refine with additional context and requirements
   * Use feedback to improve future PR creation

