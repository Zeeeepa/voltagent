# LinearParallel Integration with Codegen

This document provides instructions for integrating the LinearParallel Prompt Engineering Template with Codegen to automate the creation and management of parallel Linear issue structures.

## Overview

Codegen can be used to:
1. Generate comprehensive Linear issue structures based on the LinearParallel template
2. Create main issues and sub-issues with proper relationships
3. Assign issues to appropriate team members
4. Update issues with progress and status changes
5. Manage dependencies between issues

## Integration Methods

### Method 1: Direct Prompt Usage

The simplest integration method is to use the LinearParallel template directly as a prompt for Codegen:

1. **Prepare Your Project Information**
   * Fill in the template placeholders with your specific project details
   * Include all relevant context, requirements, and constraints

2. **Submit to Codegen**
   * Tag Codegen in a Linear comment with your completed template
   * Example: "@codegen Please create the following issue structure: [paste template]"
   * Codegen will parse the template and create the corresponding issues

3. **Review and Refine**
   * Review the generated issue structure
   * Make any necessary adjustments to issues, dependencies, or assignments
   * Tag Codegen again for any specific modifications

### Method 2: Automated Issue Creation via API

For more advanced integration, you can use Codegen's API capabilities:

1. **Set Up API Access**
   * Ensure you have the necessary API access for both Codegen and Linear
   * Configure authentication for both services

2. **Create a Structured Request**
   * Format your project information according to the LinearParallel template
   * Convert the template into a structured JSON format for API consumption

3. **Submit API Request**
   * Use the Codegen API to submit your structured request
   * Example API call:

```javascript
// Example API call (pseudo-code)
const response = await fetch('https://api.codegen.sh/linear/create-structure', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    template: 'linearparallel',
    project: {
      name: 'Your Project Name',
      description: 'Project description...',
      // Other project details following the template structure
      workStreams: [
        {
          name: 'Work Stream 1',
          purpose: 'Purpose description...',
          subIssues: [
            // Sub-issue details
          ]
        }
        // Additional work streams
      ]
    }
  })
});

const result = await response.json();
// result contains the created Linear issue IDs and structure
```

4. **Handle the Response**
   * Process the API response to get the created issue IDs
   * Store these IDs for future reference and updates

### Method 3: Integration with Linear Webhooks

For ongoing management of your parallel issue structure:

1. **Configure Linear Webhooks**
   * Set up webhooks in Linear to notify Codegen of issue changes
   * Configure the webhook to trigger on relevant events (status changes, comments, etc.)

2. **Create a Codegen Handler**
   * Implement a handler for Linear webhook events
   * Use the handler to trigger appropriate Codegen actions

3. **Implement Automated Updates**
   * When dependencies are completed, automatically update dependent issues
   * Move issues through workflow states based on dependency completion
   * Generate progress reports and status updates

## Using Codegen Commands for Issue Management

Once your issue structure is created, you can use Codegen commands to manage it:

### Issue Creation and Updates

```
@codegen create sub-issue "Sub-issue Title" for ZAM-123 with description "Detailed description..."

@codegen update ZAM-124 status to "In Progress"

@codegen assign ZAM-125 to @username
```

### Dependency Management

```
@codegen add dependency ZAM-126 blocks ZAM-127

@codegen list dependencies for ZAM-128

@codegen check critical path for ZAM-123
```

### Progress Tracking

```
@codegen generate progress report for ZAM-123

@codegen estimate completion for ZAM-123

@codegen identify bottlenecks in ZAM-123
```

## Example Workflow

Here's an example workflow for using Codegen with the LinearParallel template:

1. **Initial Setup**
   ```
   @codegen create project structure from template:
   
   # Linear Parallel Execution Framework v2.0
   
   ## ROLE
   You are a senior technical project manager with 8+ years of experience in web development...
   
   [Rest of the completed template]
   ```

2. **Codegen Creates the Structure**
   * Codegen parses the template and creates the main issue
   * Codegen creates all sub-issues with proper relationships
   * Codegen assigns issues to specified team members

3. **Team Works on Issues in Parallel**
   * Team members pick up their assigned issues
   * Work proceeds in parallel across work streams
   * Dependencies are respected based on the structure

4. **Tracking and Updates**
   ```
   @codegen status update ZAM-123
   
   @codegen identify blocked issues
   
   @codegen generate weekly progress report
   ```

5. **Completion and Review**
   ```
   @codegen verify all acceptance criteria for ZAM-123
   
   @codegen generate project completion report
   ```

## Best Practices for Codegen Integration

1. **Be Specific with Requirements**
   * Provide detailed information in your template
   * Include specific acceptance criteria for each issue
   * Clearly define dependencies between issues

2. **Use Consistent Formatting**
   * Follow the template structure consistently
   * Use standard terminology for status and priority
   * Maintain consistent naming conventions for issues

3. **Leverage Codegen's Intelligence**
   * Ask Codegen for suggestions on task breakdown
   * Use Codegen to identify potential bottlenecks
   * Let Codegen help optimize your parallel structure

4. **Iterate and Refine**
   * Start with a basic structure and refine with Codegen's help
   * Ask Codegen for improvements to your issue structure
   * Use feedback from team members to enhance the template

## Troubleshooting

### Common Issues and Solutions

1. **Issue Creation Failures**
   * Ensure you have proper permissions in Linear
   * Check that your template follows the expected format
   * Verify that all required fields are provided

2. **Dependency Management Problems**
   * Use explicit issue IDs when defining dependencies
   * Avoid circular dependencies in your structure
   * Ensure dependent issues are in the correct state

3. **Integration Errors**
   * Verify API keys and authentication
   * Check webhook configurations and endpoints
   * Ensure proper error handling in your integration code

### Getting Help

If you encounter issues with the Codegen integration:

1. Tag Codegen with a specific question:
   ```
   @codegen Why didn't the sub-issues get created properly?
   ```

2. Check the Codegen documentation for updated integration instructions

3. Contact Codegen support for assistance with complex integration scenarios

## Conclusion

Integrating the LinearParallel template with Codegen provides a powerful way to create and manage parallel work structures in Linear. By leveraging Codegen's capabilities, you can automate the creation of complex issue hierarchies, manage dependencies, and track progress across parallel work streams.

This integration enables teams to maximize productivity through effective task decomposition and parallel execution while maintaining clear visibility into project status and dependencies.

