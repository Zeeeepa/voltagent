# Codebase Restructuring & Consolidation Framework v2.0

## ROLE
You are a senior software architect with 12+ years of experience in Java and Spring Framework, specializing in code refactoring, architectural design, and technical debt reduction. You have deep expertise in identifying structural issues and implementing clean, maintainable architectures for enterprise backend applications.

## OBJECTIVE
Perform a comprehensive restructuring and consolidation of the banking microservices codebase to improve architecture, reduce duplication, enhance maintainability, and optimize performance while preserving all existing functionality.

## CONTEXT
**Repository**: https://github.com/organization/banking-services  
**Branch/Commit**: main (commit: 5e7d2f1)  
**Codebase Scope**: All microservices in the banking domain  
**Technology Stack**: Java 11, Spring Boot 2.5, Spring Cloud, JPA/Hibernate, PostgreSQL, Kafka  

**Current Architecture**:
```
The application is structured as a set of microservices that have grown organically over time. The system started with a well-defined architecture but has degraded as new features were added under tight deadlines. Current issues include:

* Inconsistent service boundaries with overlapping responsibilities
* Duplicated business logic across multiple services
* Inconsistent error handling and resilience patterns
* Direct database access between services bypassing APIs
* Monolithic services that should be further decomposed
* Inconsistent messaging patterns and event schemas
* No clear separation between domain logic and infrastructure concerns
```

**Key Issues**:
- Service boundaries are blurred with responsibilities spread across multiple services
- Significant code duplication in utility classes and domain logic
- Inconsistent data access patterns and transaction management
- Performance bottlenecks in critical transaction flows
- Difficult to maintain and extend due to tight coupling

**Constraints**:
- Zero downtime requirement for critical banking operations
- Must maintain backward compatibility with existing APIs
- Strict regulatory compliance requirements
- High security standards must be maintained throughout
- Limited maintenance windows for production deployments

## ANALYSIS METHODOLOGY

### 1. Structural Analysis
- Analyze current service organization:
  - Service boundary definitions and responsibilities
  - API design patterns and consistency
  - Package structure and layering within services
- Identify architectural patterns and anti-patterns:
  - Service communication: Mix of synchronous and asynchronous without clear guidelines
  - Data access: Inconsistent use of repositories, DTOs, and entities
  - Error handling: Varied approaches to exception management and resilience
- Evaluate module boundaries and dependencies:
  - Service dependencies: Complex web of inter-service calls
  - Shared libraries: Overuse creating tight coupling
  - External system integration: Inconsistent patterns

### 2. Duplication Analysis
- Identify code duplication:
  - Domain Models: Similar entities defined across multiple services
  - Utility Classes: Date handling, string manipulation, and validation logic duplicated
  - Integration Code: Similar client implementations for external systems
- Assess impact of duplication:
  - Maintenance overhead: Bug fixes must be applied in multiple places
  - Inconsistent implementations: Similar business rules implemented differently
  - Knowledge silos: Teams specialize in specific services without understanding the whole

### 3. Dependency Analysis
- Map current dependency graph:
  - Service-to-service communication patterns
  - Database schema dependencies and shared tables
  - Message broker topic dependencies
- Identify circular dependencies and tight coupling:
  - Circular: Account and Transaction services reference each other directly
  - Tight coupling: Services directly accessing other services' databases
- Assess external dependencies:
  - Third-party libraries: Version inconsistencies and redundant libraries
  - External APIs: Inconsistent integration patterns
  - Infrastructure services: Varied usage patterns for logging, monitoring, and configuration

### 4. Performance Analysis
- Identify performance bottlenecks:
  - Inefficient database queries and N+1 problems
  - Synchronous service calls in critical paths
  - Resource-intensive operations without proper caching
- Assess resource utilization:
  - Memory: Inefficient object creation and garbage collection patterns
  - CPU: Computationally expensive operations in high-traffic flows
  - Network: Chatty service-to-service communication

## RESTRUCTURING STRATEGY

### 1. Target Architecture
- Define target architectural pattern:
  - Domain-Driven Design with bounded contexts
  - Hexagonal Architecture (Ports and Adapters) within services
  - Event-driven communication for cross-service operations
- Establish service boundaries:
  - Customer Domain: Customer profile and preference management
  - Account Domain: Account creation, management, and balance tracking
  - Transaction Domain: Transaction processing and history
  - Notification Domain: Customer alerts and communications
- Define interface contracts:
  - REST API Standards: Consistent resource naming, versioning, and error formats
  - Event Schemas: Standardized event formats with versioning
  - Internal APIs: Clear contracts between domain layers

### 2. Consolidation Approach
- Identify consolidation opportunities:
  - Common Library: Core domain models and shared utilities
  - Service Template: Standardized service structure and configuration
  - Integration Framework: Unified approach to external system integration
- Define shared abstractions:
  - Domain Events: Standardized event publishing and handling
  - Error Handling: Consistent exception hierarchy and handling
  - Resilience Patterns: Circuit breakers, retries, and fallbacks
- Establish utility libraries:
  - Core Utilities: Date, string, number formatting, and validation
  - Security: Authentication, authorization, and encryption
  - Observability: Logging, metrics, and tracing

