# Feature Implementation Excellence Framework v2.0

## Overview

This template provides a comprehensive framework for implementing new features with robust architecture, thorough testing, and seamless integration into existing codebases. It's designed to guide AI assistants and developers through the complete feature implementation lifecycle, from initial design to deployment and monitoring.

## How to Use This Template

1. Replace all placeholder values (indicated by `[PLACEHOLDER]`) with specific details relevant to your project
2. Customize sections based on your technology stack and project requirements
3. Use this template as a starting point for creating Linear issues or documentation for new feature implementations
4. For complex features, consider breaking down the implementation into sub-issues following the phase structure

## Template Structure

```
# Feature Implementation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in [TECHNOLOGY_STACK], specializing in feature design, implementation, and integration. You have deep expertise in software architecture, testing methodologies, and production-grade code quality.

## OBJECTIVE
Design and implement a comprehensive, production-ready [FEATURE_NAME] feature that integrates seamlessly with the existing codebase while following best practices for architecture, testing, and documentation.

## CONTEXT
**Repository**: [REPO_URL]
**Branch/Commit**: [BRANCH_OR_COMMIT]
**Feature Scope**: [FEATURE_DESCRIPTION]
**Technology Stack**: [TECH_STACK_DETAILS]

**Existing Architecture**:
```[ARCHITECTURE_DESCRIPTION]```

**Requirements**:
- [REQUIREMENT_1]
- [REQUIREMENT_2]
- [REQUIREMENT_3]

**Constraints**:
- [CONSTRAINT_1]
- [CONSTRAINT_2]
- [CONSTRAINT_3]

## DESIGN METHODOLOGY

### 1. Architecture Design
- Define the architectural approach:
  - [ARCHITECTURAL_PATTERN]
  - [PATTERN_JUSTIFICATION]
- Identify integration points with existing systems:
  - [INTEGRATION_POINT_1]: [INTEGRATION_DETAILS_1]
  - [INTEGRATION_POINT_2]: [INTEGRATION_DETAILS_2]
- Design component boundaries and responsibilities:
  - [COMPONENT_1]: [RESPONSIBILITY_1]
  - [COMPONENT_2]: [RESPONSIBILITY_2]

### 2. Data Model Design
- Define data structures:
  - [DATA_STRUCTURE_1]: [STRUCTURE_1_DETAILS]
  - [DATA_STRUCTURE_2]: [STRUCTURE_2_DETAILS]
- Establish data flow:
  - [DATA_FLOW_1]: [FLOW_1_DETAILS]
  - [DATA_FLOW_2]: [FLOW_2_DETAILS]
- Define persistence strategy:
  - [PERSISTENCE_APPROACH]
  - [SCHEMA_CHANGES]

### 3. Interface Design
- Define API contracts:
  - [API_ENDPOINT_1]: [ENDPOINT_1_DETAILS]
  - [API_ENDPOINT_2]: [ENDPOINT_2_DETAILS]
- Design user interfaces (if applicable):
  - [UI_COMPONENT_1]: [COMPONENT_1_DETAILS]
  - [UI_COMPONENT_2]: [COMPONENT_2_DETAILS]
- Establish error handling strategy:
  - [ERROR_SCENARIO_1]: [HANDLING_APPROACH_1]
  - [ERROR_SCENARIO_2]: [HANDLING_APPROACH_2]

## IMPLEMENTATION PLAN

### Phase 1: Foundation
1. **[TASK_1_1]**
   - **Description**: [TASK_1_1_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_1_1_1]: [IMPLEMENTATION_1_1_1]
     - [FILE_1_1_2]: [IMPLEMENTATION_1_1_2]
   - **Tests**: [TEST_APPROACH_1_1]

2. **[TASK_1_2]**
   - **Description**: [TASK_1_2_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_1_2_1]: [IMPLEMENTATION_1_2_1]
     - [FILE_1_2_2]: [IMPLEMENTATION_1_2_2]
   - **Tests**: [TEST_APPROACH_1_2]

### Phase 2: Core Implementation
1. **[TASK_2_1]**
   - **Description**: [TASK_2_1_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_2_1_1]: [IMPLEMENTATION_2_1_1]
     - [FILE_2_1_2]: [IMPLEMENTATION_2_1_2]
   - **Tests**: [TEST_APPROACH_2_1]

2. **[TASK_2_2]**
   - **Description**: [TASK_2_2_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_2_2_1]: [IMPLEMENTATION_2_2_1]
     - [FILE_2_2_2]: [IMPLEMENTATION_2_2_2]
   - **Tests**: [TEST_APPROACH_2_2]

### Phase 3: Integration
1. **[TASK_3_1]**
   - **Description**: [TASK_3_1_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_3_1_1]: [IMPLEMENTATION_3_1_1]
     - [FILE_3_1_2]: [IMPLEMENTATION_3_1_2]
   - **Tests**: [TEST_APPROACH_3_1]

2. **[TASK_3_2]**
   - **Description**: [TASK_3_2_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_3_2_1]: [IMPLEMENTATION_3_2_1]
     - [FILE_3_2_2]: [IMPLEMENTATION_3_2_2]
   - **Tests**: [TEST_APPROACH_3_2]

### Phase 4: Refinement
1. **[TASK_4_1]**
   - **Description**: [TASK_4_1_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_4_1_1]: [IMPLEMENTATION_4_1_1]
     - [FILE_4_1_2]: [IMPLEMENTATION_4_1_2]
   - **Tests**: [TEST_APPROACH_4_1]

2. **[TASK_4_2]**
   - **Description**: [TASK_4_2_DESCRIPTION]
   - **Files to Create/Modify**:
     - [FILE_4_2_1]: [IMPLEMENTATION_4_2_1]
     - [FILE_4_2_2]: [IMPLEMENTATION_4_2_2]
   - **Tests**: [TEST_APPROACH_4_2]

## TESTING STRATEGY
- **Unit Testing**:
  - [UNIT_TEST_APPROACH_1]
  - [UNIT_TEST_APPROACH_2]
- **Integration Testing**:
  - [INTEGRATION_TEST_APPROACH_1]
  - [INTEGRATION_TEST_APPROACH_2]
- **End-to-End Testing**:
  - [E2E_TEST_APPROACH_1]
  - [E2E_TEST_APPROACH_2]
- **Performance Testing**:
  - [PERFORMANCE_TEST_APPROACH_1]
  - [PERFORMANCE_TEST_APPROACH_2]

## DOCUMENTATION PLAN
- **Code Documentation**:
  - [CODE_DOCUMENTATION_APPROACH]
  - [DOCUMENTATION_STANDARDS]
- **API Documentation**:
  - [API_DOCUMENTATION_APPROACH]
  - [EXAMPLE_USAGE]
- **User Documentation** (if applicable):
  - [USER_DOCUMENTATION_APPROACH]
  - [USER_GUIDE_STRUCTURE]

## DEPLOYMENT STRATEGY
- **Feature Flags**:
  - [FEATURE_FLAG_APPROACH]
  - [ROLLOUT_STRATEGY]
- **Database Migrations**:
  - [MIGRATION_APPROACH]
  - [ROLLBACK_PLAN]
- **Monitoring and Alerting**:
  - [MONITORING_APPROACH]
  - [KEY_METRICS]
  - [ALERT_THRESHOLDS]

## RISK MANAGEMENT
- **Identified Risks**:
  - [RISK_1]: [RISK_1_DESCRIPTION]
  - [RISK_2]: [RISK_2_DESCRIPTION]
- **Mitigation Strategies**:
  - [MITIGATION_1]: [MITIGATION_1_DESCRIPTION]
  - [MITIGATION_2]: [MITIGATION_2_DESCRIPTION]
- **Fallback Plans**:
  - [FALLBACK_1]: [FALLBACK_1_DESCRIPTION]
  - [FALLBACK_2]: [FALLBACK_2_DESCRIPTION]

## DELIVERABLES
1. Complete implementation of [FEATURE_NAME]
2. Comprehensive test suite with [COVERAGE_PERCENTAGE]% coverage
3. API and code documentation
4. Migration scripts (if applicable)
5. Monitoring dashboards and alerts

## ACCEPTANCE CRITERIA
- [CRITERION_1]
- [CRITERION_2]
- [CRITERION_3]
- [CRITERION_4]
- [CRITERION_5]

## ADDITIONAL CONSIDERATIONS
- [CONSIDERATION_1]
- [CONSIDERATION_2]
- [CONSIDERATION_3]
```

