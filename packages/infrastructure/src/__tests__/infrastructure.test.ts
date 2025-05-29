import { ConfigValidator } from "../utils/config-validator";
import { CodegenPromptTemplates } from "../workflow/templates/codegen-prompts";
import { WorkflowTemplates } from "../workflow/templates/workflows";

describe("Infrastructure Module", () => {
  describe("ConfigValidator", () => {
    it("should validate valid configuration", () => {
      const config = {
        database: {
          host: "localhost",
          port: 5432,
          database: "test",
          username: "user",
          password: "pass",
        },
        redis: {
          host: "localhost",
          port: 6379,
        },
      };

      const result = ConfigValidator.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing required fields", () => {
      const config = {
        database: {
          host: "localhost",
          // Missing required fields
        },
        redis: {
          host: "localhost",
          port: 6379,
        },
      } as any;

      const result = ConfigValidator.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("CodegenPromptTemplates", () => {
    it("should have predefined templates", () => {
      const templates = CodegenPromptTemplates.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const sqlInjectionTemplate = CodegenPromptTemplates.getTemplate("fix-sql-injection");
      expect(sqlInjectionTemplate).toBeDefined();
      expect(sqlInjectionTemplate?.name).toBe("fix-sql-injection");
    });

    it("should render templates with variables", () => {
      const rendered = CodegenPromptTemplates.renderTemplate("fix-sql-injection", {
        file_path: "src/user.ts",
        function_name: "getUserById",
        issue_description: "SQL injection vulnerability",
        code_snippet: "SELECT * FROM users WHERE id = " + userId,
        language: "typescript",
      });

      expect(rendered).toBeDefined();
      expect(rendered).toContain("src/user.ts");
      expect(rendered).toContain("getUserById");
    });

    it("should validate template variables", () => {
      const validation = CodegenPromptTemplates.validateVariables("fix-sql-injection", {
        file_path: "test.ts",
        // Missing other required variables
      });

      expect(validation.valid).toBe(false);
      expect(validation.missing.length).toBeGreaterThan(0);
    });
  });

  describe("WorkflowTemplates", () => {
    it("should have predefined workflows", () => {
      const workflows = WorkflowTemplates.getAllWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
      
      const comprehensiveWorkflow = WorkflowTemplates.getWorkflow("comprehensive_pr_analysis");
      expect(comprehensiveWorkflow).toBeDefined();
      expect(comprehensiveWorkflow?.steps.length).toBeGreaterThan(10);
    });

    it("should validate workflow definitions", () => {
      const validWorkflow = {
        name: "test_workflow",
        description: "Test workflow",
        version: "1.0.0",
        steps: [
          {
            id: "step1",
            name: "Step 1",
            description: "First step",
            type: "analysis" as const,
          },
        ],
        triggers: [{ type: "pr_created" as const }],
      };

      const result = WorkflowTemplates.validateWorkflow(validWorkflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid workflow definitions", () => {
      const invalidWorkflow = {
        // Missing required fields
        steps: [],
        triggers: [],
      } as any;

      const result = WorkflowTemplates.validateWorkflow(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

