# Codebase Restructuring & Consolidation Framework v2.0

## ROLE
You are a senior software architect with 12+ years of experience in Python and Django, specializing in code refactoring, architectural design, and technical debt reduction. You have deep expertise in identifying structural issues and implementing clean, maintainable architectures for web applications.

## OBJECTIVE
Perform a comprehensive restructuring and consolidation of the content management system codebase to improve architecture, reduce duplication, enhance maintainability, and optimize performance while preserving all existing functionality.

## CONTEXT
**Repository**: https://github.com/organization/content-management-system  
**Branch/Commit**: main (commit: 9f8e7d6)  
**Codebase Scope**: All Django apps in the CMS project  
**Technology Stack**: Python 3.9, Django 3.2, Django REST Framework, Celery, PostgreSQL, Redis, React (frontend)  

**Current Architecture**:
```
The application is a content management system that has grown from a simple blog platform to a full-featured CMS supporting multiple content types, user roles, and publishing workflows. The codebase has evolved organically over several years with multiple developers contributing. Current issues include:

* Monolithic Django apps with unclear boundaries
* Models with too many responsibilities and complex relationships
* Views mixing presentation logic, business logic, and data access
* Duplicated code across similar content types
* Inconsistent API design and authentication approaches
* Ad-hoc background task implementation
* Poor test coverage and documentation
* Performance issues with complex queries and N+1 problems
```

**Key Issues**:
- Unclear separation of concerns in Django apps and modules
- Significant code duplication across similar features
- Inconsistent patterns for common operations
- Performance bottlenecks in content retrieval and search
- Technical debt making feature development increasingly difficult

**Constraints**:
- Must maintain backward compatibility with existing APIs
- Content migration must be seamless with no data loss
- Admin users must be able to continue working during transition
- SEO impact must be minimized (URLs, metadata)
- Third-party integrations must continue functioning

## ANALYSIS METHODOLOGY

### 1. Structural Analysis
- Analyze current code organization:
  - Django app boundaries and responsibilities
  - Model relationships and dependencies
  - View and API organization
- Identify architectural patterns and anti-patterns:
  - Fat models with too many responsibilities
  - Views with mixed concerns (presentation, business logic, data access)
  - Ad-hoc service layer implementations
- Evaluate module boundaries and dependencies:
  - Cross-app imports and circular dependencies
  - Shared utilities and helpers
  - Third-party package usage patterns

### 2. Duplication Analysis
- Identify code duplication:
  - Content Type Models: Similar fields and methods across content types
  - View Logic: Repeated patterns for filtering, pagination, and permissions
  - Utility Functions: Common operations reimplemented across apps
- Assess impact of duplication:
  - Maintenance overhead: Bug fixes must be applied in multiple places
  - Inconsistent implementations: Similar features behave differently
  - Knowledge fragmentation: Developers need to learn multiple approaches

### 3. Dependency Analysis
- Map current dependency graph:
  - Model relationships and foreign key dependencies
  - App-to-app imports and dependencies
  - External service dependencies
- Identify circular dependencies and tight coupling:
  - Circular: Content and User apps reference each other directly
  - Tight coupling: Views directly importing models from multiple apps
- Assess external dependencies:
  - Third-party packages: Version inconsistencies and unused dependencies
  - External APIs: Inconsistent integration patterns
  - Infrastructure services: Varied usage patterns for caching, task queuing

### 4. Performance Analysis
- Identify performance bottlenecks:
  - Inefficient database queries and N+1 problems
  - Missing or ineffective caching
  - Synchronous operations blocking request handling
- Assess resource utilization:
  - Database: Query patterns and index usage
  - Memory: Large query result sets and caching strategy
  - CPU: Computationally expensive operations in request path

## RESTRUCTURING STRATEGY

### 1. Target Architecture
- Define target architectural pattern:
  - Domain-driven design with clear bounded contexts
  - Service layer pattern for business logic
  - Repository pattern for data access
- Establish app boundaries:
  - Core: Shared models, utilities, and base classes
  - Content: Content type definitions and operations
  - Users: User management, permissions, and profiles
  - Publishing: Workflow, scheduling, and versioning
  - API: Clean REST API interfaces
- Define interface contracts:
  - Service Interfaces: Clear contracts for business operations
  - Repository Interfaces: Data access abstraction
  - API Contracts: Consistent REST API design

### 2. Consolidation Approach
- Identify consolidation opportunities:
  - Base Content Type: Common fields and behaviors for all content
  - Service Layer: Standardized business logic implementation
  - Permission Framework: Unified approach to authorization
- Define shared abstractions:
  - Content Interface: Common interface for all content types
  - Query Builder: Reusable query construction
  - Event System: Standardized event publishing and handling
- Establish utility libraries:
  - Core Utilities: Common operations and helpers
  - Testing: Test factories and helpers
  - Documentation: Auto-generated API docs