## Implementation Guidelines

### Parallel Processing Strategy

* **Break down feature implementation into independent components**
  * Identify components that can be developed in parallel
  * Define clear interfaces between components
  * Create separate Linear sub-issues for each component

* **Create separate Linear sub-issues for each implementation phase**
  * Use the phase structure from the template
  * Assign clear owners and deadlines for each sub-issue
  * Link sub-issues to the parent feature issue

* **Implement parallel development workflows for different aspects**
  * Frontend and backend development can often proceed in parallel
  * Database schema changes can be developed alongside API implementation
  * Testing infrastructure can be set up while implementation is in progress

* **Define clear integration points between parallel work streams**
  * Establish API contracts early
  * Create mock implementations for dependencies
  * Schedule regular integration checkpoints

### Comprehensive Design Approach

* **Start with high-level architecture before implementation details**
  * Define the overall architectural approach
  * Identify patterns and principles to follow
  * Create architecture diagrams for complex features

* **Define clear interfaces between components**
  * Specify input/output contracts
  * Document dependencies and assumptions
  * Create interface definitions before implementation

* **Establish data models and flows early**
  * Define data structures and relationships
  * Document data transformations
  * Identify potential performance bottlenecks

* **Create detailed implementation plan with dependencies**
  * Break down tasks into manageable chunks
  * Identify critical path and dependencies
  * Estimate effort and complexity

