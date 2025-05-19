# Codegen Integration Guide for CreatePR Template

This guide provides detailed instructions for integrating the CreatePR template with Codegen to maximize efficiency and quality in PR creation.

## Overview

Codegen is an AI-powered tool that can help you generate high-quality code and Pull Requests. By combining Codegen with the CreatePR template, you can create comprehensive, production-ready PRs with minimal effort.

## Basic Integration

### Method 1: Direct Template Usage

The simplest way to use the CreatePR template with Codegen is to include it directly in your prompt:

1. Copy the template from `createpr-prompt-template.md`
2. Fill in the placeholders with your specific project details
3. Send the completed template as a prompt to Codegen

Example:

```
@codegen I need to create a PR for a new feature. Here's my template:

# PR Creation Excellence Framework v2.0

## ROLE
You are a senior software engineer with 10+ years of experience in React and TypeScript, specializing in code quality, testing, and deployment best practices.

## OBJECTIVE
Create a comprehensive, production-ready Pull Request that implements a user profile management system with complete test coverage, documentation, and validation.

## CONTEXT
**Repository**: https://github.com/organization/user-service
**Base Branch**: main
**Feature Branch**: feature/user-profile-management
**Related Issues**: USER-123, USER-124

[... rest of the filled template ...]
```

### Method 2: Template Reference

For a more concise approach, you can reference the template and provide only the specific details:

```
@codegen Please create a PR using the CreatePR Excellence Framework v2.0 with the following details:

Feature: User Profile Management
Tech Stack: React, TypeScript
Repository: https://github.com/organization/user-service
Related Issues: USER-123, USER-124

Requirements:
- Implement user profile editing
- Add profile picture upload
- Implement privacy settings
- Add profile sharing functionality

Key files to modify:
- src/components/Profile/ProfileEditor.tsx
- src/services/userService.ts
- src/hooks/useProfile.ts
```

## Advanced Integration

### Linear Issue Integration

To integrate with Linear workflows:

1. Create a Linear issue with the CreatePR template structure
2. Tag Codegen in the issue
3. Codegen will analyze the issue and create a PR based on the template

Example Linear issue:

```
Title: Implement User Profile Management

Description:
# CreatePR Request

## Feature
User Profile Management

## Tech Stack
React, TypeScript

## Requirements
- Implement user profile editing
- Add profile picture upload
- Implement privacy settings
- Add profile sharing functionality

## Key Files
- src/components/Profile/ProfileEditor.tsx
- src/services/userService.ts
- src/hooks/useProfile.ts

@codegen Please create a PR using the CreatePR Excellence Framework.
```

### Automated PR Creation with GitHub Actions

You can automate PR creation using GitHub Actions and Codegen:

1. Create a GitHub Action workflow file:

```yaml
# .github/workflows/createpr.yml
name: Create PR with Codegen

on:
  issues:
    types: [opened, edited]

jobs:
  create-pr:
    if: contains(github.event.issue.labels.*.name, 'createpr')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      
      - name: Extract CreatePR template
        id: extract
        run: |
          ISSUE_BODY="${{ github.event.issue.body }}"
          echo "::set-output name=template::$ISSUE_BODY"
      
      - name: Call Codegen API
        uses: codegen/github-action@v1
        with:
          template: ${{ steps.extract.outputs.template }}
          issue_number: ${{ github.event.issue.number }}
          repo: ${{ github.repository }}
```

2. Create an issue with the `createpr` label and the template in the body
3. The GitHub Action will extract the template and call Codegen to create a PR

## Best Practices for Codegen Integration

### 1. Provide Rich Context

Codegen performs best with comprehensive context:

```
@codegen Create a PR using the CreatePR template for adding user authentication.

Here's the current implementation:
```typescript
// src/services/auth.ts
export class AuthService {
  // Current implementation only supports basic login
  async login(username: string, password: string): Promise<User | null> {
    // Implementation details...
  }
}
```

We need to add:
1. User registration
2. Password reset
3. Email verification
4. OAuth integration

Similar implementations can be found in:
- src/services/userService.ts
- src/components/Auth/LoginForm.tsx
```

### 2. Specify Exact Requirements

Be specific about what you need:

```
@codegen Create a PR using the CreatePR template with these specific requirements:

1. Performance Requirements:
   - Authentication must complete in <200ms
   - Should handle 100 concurrent requests
   
2. Security Requirements:
   - Must implement rate limiting (max 5 attempts per minute)
   - Must use bcrypt for password hashing
   - Must implement CSRF protection
   
3. Testing Requirements:
   - 90% code coverage
   - Must include load testing
   - Must include security testing
```

