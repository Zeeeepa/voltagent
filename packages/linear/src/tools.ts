import { createTool } from "@voltagent/core";
import { z } from "zod";
import { LinearIntegration } from "./linear-integration";
import type { LinearConfig } from "./types";

/**
 * Create Linear issue tool
 */
export const createLinearIssueSchema = z.object({
  title: z.string().describe("Issue title"),
  description: z.string().optional().describe("Issue description"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Issue priority"),
  teamId: z.string().optional().describe("Team ID (optional if default is set)"),
  assigneeId: z.string().optional().describe("Assignee user ID"),
  labelIds: z.array(z.string()).optional().describe("Array of label IDs"),
  estimatedHours: z.number().optional().describe("Estimated hours for completion"),
  dependencies: z.array(z.string()).optional().describe("Array of dependency issue IDs"),
});

export const createLinearIssueTool = (integration: LinearIntegration) =>
  createTool({
    name: "create_linear_issue",
    description: "Create a new issue in Linear with VoltAgent extensions",
    parameters: createLinearIssueSchema,
    execute: async (args) => {
      const issue = await integration.createIssue({
        title: args.title,
        description: args.description,
        priority: args.priority,
        teamId: args.teamId,
        assigneeId: args.assigneeId,
        labelIds: args.labelIds,
        estimatedHours: args.estimatedHours,
        dependencies: args.dependencies,
      });

      return {
        success: true,
        issue: {
          id: issue.id,
          title: issue.title,
          url: issue.url,
          identifier: issue.identifier,
        },
      };
    },
  });

/**
 * Update Linear issue tool
 */
export const updateLinearIssueSchema = z.object({
  issueId: z.string().describe("Issue ID to update"),
  title: z.string().optional().describe("New issue title"),
  description: z.string().optional().describe("New issue description"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("New issue priority"),
  assigneeId: z.string().optional().describe("New assignee user ID"),
  stateId: z.string().optional().describe("New workflow state ID"),
  labelIds: z.array(z.string()).optional().describe("New array of label IDs"),
  estimatedHours: z.number().optional().describe("New estimated hours"),
});

export const updateLinearIssueTool = (integration: LinearIntegration) =>
  createTool({
    name: "update_linear_issue",
    description: "Update an existing Linear issue",
    parameters: updateLinearIssueSchema,
    execute: async (args) => {
      const { issueId, ...updateData } = args;
      const issue = await integration.updateIssue(issueId, updateData);

      return {
        success: true,
        issue: {
          id: issue.id,
          title: issue.title,
          url: issue.url,
          identifier: issue.identifier,
        },
      };
    },
  });

/**
 * Get Linear issue tool
 */
export const getLinearIssueSchema = z.object({
  issueId: z.string().describe("Issue ID to retrieve"),
});

export const getLinearIssueTool = (integration: LinearIntegration) =>
  createTool({
    name: "get_linear_issue",
    description: "Get a Linear issue with sub-issues and dependencies",
    parameters: getLinearIssueSchema,
    execute: async (args) => {
      const issue = await integration.getIssue(args.issueId);

      if (!issue) {
        return {
          success: false,
          error: "Issue not found",
        };
      }

      return {
        success: true,
        issue: {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          url: issue.url,
          identifier: issue.identifier,
          state: issue.state?.name,
          assignee: issue.assignee?.name,
          estimatedHours: issue.estimatedHours,
          dependencies: issue.dependencies,
          subIssues: issue.subIssues?.map(sub => ({
            id: sub.id,
            title: sub.title,
            identifier: sub.identifier,
          })),
        },
      };
    },
  });

/**
 * Search Linear issues tool
 */
export const searchLinearIssuesSchema = z.object({
  query: z.string().describe("Search query"),
  teamId: z.string().optional().describe("Team ID to search within"),
  limit: z.number().optional().default(10).describe("Maximum number of results"),
});

export const searchLinearIssuesTool = (integration: LinearIntegration) =>
  createTool({
    name: "search_linear_issues",
    description: "Search for Linear issues by text query",
    parameters: searchLinearIssuesSchema,
    execute: async (args) => {
      const issues = await integration.searchIssues(args.query, args.teamId);
      const limitedIssues = issues.slice(0, args.limit);

      return {
        success: true,
        issues: limitedIssues.map(issue => ({
          id: issue.id,
          title: issue.title,
          description: issue.description?.substring(0, 200),
          url: issue.url,
          identifier: issue.identifier,
          state: issue.state?.name,
          assignee: issue.assignee?.name,
        })),
        total: issues.length,
      };
    },
  });

/**
 * Create issues from requirements tool
 */
export const createIssuesFromRequirementsSchema = z.object({
  requirementsText: z.string().describe("Requirements text to analyze"),
  projectTitle: z.string().describe("Title for the main project issue"),
  teamId: z.string().optional().describe("Team ID for the issues"),
  assigneeId: z.string().optional().describe("Assignee for the main issue"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Priority for the main issue"),
});

export const createIssuesFromRequirementsTool = (integration: LinearIntegration) =>
  createTool({
    name: "create_issues_from_requirements",
    description: "Analyze requirements text and create Linear issues automatically",
    parameters: createIssuesFromRequirementsSchema,
    execute: async (args) => {
      const result = await integration.createIssuesFromRequirements(
        args.requirementsText,
        args.projectTitle,
        {
          teamId: args.teamId,
          assigneeId: args.assigneeId,
          priority: args.priority,
        }
      );

      return {
        success: true,
        analysis: {
          complexity: result.analysis.complexity,
          estimatedHours: result.analysis.estimatedHours,
          priority: result.analysis.priority,
          labels: result.analysis.labels,
          mainRequirements: result.analysis.mainRequirements.length,
          subRequirements: result.analysis.subRequirements.length,
        },
        mainIssue: {
          id: result.mainIssue.id,
          title: result.mainIssue.title,
          url: result.mainIssue.url,
          identifier: result.mainIssue.identifier,
        },
        subIssues: result.subIssues.map(issue => ({
          id: issue.id,
          title: issue.title,
          url: issue.url,
          identifier: issue.identifier,
        })),
      };
    },
  });

/**
 * Get project progress tool
 */
export const getProjectProgressSchema = z.object({
  projectId: z.string().optional().describe("Project ID (optional)"),
  teamId: z.string().optional().describe("Team ID (optional)"),
});

export const getProjectProgressTool = (integration: LinearIntegration) =>
  createTool({
    name: "get_project_progress",
    description: "Get progress data for a project or team",
    parameters: getProjectProgressSchema,
    execute: async (args) => {
      const progress = await integration.getProjectProgress(args.projectId, args.teamId);

      return {
        success: true,
        progress: {
          totalIssues: progress.totalIssues,
          completedIssues: progress.completedIssues,
          inProgressIssues: progress.inProgressIssues,
          blockedIssues: progress.blockedIssues,
          completionPercentage: Math.round(progress.completionPercentage * 100) / 100,
          velocity: progress.velocity,
          estimatedCompletion: progress.estimatedCompletion?.toISOString(),
        },
      };
    },
  });

/**
 * Generate progress report tool
 */
export const generateProgressReportSchema = z.object({
  projectId: z.string().optional().describe("Project ID (optional)"),
  teamId: z.string().optional().describe("Team ID (optional)"),
});

export const generateProgressReportTool = (integration: LinearIntegration) =>
  createTool({
    name: "generate_progress_report",
    description: "Generate a comprehensive progress report with analytics",
    parameters: generateProgressReportSchema,
    execute: async (args) => {
      const report = await integration.generateProgressReport(args.projectId, args.teamId);

      return {
        success: true,
        report: {
          progress: {
            totalIssues: report.progress.totalIssues,
            completedIssues: report.progress.completedIssues,
            completionPercentage: Math.round(report.progress.completionPercentage * 100) / 100,
          },
          velocity: {
            current: report.velocity.current,
            average: Math.round(report.velocity.average * 100) / 100,
            trend: report.velocity.trend,
          },
          recommendations: report.recommendations,
          burndownDataPoints: report.burndown.length,
        },
      };
    },
  });

/**
 * Sync with Linear tool
 */
export const syncWithLinearSchema = z.object({
  direction: z.enum(["both", "to-linear", "from-linear"]).optional().default("both").describe("Sync direction"),
  conflictResolution: z.enum(["linear-wins", "local-wins", "merge", "manual", "skip"]).optional().default("manual").describe("How to handle conflicts"),
});

export const syncWithLinearTool = (integration: LinearIntegration) =>
  createTool({
    name: "sync_with_linear",
    description: "Perform bidirectional synchronization with Linear",
    parameters: syncWithLinearSchema,
    execute: async (args) => {
      const result = await integration.performSync({
        direction: args.direction,
        conflictResolution: args.conflictResolution,
      });

      return {
        success: result.success,
        result: {
          created: result.created,
          updated: result.updated,
          conflicts: result.conflicts,
          errors: result.errors,
          timestamp: result.timestamp.toISOString(),
        },
      };
    },
  });

/**
 * Get Linear teams tool
 */
export const getLinearTeamsSchema = z.object({});

export const getLinearTeamsTool = (integration: LinearIntegration) =>
  createTool({
    name: "get_linear_teams",
    description: "Get all Linear teams accessible to the user",
    parameters: getLinearTeamsSchema,
    execute: async () => {
      const teams = await integration.getTeams();

      return {
        success: true,
        teams: teams.map(team => ({
          id: team.id,
          name: team.name,
          key: team.key,
          description: team.description,
        })),
      };
    },
  });

/**
 * Get workflow states tool
 */
export const getWorkflowStatesSchema = z.object({
  teamId: z.string().optional().describe("Team ID (optional if default is set)"),
});

export const getWorkflowStatesTool = (integration: LinearIntegration) =>
  createTool({
    name: "get_workflow_states",
    description: "Get workflow states for a team",
    parameters: getWorkflowStatesSchema,
    execute: async (args) => {
      const states = await integration.getWorkflowStates(args.teamId);

      return {
        success: true,
        states: states.map(state => ({
          id: state.id,
          name: state.name,
          type: state.type,
          color: state.color,
          position: state.position,
        })),
      };
    },
  });

/**
 * Get sync status tool
 */
export const getSyncStatusSchema = z.object({});

export const getSyncStatusTool = (integration: LinearIntegration) =>
  createTool({
    name: "get_sync_status",
    description: "Get current synchronization status",
    parameters: getSyncStatusSchema,
    execute: async () => {
      const status = integration.getSyncStatus();
      const conflicts = integration.getPendingConflicts();

      return {
        success: true,
        status: {
          isRunning: status.isRunning,
          lastSync: status.lastSync?.toISOString(),
          nextSync: status.nextSync?.toISOString(),
          conflicts: status.conflicts,
          pendingConflicts: conflicts.map(conflict => ({
            issueId: conflict.issueId,
            type: conflict.type,
            timestamp: conflict.timestamp.toISOString(),
          })),
        },
      };
    },
  });

/**
 * Generate team metrics tool
 */
export const generateTeamMetricsSchema = z.object({
  teamId: z.string().optional().describe("Team ID (optional)"),
  periodDays: z.number().optional().default(30).describe("Period in days for metrics calculation"),
});

export const generateTeamMetricsTool = (integration: LinearIntegration) =>
  createTool({
    name: "generate_team_metrics",
    description: "Generate comprehensive team performance metrics",
    parameters: generateTeamMetricsSchema,
    execute: async (args) => {
      const metrics = await integration.generateTeamMetrics(args.teamId, args.periodDays);

      return {
        success: true,
        metrics: {
          velocity: {
            current: metrics.velocity.current,
            average: Math.round(metrics.velocity.average * 100) / 100,
            trend: metrics.velocity.trend,
          },
          throughput: Math.round(metrics.throughput * 100) / 100,
          cycleTime: Math.round(metrics.cycleTime * 100) / 100,
          qualityMetrics: {
            bugRate: Math.round(metrics.qualityMetrics.bugRate * 100) / 100,
            reworkRate: Math.round(metrics.qualityMetrics.reworkRate * 100) / 100,
          },
          memberCount: metrics.memberMetrics.length,
        },
      };
    },
  });

/**
 * Create a toolkit with all Linear tools
 */
export const createLinearToolkit = (config: LinearConfig) => {
  const integration = new LinearIntegration(config);

  return {
    integration,
    tools: [
      createLinearIssueTool(integration),
      updateLinearIssueTool(integration),
      getLinearIssueTool(integration),
      searchLinearIssuesTool(integration),
      createIssuesFromRequirementsTool(integration),
      getProjectProgressTool(integration),
      generateProgressReportTool(integration),
      syncWithLinearTool(integration),
      getLinearTeamsTool(integration),
      getWorkflowStatesTool(integration),
      getSyncStatusTool(integration),
      generateTeamMetricsTool(integration),
    ],
  };
};