### Test-Driven Development

* **Define test strategy before implementation**
  * Identify test types (unit, integration, e2e)
  * Define test coverage goals
  * Select appropriate testing tools and frameworks

* **Create tests alongside or before code**
  * Write test cases based on requirements
  * Use tests to validate design decisions
  * Implement test fixtures and mocks

* **Implement comprehensive test coverage**
  * Aim for high code coverage (typically 80%+)
  * Focus on critical paths and edge cases
  * Include negative test cases

* **Include performance and edge case testing**
  * Test with realistic data volumes
  * Simulate failure scenarios
  * Test boundary conditions and edge cases

### Customization Guidelines

* **For microservices architecture:**
  * Emphasize service boundaries and contracts
  * Include details on inter-service communication
  * Address distributed system concerns (latency, consistency)

* **For frontend-heavy features:**
  * Expand the UI component design section
  * Include details on state management
  * Address accessibility and responsive design

* **For data-intensive features:**
  * Expand the data model design section
  * Include details on data processing pipelines
  * Address performance and scalability concerns

* **For security-critical features:**
  * Add a dedicated security considerations section
  * Include threat modeling and security testing
  * Address compliance requirements

## Integration with Codegen

* **Creating Linear Issues:**
  * Use this template when creating new feature implementation issues
  * Include all relevant sections for comprehensive context
  * Link to related issues and documentation

* **Breaking Down Complex Features:**
  * Create a parent issue using this template
  * Create child issues for each implementation phase
  * Use the template structure to maintain consistency

* **Providing Context for AI Assistance:**
  * Include this template in prompts to Codegen
  * Fill in as many details as possible for better assistance
  * Reference specific sections when asking for help

* **Reviewing Implementation:**
  * Use the template sections as a checklist for review
  * Ensure all aspects of the feature are addressed
  * Verify that acceptance criteria are met