### 3. Migration Path
- Define incremental migration steps:
  - Create core abstractions without changing existing functionality
  - Refactor one app at a time starting with least dependencies
  - Implement new patterns alongside existing code
  - Gradually migrate to new architecture with feature flags
- Establish compatibility layers:
  - API Versioning: Support both old and new API formats
  - Model Proxies: Bridge between old and new data models
  - URL Redirects: Maintain SEO during restructuring
- Define validation checkpoints:
  - Functional testing after each app migration
  - Performance benchmarking before/after each phase
  - User acceptance testing with admin users

## IMPLEMENTATION PLAN

### Phase 1: Foundation
1. **Create Core App**
   - **Description**: Establish core abstractions and utilities
   - **Files to Modify**:
     - Create `core/models.py` with base model classes
     - Create `core/services.py` with service layer pattern
     - Create `core/utils.py` for shared utilities
   - **Validation**: Core functionality tested with unit tests

2. **Implement Service Layer Pattern**
   - **Description**: Create service layer for business logic
   - **Files to Modify**:
     - Create `core/services/base.py` with service base classes
     - Create `content/services.py` for content-related operations
     - Create `users/services.py` for user-related operations
   - **Validation**: Service layer pattern implemented with tests

3. **Establish Repository Pattern**
   - **Description**: Create data access abstraction
   - **Files to Modify**:
     - Create `core/repositories/base.py` with repository base classes
     - Create `content/repositories.py` for content data access
     - Create `users/repositories.py` for user data access
   - **Validation**: Repository pattern implemented with tests

### Phase 2: Core Restructuring
1. **Refactor Content Models**
   - **Description**: Restructure content models with proper inheritance
   - **Files to Modify**:
     - Create `content/models/base.py` with BaseContent model
     - Refactor `content/models/article.py` to inherit from BaseContent
     - Refactor `content/models/page.py` to inherit from BaseContent
   - **Validation**: Content models migrated with data integrity preserved

2. **Implement Query Optimization**
   - **Description**: Optimize database queries for content retrieval
   - **Files to Modify**:
     - Update `content/repositories.py` with optimized queries
     - Create `core/query.py` for reusable query building
     - Update `content/views.py` to use repository pattern
   - **Validation**: Query performance improved with same functional behavior

### Phase 3: Feature Consolidation
1. **Implement Unified Publishing Workflow**
   - **Description**: Consolidate publishing logic across content types
   - **Files to Modify**:
     - Create `publishing/services.py` for workflow operations
     - Create `publishing/models.py` for workflow state tracking
     - Update content models to use publishing workflow
   - **Validation**: Publishing workflow works consistently across content types

2. **Refactor Permission System**
   - **Description**: Implement consistent permission model
   - **Files to Modify**:
     - Create `core/permissions.py` with permission framework
     - Update `users/models.py` to use new permission system
     - Update views to use permission framework
   - **Validation**: Permissions work correctly with all user roles

### Phase 4: API and Performance
1. **Standardize REST API**
   - **Description**: Create consistent REST API with versioning
   - **Files to Modify**:
     - Create `api/v1/` directory for versioned API endpoints
     - Create `api/serializers/` for consistent serialization
     - Implement API versioning and documentation
   - **Validation**: API endpoints work with consistent patterns

2. **Implement Caching Strategy**
   - **Description**: Add comprehensive caching for performance
   - **Files to Modify**:
     - Create `core/cache.py` for cache management
     - Update repositories to use caching
     - Implement cache invalidation with signals
   - **Validation**: Performance metrics show improved response times

## VALIDATION STRATEGY
- **Functional Validation**:
  - Comprehensive test suite for all features
  - Integration tests for critical workflows
  - User acceptance testing with admin users
- **Performance Validation**:
  - Load testing for high-traffic scenarios
  - Database query analysis and optimization
  - Page load time benchmarking
- **Structural Validation**:
  - Code quality metrics (complexity, cohesion)
  - Architecture compliance verification
  - Documentation coverage assessment

## RISK MANAGEMENT
- **Identified Risks**:
  - Data migration errors affecting content
  - Performance regression during transition
  - SEO impact from URL or structure changes
  - Admin user workflow disruption
- **Mitigation Strategies**:
  - Comprehensive data migration testing
  - Performance monitoring throughout transition
  - URL redirection strategy for changed paths
  - Phased rollout with admin user training
- **Rollback Plan**:
  - Database backup before each migration
  - Feature flags to disable new code paths
  - Deployment pipeline with quick rollback capability
  - Monitoring alerts for error rate increases

## DELIVERABLES
1. Restructured and consolidated Django application
2. Improved model hierarchy and relationships
3. Consistent service and repository layers
4. Optimized database queries and caching
5. Comprehensive test suite and documentation
6. Performance comparison showing improvements

## ADDITIONAL CONSIDERATIONS
- Accessibility compliance must be maintained
- SEO impact must be carefully managed
- Consider implementing GraphQL alongside REST
- Documentation should be updated throughout the process

