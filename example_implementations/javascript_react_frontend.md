# Codebase Restructuring & Consolidation Framework v2.0

## ROLE
You are a senior software architect with 12+ years of experience in JavaScript/TypeScript and React, specializing in code refactoring, architectural design, and technical debt reduction. You have deep expertise in identifying structural issues and implementing clean, maintainable architectures for frontend applications.

## OBJECTIVE
Perform a comprehensive restructuring and consolidation of the e-commerce frontend codebase to improve architecture, reduce duplication, enhance maintainability, and optimize performance while preserving all existing functionality.

## CONTEXT
**Repository**: https://github.com/organization/e-commerce-frontend  
**Branch/Commit**: main (commit: a7b3c9d)  
**Codebase Scope**: src/ directory (excluding tests)  
**Technology Stack**: React 17, TypeScript 4.5, Redux, Styled Components, React Query  

**Current Architecture**:
```
The application currently follows a feature-based organization but has evolved organically over time. Components, state management, and utilities are scattered across multiple directories with inconsistent patterns. Key issues include:

* No clear separation between UI components, business logic, and data fetching
* Redux is used inconsistently alongside React Context and local state
* Styling approaches vary between Styled Components, CSS modules, and inline styles
* Utility functions are duplicated across multiple feature directories
* API calls are embedded directly in components with inconsistent error handling
```

**Key Issues**:
- Significant code duplication across feature modules
- Inconsistent state management approaches
- Poor separation of concerns
- Performance issues due to unnecessary re-renders
- Difficult to maintain and extend

**Constraints**:
- Must maintain backward compatibility with existing APIs
- Cannot change the overall user experience
- Must support IE11 and all modern browsers
- Refactoring must be done incrementally to allow parallel feature development

## ANALYSIS METHODOLOGY

### 1. Structural Analysis
- Analyze current code organization:
  - Component hierarchy and composition patterns
  - State management approaches and data flow
  - Styling methodologies and theme consistency
- Identify architectural patterns and anti-patterns:
  - Component composition: Inconsistent use of composition vs. inheritance
  - State management: Mix of Redux, Context, and local state without clear boundaries
  - Styling: Multiple approaches causing theme inconsistencies
- Evaluate module boundaries and dependencies:
  - Feature modules: Tightly coupled with cross-imports
  - Utility functions: Duplicated across modules
  - Third-party dependencies: Inconsistent usage patterns

### 2. Duplication Analysis
- Identify code duplication:
  - UI Components: Similar form elements, cards, and list views implemented multiple times
  - Utility Functions: Date formatting, string manipulation, and validation logic duplicated
  - API Handling: Similar fetch patterns and error handling duplicated across features
- Assess impact of duplication:
  - Maintenance overhead: Bug fixes must be applied in multiple places
  - Inconsistent implementations: Similar features behave differently
  - Bug propagation: Issues fixed in one area persist in duplicated code

### 3. Dependency Analysis
- Map current dependency graph:
  - Circular dependencies between feature modules
  - Inconsistent import patterns (absolute vs. relative)
  - Excessive dependencies on third-party libraries
- Identify circular dependencies and tight coupling:
  - Circular: Product and Cart modules reference each other directly
  - Tight coupling: UI components directly import Redux actions and selectors
- Assess external dependencies:
  - Redux: Used inconsistently and with verbose boilerplate
  - Styling libraries: Multiple approaches causing bundle bloat
  - Utility libraries: Redundant libraries with overlapping functionality

### 4. Performance Analysis
- Identify performance bottlenecks:
  - Excessive re-renders due to poor component boundaries
  - Inefficient state management causing unnecessary updates
  - Large bundle size due to improper code splitting
- Assess resource utilization:
  - Memory: Redundant state and caching
  - Network: Inefficient API call patterns
  - CPU: Expensive calculations in render paths

## RESTRUCTURING STRATEGY

### 1. Target Architecture
- Define target architectural pattern:
  - Atomic Design methodology for UI components
  - Domain-driven design for feature organization
  - Clean Architecture principles for separation of concerns
- Establish module boundaries:
  - UI Components: Reusable, presentational components
  - Features: Business logic and feature-specific components
  - Core: Shared utilities, types, and services
  - State: Centralized state management
- Define interface contracts:
  - Component Props: Strict typing and consistent patterns
  - API Services: Uniform request/response handling
  - State Management: Clear actions and selectors pattern

### 2. Consolidation Approach
- Identify consolidation opportunities:
  - UI Component Library: Consolidate duplicate UI elements
  - Utility Functions: Create shared utility modules
  - API Layer: Implement unified API client
- Define shared abstractions:
  - Form Handling: Consistent form component and validation
  - Data Fetching: Unified async data management
  - Error Handling: Standardized error boundaries and messaging
- Establish utility libraries:
  - Core Utilities: Date, string, number formatting
  - Validation: Input validation and business rules
  - Testing: Test utilities and mock data

