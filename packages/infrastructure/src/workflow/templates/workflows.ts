import { WorkflowDefinition } from "../types";

export class WorkflowTemplates {
  private static workflows: Map<string, WorkflowDefinition> = new Map([
    [
      "comprehensive_pr_analysis",
      {
        name: "comprehensive_pr_analysis",
        description: "Comprehensive PR analysis with 15+ atomic analysis modules",
        version: "1.0.0",
        steps: [
          // Static Code Analysis (5 modules)
          {
            id: "syntax_analysis",
            name: "Syntax Analysis",
            description: "Check for syntax errors and basic code structure",
            type: "analysis",
            timeout: 120000,
          },
          {
            id: "code_quality_analysis",
            name: "Code Quality Analysis",
            description: "Analyze code quality metrics and best practices",
            type: "analysis",
            timeout: 180000,
          },
          {
            id: "complexity_analysis",
            name: "Complexity Analysis",
            description: "Measure cyclomatic complexity and code maintainability",
            type: "analysis",
            timeout: 150000,
          },
          {
            id: "dependency_analysis",
            name: "Dependency Analysis",
            description: "Analyze dependencies and potential conflicts",
            type: "analysis",
            timeout: 200000,
          },
          {
            id: "style_analysis",
            name: "Style Analysis",
            description: "Check code style and formatting consistency",
            type: "analysis",
            timeout: 120000,
          },

          // Dynamic Flow Analysis (4 modules)
          {
            id: "control_flow_analysis",
            name: "Control Flow Analysis",
            description: "Analyze control flow and execution paths",
            type: "analysis",
            dependencies: ["syntax_analysis"],
            timeout: 240000,
          },
          {
            id: "data_flow_analysis",
            name: "Data Flow Analysis",
            description: "Track data flow and variable usage",
            type: "analysis",
            dependencies: ["syntax_analysis"],
            timeout: 300000,
          },
          {
            id: "call_graph_analysis",
            name: "Call Graph Analysis",
            description: "Build and analyze function call graphs",
            type: "analysis",
            dependencies: ["syntax_analysis"],
            timeout: 180000,
          },
          {
            id: "dead_code_analysis",
            name: "Dead Code Analysis",
            description: "Identify unreachable and unused code",
            type: "analysis",
            dependencies: ["control_flow_analysis", "data_flow_analysis"],
            timeout: 150000,
          },

          // Security & Compliance (3 modules)
          {
            id: "security_vulnerability_scan",
            name: "Security Vulnerability Scan",
            description: "Scan for security vulnerabilities and threats",
            type: "analysis",
            timeout: 300000,
          },
          {
            id: "compliance_check",
            name: "Compliance Check",
            description: "Check compliance with security standards",
            type: "analysis",
            dependencies: ["security_vulnerability_scan"],
            timeout: 180000,
          },
          {
            id: "license_analysis",
            name: "License Analysis",
            description: "Analyze license compatibility and compliance",
            type: "analysis",
            timeout: 120000,
          },

          // Performance & Optimization (3 modules)
          {
            id: "performance_analysis",
            name: "Performance Analysis",
            description: "Analyze performance bottlenecks and optimization opportunities",
            type: "analysis",
            dependencies: ["complexity_analysis"],
            timeout: 240000,
          },
          {
            id: "memory_analysis",
            name: "Memory Analysis",
            description: "Analyze memory usage patterns and potential leaks",
            type: "analysis",
            dependencies: ["data_flow_analysis"],
            timeout: 200000,
          },
          {
            id: "scalability_analysis",
            name: "Scalability Analysis",
            description: "Assess code scalability and resource usage",
            type: "analysis",
            dependencies: ["performance_analysis"],
            timeout: 180000,
          },

          // Documentation & Standards (2 modules)
          {
            id: "documentation_analysis",
            name: "Documentation Analysis",
            description: "Check documentation coverage and quality",
            type: "analysis",
            timeout: 150000,
          },
          {
            id: "api_standards_check",
            name: "API Standards Check",
            description: "Validate API design and standards compliance",
            type: "analysis",
            dependencies: ["documentation_analysis"],
            timeout: 120000,
          },

          // Codegen Tasks
          {
            id: "generate_security_fixes",
            name: "Generate Security Fixes",
            description: "Generate automated fixes for security issues",
            type: "codegen",
            dependencies: ["security_vulnerability_scan", "compliance_check"],
            timeout: 600000,
          },
          {
            id: "generate_performance_optimizations",
            name: "Generate Performance Optimizations",
            description: "Generate performance optimization suggestions",
            type: "codegen",
            dependencies: ["performance_analysis", "memory_analysis"],
            timeout: 600000,
          },
          {
            id: "generate_code_improvements",
            name: "Generate Code Improvements",
            description: "Generate general code quality improvements",
            type: "codegen",
            dependencies: ["code_quality_analysis", "complexity_analysis"],
            timeout: 600000,
          },
          {
            id: "generate_documentation",
            name: "Generate Documentation",
            description: "Generate missing documentation",
            type: "codegen",
            dependencies: ["documentation_analysis"],
            timeout: 400000,
          },

          // Validation
          {
            id: "validate_fixes",
            name: "Validate Generated Fixes",
            description: "Validate all generated fixes and improvements",
            type: "validation",
            dependencies: [
              "generate_security_fixes",
              "generate_performance_optimizations",
              "generate_code_improvements",
              "generate_documentation",
            ],
            timeout: 300000,
          },

          // Notification
          {
            id: "create_linear_issues",
            name: "Create Linear Issues",
            description: "Create Linear issues for findings and fixes",
            type: "notification",
            dependencies: ["validate_fixes"],
            timeout: 180000,
          },
          {
            id: "update_pr_status",
            name: "Update PR Status",
            description: "Update PR with analysis results and recommendations",
            type: "notification",
            dependencies: ["create_linear_issues"],
            timeout: 120000,
          },
        ],
        triggers: [
          { type: "pr_created" },
          { type: "pr_updated" },
        ],
        config: {
          maxConcurrentTasks: 10,
          taskTimeout: 600000, // 10 minutes
          retryAttempts: 3,
          notifications: {
            onSuccess: true,
            onFailure: true,
            channels: ["linear", "github"],
          },
        },
      },
    ],
    [
      "quick_security_scan",
      {
        name: "quick_security_scan",
        description: "Quick security-focused analysis for urgent PRs",
        version: "1.0.0",
        steps: [
          {
            id: "security_scan",
            name: "Security Vulnerability Scan",
            description: "Quick security vulnerability scan",
            type: "analysis",
            timeout: 180000,
          },
          {
            id: "generate_security_fixes",
            name: "Generate Security Fixes",
            description: "Generate fixes for critical security issues",
            type: "codegen",
            dependencies: ["security_scan"],
            timeout: 300000,
          },
          {
            id: "notify_security_team",
            name: "Notify Security Team",
            description: "Notify security team of findings",
            type: "notification",
            dependencies: ["generate_security_fixes"],
            timeout: 60000,
          },
        ],
        triggers: [
          { 
            type: "pr_created",
            conditions: { priority: "high", security_sensitive: true },
          },
        ],
        config: {
          maxConcurrentTasks: 3,
          taskTimeout: 300000,
          retryAttempts: 2,
        },
      },
    ],
    [
      "performance_optimization",
      {
        name: "performance_optimization",
        description: "Performance-focused analysis and optimization",
        version: "1.0.0",
        steps: [
          {
            id: "performance_baseline",
            name: "Performance Baseline",
            description: "Establish performance baseline metrics",
            type: "analysis",
            timeout: 240000,
          },
          {
            id: "bottleneck_analysis",
            name: "Bottleneck Analysis",
            description: "Identify performance bottlenecks",
            type: "analysis",
            dependencies: ["performance_baseline"],
            timeout: 300000,
          },
          {
            id: "generate_optimizations",
            name: "Generate Optimizations",
            description: "Generate performance optimization code",
            type: "codegen",
            dependencies: ["bottleneck_analysis"],
            timeout: 600000,
          },
          {
            id: "benchmark_improvements",
            name: "Benchmark Improvements",
            description: "Benchmark the proposed improvements",
            type: "validation",
            dependencies: ["generate_optimizations"],
            timeout: 300000,
          },
        ],
        triggers: [
          {
            type: "pr_created",
            conditions: { performance_critical: true },
          },
        ],
      },
    ],
  ]);

