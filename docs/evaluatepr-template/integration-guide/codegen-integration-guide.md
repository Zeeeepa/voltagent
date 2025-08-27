# EvaluatePR Codegen Integration Guide

This guide provides instructions for integrating the EvaluatePR prompt template with Codegen to automate PR reviews and provide high-quality feedback.

## Overview

Integrating the EvaluatePR template with Codegen enables:

1. Automated, comprehensive PR evaluations
2. Consistent review quality across all PRs
3. Parallel processing of different evaluation aspects
4. Structured, actionable feedback for developers
5. Time savings for human reviewers who can focus on higher-level concerns

## Integration Methods

There are several ways to integrate the EvaluatePR template with Codegen:

### Method 1: Direct PR Comment Trigger

Use Codegen to automatically review PRs when they are created or updated:

1. Configure Codegen to watch for new or updated PRs
2. When a PR is detected, trigger Codegen with the EvaluatePR template
3. Codegen will analyze the PR and post review comments

#### Implementation Steps:

1. Set up a GitHub webhook to notify Codegen when PRs are created or updated
2. Configure Codegen to use the EvaluatePR template when triggered by the webhook
3. Customize the template parameters based on the repository and PR context
4. Configure Codegen to post review comments directly on the PR

#### Example Configuration:

```yaml
triggers:
  - type: github_pr
    events:
      - opened
      - synchronize
    repositories:
      - owner/repo-name
    actions:
      - type: evaluate_pr
        template: evaluatepr-template
        parameters:
          technology_stack: "React, Node.js"
          review_standards: "Company JavaScript Style Guide, OWASP Top 10"
```

### Method 2: Linear Issue-Based Workflow

Use Linear issues to manage PR reviews with Codegen:

1. Create a Linear issue template for PR reviews
2. When a PR needs review, create an issue using the template
3. Assign the issue to Codegen
4. Codegen will analyze the PR and update the issue with its findings
5. Optionally, Codegen can also post comments directly on the PR

#### Implementation Steps:

1. Create a Linear issue template with fields for PR URL, technology stack, and review focus
2. Configure Codegen to recognize and process these issues
3. Set up Codegen to fetch PR details from the provided URL
4. Configure Codegen to update the Linear issue with review findings
5. Optionally, configure Codegen to post comments on the GitHub PR

#### Example Linear Issue Template:

```
# PR Review Request

## PR Details
**Repository**: [REPO_URL]
**PR Number**: [PR_NUMBER]
**Technology Stack**: [TECH_STACK]
**Review Focus**: [REVIEW_FOCUS]

## Review Request
@codegen Please review this PR using the EvaluatePR template.

## Additional Context
[ADDITIONAL_CONTEXT]
```

### Method 3: Parallel Processing with Sub-Issues

Leverage Linear sub-issues to implement the parallel processing strategy:

1. Create a main Linear issue for the PR review
2. Codegen creates sub-issues for each evaluation category
3. Codegen processes each sub-issue in parallel
4. Results are consolidated into the main issue
5. Final review is posted on the PR

#### Implementation Steps:

1. Configure Codegen to create sub-issues for different evaluation aspects
2. Set up parallel processing of these sub-issues
3. Configure result consolidation into the main issue
4. Set up final review posting to GitHub

#### Example Sub-Issue Structure:

```
Main Issue: PR Review for #123: Add OAuth Authentication
├── Sub-Issue 1: Code Quality Assessment
├── Sub-Issue 2: Functionality Verification
├── Sub-Issue 3: Security Analysis
├── Sub-Issue 4: Performance Evaluation
├── Sub-Issue 5: Test Coverage Analysis
└── Sub-Issue 6: Documentation Review
```

## Template Parameter Configuration

To effectively use the EvaluatePR template with Codegen, you need to configure the following parameters:

### Required Parameters:

- `repo_url`: URL of the GitHub repository
- `pr_number`: Number of the PR to review
- `technology_stack`: Primary technologies used in the project
- `review_standards`: Coding standards and style guides to apply

### Optional Parameters:

- `review_focus`: Specific aspects to focus on (e.g., "security", "performance")
- `severity_threshold`: Minimum severity level to report (e.g., "medium")
- `include_code_examples`: Whether to include code examples in feedback (default: true)
- `max_issues_per_category`: Maximum number of issues to report per category

### Example Parameter Configuration:

```json
{
  "repo_url": "https://github.com/organization/repo-name",
  "pr_number": 123,
  "technology_stack": "React, Node.js, Express, MongoDB",
  "review_standards": "Company JavaScript Style Guide, OWASP Top 10",
  "review_focus": "security,performance",
  "severity_threshold": "medium",
  "include_code_examples": true,
  "max_issues_per_category": 5
}
```