### 3. Migration Path
- Define incremental migration steps:
  - Create shared component library without changing existing code
  - Implement new state management pattern alongside existing Redux
  - Gradually migrate features to new architecture
  - Remove deprecated code after migration
- Establish compatibility layers:
  - HOCs to adapt new components to old patterns
  - State adapters to bridge old and new state management
  - Utility wrappers for backward compatibility
- Define validation checkpoints:
  - Visual regression testing after each migration step
  - Performance benchmarking before/after each phase
  - Bundle size monitoring throughout migration

## IMPLEMENTATION PLAN

### Phase 1: Foundation
1. **Create Component Library Structure**
   - **Description**: Establish atomic design structure for UI components
   - **Files to Modify**:
     - Create `src/components/atoms/` directory for basic UI elements
     - Create `src/components/molecules/` for composite components
     - Create `src/components/organisms/` for complex components
     - Create `src/components/templates/` for page layouts
   - **Validation**: Directory structure established with documentation

2. **Implement Core Utilities**
   - **Description**: Create centralized utility modules
   - **Files to Modify**:
     - Create `src/utils/formatting.ts` for string/date/number formatting
     - Create `src/utils/validation.ts` for input validation
     - Create `src/utils/helpers.ts` for common helper functions
   - **Validation**: Utility functions implemented with tests

3. **Establish API Layer**
   - **Description**: Create unified API client with standardized error handling
   - **Files to Modify**:
     - Create `src/api/client.ts` for base API functionality
     - Create `src/api/endpoints/` directory for endpoint definitions
     - Create `src/api/hooks.ts` for React Query hooks
   - **Validation**: API client implemented with tests

### Phase 2: Core Restructuring
1. **Implement Atomic Components**
   - **Description**: Create base UI components following atomic design
   - **Files to Modify**:
     - Create `src/components/atoms/Button/` with variants
     - Create `src/components/atoms/Input/` with variants
     - Create `src/components/atoms/Typography/` with variants
     - Create `src/components/molecules/FormField/` combining inputs and labels
   - **Validation**: Components implemented with Storybook documentation

2. **Establish State Management Pattern**
   - **Description**: Implement consistent state management approach
   - **Files to Modify**:
     - Create `src/state/` directory for centralized state
     - Create `src/state/hooks.ts` for custom state hooks
     - Create `src/state/[domain]/` directories for domain-specific state
   - **Validation**: State management pattern implemented with tests

### Phase 3: Feature Migration
1. **Migrate Product Feature**
   - **Description**: Refactor product listing and detail views
   - **Files to Modify**:
     - Create `src/features/products/` with new architecture
     - Update `src/pages/products/` to use new components
     - Deprecate old product components
   - **Validation**: Product features working with new architecture

2. **Migrate Cart Feature**
   - **Description**: Refactor shopping cart functionality
   - **Files to Modify**:
     - Create `src/features/cart/` with new architecture
     - Update `src/pages/cart/` to use new components
     - Deprecate old cart components
   - **Validation**: Cart features working with new architecture

### Phase 4: Optimization
1. **Implement Code Splitting**
   - **Description**: Add proper code splitting for performance
   - **Files to Modify**:
     - Update `src/App.tsx` to use React.lazy
     - Create route-based code splitting
     - Implement dynamic imports for large components
   - **Validation**: Bundle analysis shows reduced main bundle size

2. **Performance Optimizations**
   - **Description**: Optimize rendering performance
   - **Files to Modify**:
     - Add memoization to expensive components
     - Implement virtualization for long lists
     - Optimize state selectors to prevent unnecessary renders
   - **Validation**: Performance metrics show improved render times

## VALIDATION STRATEGY
- **Functional Validation**:
  - End-to-end tests for critical user flows
  - Unit tests for all new components and utilities
  - Visual regression tests for UI components
- **Performance Validation**:
  - Lighthouse performance scores before and after
  - React DevTools profiling for render performance
  - Bundle size analysis for each phase
- **Structural Validation**:
  - Code duplication metrics
  - Cyclomatic complexity analysis
  - Dependency graph visualization

## RISK MANAGEMENT
- **Identified Risks**:
  - Regression in untested edge cases
  - Performance degradation during transition
  - Developer resistance to new patterns
  - Timeline impact on parallel feature development
- **Mitigation Strategies**:
  - Comprehensive test coverage before each migration
  - Performance benchmarking at each step
  - Documentation and knowledge sharing sessions
  - Incremental approach to minimize disruption
- **Rollback Plan**:
  - Feature flags to toggle between old and new implementations
  - Git branch strategy for isolated refactoring
  - Detailed documentation of each migration step

## DELIVERABLES
1. Restructured and consolidated codebase following atomic design
2. Component library with Storybook documentation
3. Migration guide for developers
4. Performance comparison showing improvements
5. Technical debt reduction metrics

## ADDITIONAL CONSIDERATIONS
- Accessibility must be maintained or improved throughout
- Internationalization support must be preserved
- Mobile responsiveness must be tested at each step
- Consider implementing a design system for future consistency