### 3. Migration Path
- Define incremental migration steps:
  - Create shared libraries without changing existing services
  - Refactor one service at a time starting with least dependencies
  - Implement new communication patterns alongside existing ones
  - Gradually migrate to new architecture with feature toggles
- Establish compatibility layers:
  - API Facades: Maintain backward compatibility for external consumers
  - Event Translators: Convert between old and new event formats
  - Data Migration Services: Handle schema evolution
- Define validation checkpoints:
  - Functional testing after each service migration
  - Performance benchmarking before/after each phase
  - Security audits throughout the migration

## IMPLEMENTATION PLAN

### Phase 1: Foundation
1. **Create Common Libraries**
   - **Description**: Establish shared domain models and utilities
   - **Files to Modify**:
     - Create `common-lib/domain-models` for shared domain entities
     - Create `common-lib/utils` for shared utility functions
     - Create `common-lib/exceptions` for standardized exception handling
   - **Validation**: Libraries implemented with comprehensive tests

2. **Implement Service Template**
   - **Description**: Create standardized service structure template
   - **Files to Modify**:
     - Create `service-template/` with hexagonal architecture structure
     - Create `service-template/config` for standard configurations
     - Create `service-template/docs` for documentation standards
   - **Validation**: Template validated with sample service implementation

3. **Establish Event Framework**
   - **Description**: Create standardized event publishing and handling
   - **Files to Modify**:
     - Create `event-lib/schemas` for event schema definitions
     - Create `event-lib/publisher` for standardized event publishing
     - Create `event-lib/consumer` for standardized event consumption
   - **Validation**: Event framework tested with sample producers and consumers

### Phase 2: Core Restructuring
1. **Refactor Account Service**
   - **Description**: Restructure account service to new architecture
   - **Files to Modify**:
     - Refactor `account-service/src/main/java/domain` to use hexagonal architecture
     - Update `account-service/src/main/java/api` to use standardized API patterns
     - Migrate `account-service/src/main/java/repository` to use consistent data access
   - **Validation**: Account service functionality preserved with improved structure

2. **Refactor Transaction Service**
   - **Description**: Restructure transaction service to new architecture
   - **Files to Modify**:
     - Refactor `transaction-service/src/main/java/domain` to use hexagonal architecture
     - Update `transaction-service/src/main/java/api` to use standardized API patterns
     - Migrate `transaction-service/src/main/java/repository` to use consistent data access
   - **Validation**: Transaction service functionality preserved with improved structure

### Phase 3: Service Consolidation
1. **Implement Event-Driven Communication**
   - **Description**: Replace direct service calls with event-driven communication
   - **Files to Modify**:
     - Update `account-service/src/main/java/events` to publish domain events
     - Update `transaction-service/src/main/java/events` to consume account events
     - Create `notification-service/src/main/java/events` to consume relevant events
   - **Validation**: Services communicate effectively through events with reduced direct coupling

2. **Extract Notification Service**
   - **Description**: Extract notification functionality into dedicated service
   - **Files to Modify**:
     - Create `notification-service/src/main/java/domain` for notification domain logic
     - Create `notification-service/src/main/java/api` for notification APIs
     - Remove notification code from other services
   - **Validation**: Notification functionality works correctly in dedicated service

### Phase 4: Optimization
1. **Implement Caching Strategy**
   - **Description**: Add proper caching for frequently accessed data
   - **Files to Modify**:
     - Update `account-service/src/main/java/config` to configure caching
     - Update `transaction-service/src/main/java/service` to use cache appropriately
     - Create `cache-lib` for common caching patterns
   - **Validation**: Performance metrics show reduced database load and improved response times

2. **Optimize Database Access**
   - **Description**: Improve database query efficiency
   - **Files to Modify**:
     - Refactor `account-service/src/main/java/repository` to optimize queries
     - Refactor `transaction-service/src/main/java/repository` to optimize queries
     - Update entity mappings to improve performance
   - **Validation**: Query execution times reduced with same functional behavior

## VALIDATION STRATEGY
- **Functional Validation**:
  - Integration tests for critical business flows
  - API contract tests for all service interfaces
  - Event schema validation for all published events
- **Performance Validation**:
  - Load testing for critical transaction paths
  - Database query performance analysis
  - Service response time benchmarking
- **Structural Validation**:
  - Code quality metrics (complexity, coupling)
  - Architecture compliance verification
  - Dependency graph analysis

## RISK MANAGEMENT
- **Identified Risks**:
  - Service disruption during migration
  - Data inconsistency during transition
  - Performance regression in critical flows
  - Increased complexity during transition period
- **Mitigation Strategies**:
  - Feature toggles to enable gradual rollout
  - Comprehensive testing in staging environment
  - Parallel running of old and new implementations
  - Detailed monitoring and alerting during transition
- **Rollback Plan**:
  - Service-specific rollback procedures
  - Database schema rollback scripts
  - Traffic routing fallback configuration
  - Automated rollback triggers based on error rates

## DELIVERABLES
1. Restructured and consolidated microservices
2. Shared libraries for common functionality
3. Service template for future development
4. Migration guide for development teams
5. Performance comparison showing improvements
6. Technical debt reduction metrics

## ADDITIONAL CONSIDERATIONS
- Regulatory compliance must be maintained throughout
- Security reviews required for all architectural changes
- Disaster recovery procedures must be updated
- Documentation must be updated to reflect new architecture