### 3. Provide Examples

Include examples of similar implementations:

```
@codegen Create a PR using the CreatePR template for user profile management.

Here's an example of how we implemented a similar feature for admin profiles:

```typescript
// src/components/Admin/ProfileEditor.tsx
export const AdminProfileEditor: React.FC = () => {
  // Implementation details...
}
```

Please follow a similar pattern but adapt it for regular users.
```

### 4. Iterative Refinement

Use an iterative approach with Codegen:

1. Start with a basic request
2. Review the initial PR
3. Provide feedback and request specific improvements
4. Finalize the PR

Example workflow:

```
User: @codegen Create a PR using the CreatePR template for user authentication.

Codegen: [Creates initial PR]

User: @codegen The PR looks good, but we need to add rate limiting to prevent brute force attacks.

Codegen: [Updates PR with rate limiting]

User: @codegen Now add comprehensive tests for the rate limiting functionality.

Codegen: [Adds tests and finalizes PR]
```

## Template Customization for Codegen

To optimize the CreatePR template specifically for Codegen:

### 1. Add Codegen-Specific Instructions

```markdown
## CODEGEN INSTRUCTIONS
- Use TypeScript for all implementations
- Follow the project's existing patterns for error handling
- Implement comprehensive error handling
- Add detailed comments explaining complex logic
- Use the repository's existing testing framework
```

### 2. Specify Code Style Preferences

```markdown
## CODE STYLE
- Use functional components with hooks for React
- Use async/await for asynchronous operations
- Use named exports instead of default exports
- Follow the project's naming conventions
- Use proper TypeScript typing (avoid 'any')
```

### 3. Include Repository-Specific Guidelines

```markdown
## REPOSITORY GUIDELINES
- All components must have Storybook stories
- All API endpoints must have OpenAPI documentation
- Follow the existing folder structure
- Add unit tests for all new functions
- Update the README.md with new features
```

## Example Codegen Prompts

### Example 1: Basic Feature Request

```
@codegen Create a PR using the CreatePR template for adding a user dashboard.

Tech Stack: React, TypeScript, Material UI
Repository: https://github.com/organization/user-portal
Base Branch: main
Feature Branch: feature/user-dashboard

Requirements:
- Display user activity summary
- Show recent transactions
- Add notification center
- Implement customizable widgets

Key files to modify:
- src/pages/Dashboard.tsx (create new)
- src/components/Dashboard/ (create new directory with components)
- src/services/dashboardService.ts (create new)
- src/hooks/useDashboard.ts (create new)
```

### Example 2: Bug Fix Request

```
@codegen Create a PR using the CreatePR template for fixing the authentication timeout issue.

Tech Stack: Node.js, Express, MongoDB
Repository: https://github.com/organization/auth-service
Base Branch: main
Feature Branch: fix/auth-timeout-issue
Related Issues: AUTH-456

Bug Description:
Users are being logged out after 10 minutes despite setting a 24-hour session timeout.

Root Cause Analysis:
Initial investigation suggests the JWT expiration is not respecting the user's session preference.

Key files to modify:
- src/services/authService.js
- src/middleware/authMiddleware.js
- src/config/jwt.js

Testing Requirements:
- Add specific tests for timeout scenarios
- Verify with different timeout settings
```

### Example 3: Performance Improvement Request

```
@codegen Create a PR using the CreatePR template for optimizing the product search performance.

Tech Stack: Python, Django, PostgreSQL
Repository: https://github.com/organization/ecommerce-platform
Base Branch: main
Feature Branch: perf/product-search-optimization
Related Issues: PERF-789

Performance Issue:
Product search is taking >2 seconds for queries with multiple filters.

Optimization Goals:
- Reduce search time to <200ms for complex queries
- Optimize database queries
- Implement caching for common searches
- Add pagination for large result sets

Key files to modify:
- app/services/search_service.py
- app/views/product_views.py
- app/models/product.py

Measurement Requirements:
- Include before/after performance benchmarks
- Add performance tests to CI pipeline
```

## Conclusion

By integrating the CreatePR template with Codegen, you can significantly improve the quality and efficiency of your PR creation process. The template provides a structured framework for comprehensive PRs, while Codegen automates the implementation details, allowing you to focus on the high-level requirements and design decisions.

Remember to:
1. Provide rich context for better results
2. Be specific about requirements
3. Include examples when possible
4. Use an iterative approach for complex features
5. Customize the template for your specific needs

With these practices, you can leverage the full power of Codegen to create high-quality, production-ready Pull Requests that meet your team's standards and requirements.

