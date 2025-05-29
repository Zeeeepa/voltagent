export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
}

export class CodegenPromptTemplates {
  private static templates: Map<string, PromptTemplate> = new Map([
    [
      "fix-sql-injection",
      {
        name: "fix-sql-injection",
        description: "Fix SQL injection vulnerabilities",
        template: `Fix the SQL injection vulnerability in the following code:

File: {{file_path}}
Function: {{function_name}}
Issue: {{issue_description}}

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Please provide a secure fix that:
1. Uses parameterized queries or prepared statements
2. Validates and sanitizes input
3. Follows security best practices
4. Maintains the original functionality

Return the fixed code with explanations.`,
        variables: ["file_path", "function_name", "issue_description", "code_snippet", "language"],
      },
    ],
    [
      "fix-xss-vulnerability",
      {
        name: "fix-xss-vulnerability",
        description: "Fix Cross-Site Scripting (XSS) vulnerabilities",
        template: `Fix the XSS vulnerability in the following code:

File: {{file_path}}
Function: {{function_name}}
Issue: {{issue_description}}

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Please provide a secure fix that:
1. Properly escapes or sanitizes user input
2. Uses appropriate encoding for the output context
3. Implements Content Security Policy if applicable
4. Follows OWASP guidelines

Return the fixed code with explanations.`,
        variables: ["file_path", "function_name", "issue_description", "code_snippet", "language"],
      },
    ],
    [
      "optimize-performance",
      {
        name: "optimize-performance",
        description: "Optimize code performance issues",
        template: `Optimize the performance issue in the following code:

File: {{file_path}}
Function: {{function_name}}
Issue: {{issue_description}}
Performance Impact: {{performance_impact}}

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Please provide an optimized version that:
1. Addresses the specific performance bottleneck
2. Maintains code readability and maintainability
3. Includes performance measurements if applicable
4. Explains the optimization strategy

Return the optimized code with explanations.`,
        variables: ["file_path", "function_name", "issue_description", "performance_impact", "code_snippet", "language"],
      },
    ],
    [
      "add-error-handling",
      {
        name: "add-error-handling",
        description: "Add proper error handling to code",
        template: `Add proper error handling to the following code:

File: {{file_path}}
Function: {{function_name}}
Issue: {{issue_description}}

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Please provide improved code that:
1. Handles potential errors gracefully
2. Provides meaningful error messages
3. Follows error handling best practices for {{language}}
4. Maintains the original functionality

Return the improved code with explanations.`,
        variables: ["file_path", "function_name", "issue_description", "code_snippet", "language"],
      },
    ],
    [
      "add-unit-tests",
      {
        name: "add-unit-tests",
        description: "Generate unit tests for code",
        template: `Generate comprehensive unit tests for the following code:

File: {{file_path}}
Function: {{function_name}}
Description: {{function_description}}

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Please provide unit tests that:
1. Cover all major code paths and edge cases
2. Use appropriate testing framework for {{language}}
3. Include both positive and negative test cases
4. Follow testing best practices

Return the test code with explanations.`,
        variables: ["file_path", "function_name", "function_description", "code_snippet", "language"],
      },
    ],
    [
      "refactor-code",
      {
        name: "refactor-code",
        description: "Refactor code for better maintainability",
        template: `Refactor the following code to improve maintainability:

File: {{file_path}}
Function: {{function_name}}
Issues: {{refactoring_issues}}

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Please provide refactored code that:
1. Improves code structure and readability
2. Follows {{language}} best practices and conventions
3. Reduces complexity and duplication
4. Maintains the original functionality

Return the refactored code with explanations.`,
        variables: ["file_path", "function_name", "refactoring_issues", "code_snippet", "language"],
      },
    ],
    [
      "add-documentation",
      {
        name: "add-documentation",
        description: "Add comprehensive documentation to code",
        template: `Add comprehensive documentation to the following code:

File: {{file_path}}
Function: {{function_name}}
Purpose: {{function_purpose}}

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Please provide documented code that:
1. Includes clear function/method documentation
2. Documents parameters, return values, and exceptions
3. Follows documentation standards for {{language}}
4. Includes inline comments for complex logic

Return the documented code.`,
        variables: ["file_path", "function_name", "function_purpose", "code_snippet", "language"],
      },
    ],
  ]);

  /**
   * Get a prompt template by name
   */
  static getTemplate(name: string): PromptTemplate | null {
    return this.templates.get(name) || null;
  }

  /**
   * Get all available templates
   */
  static getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Register a new template
   */
  static registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Render a template with variables
   */
  static renderTemplate(templateName: string, variables: Record<string, string>): string | null {
    const template = this.getTemplate(templateName);
    if (!template) {
      return null;
    }

    let rendered = template.template;
    
    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, "g"), value);
    }

    return rendered;
  }

  /**
   * Validate template variables
   */
  static validateVariables(templateName: string, variables: Record<string, string>): {
    valid: boolean;
    missing: string[];
    extra: string[];
  } {
    const template = this.getTemplate(templateName);
    if (!template) {
      return { valid: false, missing: [], extra: [] };
    }

    const requiredVars = new Set(template.variables);
    const providedVars = new Set(Object.keys(variables));

    const missing = Array.from(requiredVars).filter(v => !providedVars.has(v));
    const extra = Array.from(providedVars).filter(v => !requiredVars.has(v));

    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  }

  /**
   * Get template suggestions based on issue type
   */
  static getTemplateSuggestions(issueType: string): PromptTemplate[] {
    const suggestions: PromptTemplate[] = [];
    
    const issueTypeLower = issueType.toLowerCase();
    
    for (const template of this.getAllTemplates()) {
      if (
        template.name.includes(issueTypeLower) ||
        template.description.toLowerCase().includes(issueTypeLower)
      ) {
        suggestions.push(template);
      }
    }

    return suggestions;
  }
}