  /**
   * Get a workflow definition by name
   */
  static getWorkflow(name: string): WorkflowDefinition | null {
    return this.workflows.get(name) || null;
  }

  /**
   * Get all available workflows
   */
  static getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Register a new workflow
   */
  static registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.name, workflow);
  }

  /**
   * Get workflow suggestions based on PR characteristics
   */
  static getWorkflowSuggestions(prCharacteristics: {
    size?: "small" | "medium" | "large";
    type?: "feature" | "bugfix" | "hotfix" | "refactor";
    priority?: "low" | "medium" | "high" | "critical";
    securitySensitive?: boolean;
    performanceCritical?: boolean;
  }): WorkflowDefinition[] {
    const suggestions: WorkflowDefinition[] = [];

    // Default comprehensive analysis for most PRs
    const comprehensive = this.getWorkflow("comprehensive_pr_analysis");
    if (comprehensive) {
      suggestions.push(comprehensive);
    }

    // Security-focused workflow for security-sensitive PRs
    if (prCharacteristics.securitySensitive || prCharacteristics.priority === "critical") {
      const security = this.getWorkflow("quick_security_scan");
      if (security) {
        suggestions.push(security);
      }
    }

    // Performance-focused workflow for performance-critical PRs
    if (prCharacteristics.performanceCritical) {
      const performance = this.getWorkflow("performance_optimization");
      if (performance) {
        suggestions.push(performance);
      }
    }

    return suggestions;
  }

  /**
   * Validate workflow definition
   */
  static validateWorkflow(workflow: WorkflowDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!workflow.name) errors.push("Workflow name is required");
    if (!workflow.version) errors.push("Workflow version is required");
    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push("Workflow must have at least one step");
    }

    // Validate steps
    const stepIds = new Set<string>();
    for (const step of workflow.steps || []) {
      if (!step.id) errors.push("Step ID is required");
      if (!step.name) errors.push("Step name is required");
      if (!step.type) errors.push("Step type is required");

      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);

      // Validate dependencies
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            errors.push(`Step ${step.id} depends on non-existent step: ${dep}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

