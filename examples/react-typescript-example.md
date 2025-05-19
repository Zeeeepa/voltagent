# CreatePR Example: React and TypeScript

This example demonstrates how to use the CreatePR template for a React and TypeScript frontend feature.

```markdown
# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in React and TypeScript, specializing in code quality, testing, and deployment best practices. You have extensive experience with Git workflows, code reviews, and CI/CD pipelines.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a new data visualization dashboard with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: https://github.com/organization/analytics-dashboard
**Base Branch**: main
**Feature Branch**: feature/data-visualization-dashboard
**Related Issues**: DASH-123, DASH-124

**Existing Implementation**:
```typescript
// src/components/Dashboard/index.tsx
export const Dashboard: React.FC = () => {
  // Current implementation only shows basic metrics
  return (
    <div className="dashboard">
      <h1>Analytics Dashboard</h1>
      <div className="metrics-container">
        {/* Basic metrics display */}
      </div>
    </div>
  );
};

// Need to add interactive charts, filters, and data export
```

**Requirements**:
* Implement interactive data visualization charts (line, bar, pie)
* Add time-range filtering capabilities
* Implement data export functionality (CSV, PNG)
* Ensure responsive design for mobile and desktop
* Implement accessibility features (WCAG 2.1 AA compliance)

## IMPLEMENTATION TASKS

### 1. Code Implementation
* Create/modify the following files:
  * src/components/Dashboard/index.tsx: Enhance dashboard layout
  * src/components/Charts/: Add chart components
  * src/hooks/useChartData.ts: Create data fetching hook
  * src/services/exportService.ts: Implement export functionality
* Ensure implementation follows these principles:
  * Component composition
  * Custom hooks for logic separation
  * Memoization for performance
* Handle edge cases:
  * Loading states and error handling
  * Empty data sets
  * Responsive layout breakpoints
  * Accessibility for keyboard and screen readers

### 2. Test Coverage
* Implement unit tests for all components
* Create integration tests for dashboard interactions
* Implement visual regression tests
* Ensure test coverage meets minimum threshold of 85%
* Include accessibility testing with axe-core

### 3. Documentation
* Update relevant documentation files:
  * docs/dashboard.md: Add component documentation
  * README.md: Update feature list
* Add inline code documentation following TSDoc standards
* Include usage examples for chart components
* Add storybook stories for visual components

### 4. Validation
* Verify all tests pass locally and in CI
* Ensure code meets ESLint and Prettier standards
* Validate performance with React Profiler
* Check for accessibility issues with axe-core
* Verify responsive design across breakpoints

### 5. PR Preparation
* Create a detailed PR description with:
  * Summary of changes
  * Implementation approach
  * Testing methodology
  * Screenshots of dashboard on different devices
* Add appropriate labels: feature, frontend, visualization
* Request reviews from design team and senior developers

## DELIVERABLES
1. Complete implementation of data visualization dashboard
2. Comprehensive test suite with 85% coverage
3. Updated documentation with component API details
4. Storybook stories for all new components
5. Pull Request with detailed description

## ACCEPTANCE CRITERIA
- [ ] All tests pass in CI pipeline
- [ ] Code meets project's TypeScript style guidelines
- [ ] Documentation is complete and accurate
- [ ] Implementation satisfies all requirements
- [ ] PR description is comprehensive and clear
- [ ] No accessibility issues detected
- [ ] Responsive design works on all target devices

## ADDITIONAL NOTES
* Consider future integration with real-time data sources
* Performance optimization for large datasets recommended
* Known limitation: Initial implementation supports limited chart customization

## PARALLEL PROCESSING STRATEGY
- Break down this PR into the following parallel sub-tasks:
  - Chart Components: Implement reusable chart components
  - Dashboard Layout: Implement responsive dashboard container
  - Data Fetching: Implement data hooks and services
  - Export Functionality: Implement data export features
- Integration points between sub-tasks:
  - Chart component interfaces must be finalized before dashboard integration
  - Data hook interfaces needed before chart implementation
  - All components required for end-to-end testing
```

## Key Customizations for React and TypeScript

1. **Frontend-Specific Considerations**
   * Emphasis on component architecture
   * Focus on UI/UX and responsive design
   * Inclusion of accessibility requirements
   * Addition of visual testing approaches

2. **React-Specific Best Practices**
   * Component composition patterns
   * Custom hooks for logic separation
   * Memoization for performance optimization
   * Storybook integration for component documentation

3. **TypeScript Integration**
   * Type definitions for component props
   * Interface definitions for data structures
   * Type safety for API interactions
   * TSDoc standards for documentation

4. **Testing Approach**
   * Component unit testing
   * Integration testing for user interactions
   * Visual regression testing
   * Accessibility testing

This example demonstrates how to adapt the CreatePR template for frontend development with React and TypeScript, focusing on the specific requirements and best practices for this technology stack.

