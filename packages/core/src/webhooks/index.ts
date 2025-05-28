/**
 * Webhook Event System
 * Consolidated webhook handling and event processing system
 * 
 * This module consolidates all webhook functionality including:
 * - GitHub webhook integration (PR #48, #89)
 * - Event processing pipeline (PR #49)
 * - Webhook validation system (PR #58)
 * - Event routing and distribution (PR #68)
 * - Webhook system & event-driven automation (PR #79)
 */

// Core types and interfaces
export type {
  WebhookSource,
  WebhookEventType,
  WebhookValidationConfig,
  WebhookRoutingRule,
  WebhookAutomationAction,
  WebhookPayload,
  WebhookEventData,
  WebhookHandlerConfig,
  WebhookProcessingResult,
  WebhookSystemConfig,
  WebhookSystemStats
} from "./types";

// Validation system
export {
  WebhookValidator,
  GitHubWebhookValidator,
  ComprehensiveWebhookValidator,
  WebhookValidationError
} from "./validation";
export type { ValidationResult } from "./validation";

// Routing and distribution system
export {
  WebhookRouter,
  WebhookRoutingError,
  getWebhookRouter,
  createDefaultRoutingRules
} from "./router";

// Automation engine
export {
  WebhookAutomationEngine,
  getWebhookAutomationEngine,
  createDefaultAutomationRules
} from "./automation";
export type {
  AutomationCondition,
  AutomationRule,
  AutomationExecutionContext,
  AutomationExecutionResult
} from "./automation";

// Main webhook handler
export {
  WebhookHandler,
  WebhookProcessingError,
  getWebhookHandler,
  initializeWebhookSystem
} from "./handler";

// API routes and handlers
export {
  genericWebhookRoute,
  githubWebhookRoute,
  getWebhookHandlersRoute,
  createWebhookHandlerRoute,
  getWebhookRoutingRulesRoute,
  createWebhookRoutingRuleRoute,
  getAutomationRulesRoute,
  createAutomationRuleRoute,
  getWebhookStatsRoute,
  getWebhookHealthRoute,
  handleGenericWebhook,
  handleGitHubWebhook,
  handleGetWebhookHandlers,
  handleCreateWebhookHandler,
  handleGetWebhookRoutingRules,
  handleCreateWebhookRoutingRule,
  handleGetAutomationRules,
  handleCreateAutomationRule,
  handleGetWebhookStats,
  handleGetWebhookHealth
} from "./routes";

/**
 * Initialize the complete webhook system
 * 
 * This function sets up all webhook components:
 * - Webhook handlers for different sources
 * - Routing rules for event distribution
 * - Automation rules for event-driven actions
 * - Validation configurations
 * 
 * @param config Optional webhook system configuration
 * @returns Configured webhook handler instance
 */
export const initializeWebhookEventSystem = (config?: Partial<WebhookSystemConfig>) => {
  // Initialize the main webhook handler
  const handler = initializeWebhookSystem(config);
  
  // Get router and automation engine (they initialize with defaults)
  const router = getWebhookRouter();
  const automationEngine = getWebhookAutomationEngine();
  
  console.log("🔗 Webhook Event System initialized successfully");
  console.log(`   📥 Handlers: ${handler.getHandlers().length}`);
  console.log(`   🔀 Routing Rules: ${router.getRules().length}`);
  console.log(`   🤖 Automation Rules: ${automationEngine.getRules().length}`);
  
  return {
    handler,
    router,
    automationEngine,
    stats: handler.getStats(),
    health: handler.healthCheck()
  };
};

/**
 * Quick setup for GitHub webhooks
 * 
 * @param secret GitHub webhook secret for validation
 * @param targetAgentId Optional agent ID to route GitHub events to
 * @returns Configured webhook system for GitHub
 */
export const setupGitHubWebhooks = (secret: string, targetAgentId?: string) => {
  const system = initializeWebhookEventSystem();
  
  // Update GitHub handler with secret
  const githubHandler = system.handler.getHandler("github-default");
  if (githubHandler) {
    githubHandler.validation.secret = secret;
  }
  
  // Add GitHub-specific routing rule if agent ID provided
  if (targetAgentId) {
    system.router.addRule({
      id: "github-to-agent",
      name: "Route GitHub Events to Agent",
      source: "github",
      targetAgentId,
      action: {
        type: "agent_trigger",
        agentId: targetAgentId
      },
      priority: 200,
      enabled: true
    });
  }
  
  console.log(`🐙 GitHub webhooks configured with agent: ${targetAgentId || "none"}`);
  
  return system;
};

/**
 * Quick setup for generic webhooks
 * 
 * @param validationConfig Validation configuration for generic webhooks
 * @returns Configured webhook system for generic webhooks
 */
export const setupGenericWebhooks = (validationConfig?: WebhookValidationConfig) => {
  const system = initializeWebhookEventSystem();
  
  // Update generic handler with validation config
  if (validationConfig) {
    const genericHandler = system.handler.getHandler("generic-default");
    if (genericHandler) {
      genericHandler.validation = validationConfig;
    }
  }
  
  console.log("🔗 Generic webhooks configured");
  
  return system;
};

/**
 * Add webhook to existing Hono app
 * 
 * @param app Hono application instance
 * @param basePath Base path for webhook routes (default: "/webhooks")
 */
export const addWebhookRoutes = (app: any, basePath: string = "/webhooks") => {
  // Add webhook processing routes
  app.openapi(genericWebhookRoute, handleGenericWebhook);
  app.openapi(githubWebhookRoute, handleGitHubWebhook);
  
  // Add management routes
  app.openapi(getWebhookHandlersRoute, handleGetWebhookHandlers);
  app.openapi(createWebhookHandlerRoute, handleCreateWebhookHandler);
  app.openapi(getWebhookRoutingRulesRoute, handleGetWebhookRoutingRules);
  app.openapi(createWebhookRoutingRuleRoute, handleCreateWebhookRoutingRule);
  app.openapi(getAutomationRulesRoute, handleGetAutomationRules);
  app.openapi(createAutomationRuleRoute, handleCreateAutomationRule);
  app.openapi(getWebhookStatsRoute, handleGetWebhookStats);
  app.openapi(getWebhookHealthRoute, handleGetWebhookHealth);
  
  console.log(`🌐 Webhook routes added to app at ${basePath}`);
};

// Default export for convenience
export default {
  initializeWebhookEventSystem,
  setupGitHubWebhooks,
  setupGenericWebhooks,
  addWebhookRoutes,
  getWebhookHandler,
  getWebhookRouter,
  getWebhookAutomationEngine
};