## Customizing Review Output

You can customize how Codegen presents the review results:

### GitHub PR Comments:

- **Inline Comments**: Specific issues with code snippets
- **Summary Comment**: Overall assessment and key findings
- **Review Decision**: Approve, Request Changes, or Comment

### Linear Issue Updates:

- **Issue Description**: Updated with review summary
- **Comments**: Detailed findings for each category
- **Labels**: Added based on review results (e.g., "security-issues", "performance-concerns")
- **Status**: Updated based on review outcome

### Example Output Configuration:

```yaml
output:
  github:
    inline_comments: true
    summary_comment: true
    review_decision: true
  linear:
    update_description: true
    add_comments: true
    add_labels: true
    update_status: true
```

## Advanced Integration Features

### 1. Automated Fix Suggestions

Configure Codegen to not only identify issues but also suggest or implement fixes:

1. Enable the `suggest_fixes` option in your configuration
2. Codegen will analyze issues and generate fix suggestions
3. For simple issues, Codegen can create a new PR with fixes

Example configuration:
```yaml
advanced_features:
  suggest_fixes: true
  auto_fix_simple_issues: true
  create_fix_pr: true
```

### 2. Learning and Improvement

Configure Codegen to learn from review feedback and improve over time:

1. Enable the `learn_from_feedback` option
2. When developers accept or reject review comments, Codegen learns
3. Over time, Codegen will provide more relevant and accurate reviews

Example configuration:
```yaml
learning:
  learn_from_feedback: true
  feedback_sources:
    - comment_reactions
    - fix_commits
    - review_dismissals
  improvement_metrics:
    - false_positive_rate
    - acceptance_rate
```

### 3. Integration with CI/CD Pipeline

Incorporate PR reviews into your CI/CD pipeline:

1. Configure Codegen to run as part of your CI/CD process
2. Set quality gates based on review results
3. Block merges if critical issues are found

Example GitHub Actions workflow:
```yaml
name: PR Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  codegen-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Codegen PR Review
        uses: codegen/pr-review-action@v1
        with:
          template: evaluatepr-template
          technology_stack: "React, Node.js"
          review_standards: "Company JavaScript Style Guide, OWASP Top 10"
          fail_on: "critical,high"
```

## Best Practices for Codegen Integration

1. **Start with manual triggers**: Begin with manually triggered reviews before implementing automation
2. **Customize for your stack**: Tailor the template to your specific technology stack and standards
3. **Set appropriate severity thresholds**: Avoid overwhelming developers with too many minor issues
4. **Balance automation and human review**: Use Codegen to handle routine checks while keeping humans for strategic decisions
5. **Collect feedback**: Regularly ask developers about the usefulness of automated reviews
6. **Iterate on the template**: Continuously improve the template based on feedback and changing project needs
7. **Document customizations**: Maintain documentation of your specific template configuration
8. **Monitor false positives**: Track and reduce false positive rates to maintain developer trust

## Troubleshooting

### Common Issues and Solutions:

1. **Issue**: Codegen is not detecting new PRs
   **Solution**: Verify webhook configuration and permissions

2. **Issue**: Reviews are too generic
   **Solution**: Customize the template with more specific technology stack details

3. **Issue**: Too many false positives
   **Solution**: Adjust severity thresholds and customize issue detection rules

4. **Issue**: Review comments are too verbose
   **Solution**: Configure output settings to be more concise

5. **Issue**: Missing context in reviews
   **Solution**: Ensure Codegen has access to the full repository history

## Example: Complete Integration Workflow

Here's an example of a complete workflow integrating the EvaluatePR template with Codegen:

1. Developer creates a PR in GitHub
2. GitHub webhook triggers Codegen
3. Codegen creates a main Linear issue for the PR review
4. Codegen creates sub-issues for each evaluation category
5. Codegen processes each sub-issue in parallel:
   - Analyzes code quality
   - Verifies functionality
   - Checks for security issues
   - Evaluates performance
   - Assesses test coverage
   - Reviews documentation
6. Codegen consolidates findings into the main issue
7. Codegen posts inline comments on the PR for specific issues
8. Codegen adds a summary comment with overall assessment
9. Codegen submits a review decision (Approve, Request Changes, or Comment)
10. Developer addresses the feedback
11. When the PR is updated, the process repeats

## Conclusion

Integrating the EvaluatePR template with Codegen provides a powerful, automated PR review system that ensures consistent, high-quality feedback. By following this guide, you can implement a customized review process that fits your team's specific needs and technology stack.

For additional support or questions about Codegen integration, please contact the Codegen support team or refer to the official documentation.

