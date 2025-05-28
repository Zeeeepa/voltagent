/**
 * Webhook API Routes
 * HTTP endpoints for webhook processing and management
 */

import { z } from "zod";
import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import { getWebhookHandler } from "./handler";
import { getWebhookRouter } from "./router";
import { getWebhookAutomationEngine } from "./automation";
import type { WebhookSource, WebhookEventType } from "./types";

/**
 * Webhook processing request schema
 */
const WebhookProcessingRequestSchema = z.object({
  source: z.enum(["github", "generic", "custom"]).optional(),
  eventType: z.string().optional(),
  payload: z.any(),
  headers: z.record(z.string()).optional()
});

/**
 * Webhook processing response schema
 */
const WebhookProcessingResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  duration: z.number(),
  triggeredActions: z.array(z.any()),
  createdEvents: z.array(z.string())
});

/**
 * Webhook handler configuration schema
 */
const WebhookHandlerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(["github", "generic", "custom"]),
  eventTypes: z.array(z.string()),
  validation: z.object({
    method: z.enum(["hmac-sha256", "hmac-sha1", "secret", "none"]),
    secret: z.string().optional(),
    signatureHeader: z.string().optional()
  }),
  enabled: z.boolean()
});

/**
 * Webhook routing rule schema
 */
const WebhookRoutingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(["github", "generic", "custom"]).optional(),
  eventType: z.string().optional(),
  targetAgentId: z.string().optional(),
  action: z.object({
    type: z.enum(["agent_trigger", "tool_call", "notification", "custom"]),
    agentId: z.string().optional(),
    toolName: z.string().optional(),
    toolParams: z.record(z.any()).optional(),
    notification: z.object({
      message: z.string(),
      channels: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  priority: z.number().optional(),
  enabled: z.boolean().optional()
});

/**
 * Automation rule schema
 */
const AutomationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  source: z.enum(["github", "generic", "custom"]).optional(),
  eventType: z.string().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "contains", "startsWith", "endsWith", "regex", "exists", "gt", "lt", "gte", "lte"]),
    value: z.any().optional(),
    pattern: z.string().optional()
  })),
  actions: z.array(z.object({
    type: z.enum(["agent_trigger", "tool_call", "notification", "custom"]),
    agentId: z.string().optional(),
    toolName: z.string().optional(),
    toolParams: z.record(z.any()).optional(),
    notification: z.object({
      message: z.string(),
      channels: z.array(z.string()).optional()
    }).optional()
  })),
  priority: z.number(),
  cooldown: z.number().optional(),
  rateLimit: z.object({
    maxExecutions: z.number(),
    windowMs: z.number()
  }).optional(),
  tags: z.array(z.string()).optional()
});

/**
 * Error response schema
 */
const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  statusCode: z.number().optional()
});

/**
 * Success response schema
 */
const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  message: z.string().optional()
});

/**
 * Generic webhook endpoint
 */
export const genericWebhookRoute = createRoute({
  method: "post",
  path: "/webhooks/generic",
  summary: "Process generic webhook",
  description: "Process a generic webhook payload",
  request: {
    body: {
      content: {
        "application/json": {
          schema: WebhookProcessingRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: WebhookProcessingResponseSchema
        }
      },
      description: "Webhook processed successfully"
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Bad request"
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Unauthorized - validation failed"
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Internal server error"
    }
  }
});

/**
 * GitHub webhook endpoint
 */
export const githubWebhookRoute = createRoute({
  method: "post",
  path: "/webhooks/github",
  summary: "Process GitHub webhook",
  description: "Process a GitHub webhook payload with signature validation",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.any()
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: WebhookProcessingResponseSchema
        }
      },
      description: "GitHub webhook processed successfully"
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Bad request"
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Unauthorized - signature validation failed"
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Internal server error"
    }
  }
});

/**
 * Get webhook handlers
 */
export const getWebhookHandlersRoute = createRoute({
  method: "get",
  path: "/webhooks/handlers",
  summary: "Get webhook handlers",
  description: "Get all configured webhook handlers",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(WebhookHandlerConfigSchema)
          })
        }
      },
      description: "Webhook handlers retrieved successfully"
    }
  }
});

/**
 * Create webhook handler
 */
export const createWebhookHandlerRoute = createRoute({
  method: "post",
  path: "/webhooks/handlers",
  summary: "Create webhook handler",
  description: "Create a new webhook handler configuration",
  request: {
    body: {
      content: {
        "application/json": {
          schema: WebhookHandlerConfigSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema
        }
      },
      description: "Webhook handler created successfully"
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Bad request"
    }
  }
});

/**
 * Get webhook routing rules
 */
export const getWebhookRoutingRulesRoute = createRoute({
  method: "get",
  path: "/webhooks/routing-rules",
  summary: "Get webhook routing rules",
  description: "Get all configured webhook routing rules",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(WebhookRoutingRuleSchema)
          })
        }
      },
      description: "Webhook routing rules retrieved successfully"
    }
  }
});

/**
 * Create webhook routing rule
 */
export const createWebhookRoutingRuleRoute = createRoute({
  method: "post",
  path: "/webhooks/routing-rules",
  summary: "Create webhook routing rule",
  description: "Create a new webhook routing rule",
  request: {
    body: {
      content: {
        "application/json": {
          schema: WebhookRoutingRuleSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema
        }
      },
      description: "Webhook routing rule created successfully"
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Bad request"
    }
  }
});

/**
 * Get automation rules
 */
export const getAutomationRulesRoute = createRoute({
  method: "get",
  path: "/webhooks/automation-rules",
  summary: "Get automation rules",
  description: "Get all configured automation rules",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(AutomationRuleSchema)
          })
        }
      },
      description: "Automation rules retrieved successfully"
    }
  }
});

/**
 * Create automation rule
 */
export const createAutomationRuleRoute = createRoute({
  method: "post",
  path: "/webhooks/automation-rules",
  summary: "Create automation rule",
  description: "Create a new automation rule",
  request: {
    body: {
      content: {
        "application/json": {
          schema: AutomationRuleSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema
        }
      },
      description: "Automation rule created successfully"
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      },
      description: "Bad request"
    }
  }
});

/**
 * Get webhook statistics
 */
export const getWebhookStatsRoute = createRoute({
  method: "get",
  path: "/webhooks/stats",
  summary: "Get webhook statistics",
  description: "Get webhook system statistics and metrics",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              totalReceived: z.number(),
              totalProcessed: z.number(),
              totalFailed: z.number(),
              averageProcessingTime: z.number(),
              bySource: z.record(z.object({
                received: z.number(),
                processed: z.number(),
                failed: z.number()
              })),
              byEventType: z.record(z.object({
                received: z.number(),
                processed: z.number(),
                failed: z.number()
              })),
              lastReset: z.string()
            })
          })
        }
      },
      description: "Webhook statistics retrieved successfully"
    }
  }
});

/**
 * Get webhook system health
 */
export const getWebhookHealthRoute = createRoute({
  method: "get",
  path: "/webhooks/health",
  summary: "Get webhook system health",
  description: "Get webhook system health status and details",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              status: z.enum(["healthy", "degraded", "unhealthy"]),
              details: z.record(z.any())
            })
          })
        }
      },
      description: "Webhook health status retrieved successfully"
    }
  }
});

/**
 * Route handlers
 */

/**
 * Handle generic webhook processing
 */
export const handleGenericWebhook = async (c: Context) => {
  try {
    const body = await c.req.json();
    const headers = Object.fromEntries(c.req.raw.headers.entries());
    
    const handler = getWebhookHandler();
    const result = await handler.processWebhook(
      JSON.stringify(body.payload || body),
      headers,
      body.source as WebhookSource,
      body.eventType as WebhookEventType
    );

    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "PROCESSING_ERROR"
    }, 500);
  }
};

/**
 * Handle GitHub webhook processing
 */
export const handleGitHubWebhook = async (c: Context) => {
  try {
    const rawBody = await c.req.text();
    const headers = Object.fromEntries(c.req.raw.headers.entries());
    
    const handler = getWebhookHandler();
    const result = await handler.processWebhook(rawBody, headers, "github");

    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "GITHUB_PROCESSING_ERROR"
    }, 500);
  }
};

/**
 * Handle get webhook handlers
 */
export const handleGetWebhookHandlers = async (c: Context) => {
  try {
    const handler = getWebhookHandler();
    const handlers = handler.getHandlers();

    return c.json({
      success: true,
      data: handlers
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "GET_HANDLERS_ERROR"
    }, 500);
  }
};

/**
 * Handle create webhook handler
 */
export const handleCreateWebhookHandler = async (c: Context) => {
  try {
    const body = await c.req.json();
    const handler = getWebhookHandler();
    
    handler.addHandler(body);

    return c.json({
      success: true,
      message: "Webhook handler created successfully"
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "CREATE_HANDLER_ERROR"
    }, 500);
  }
};

/**
 * Handle get webhook routing rules
 */
export const handleGetWebhookRoutingRules = async (c: Context) => {
  try {
    const router = getWebhookRouter();
    const rules = router.getRules();

    return c.json({
      success: true,
      data: rules
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "GET_ROUTING_RULES_ERROR"
    }, 500);
  }
};

/**
 * Handle create webhook routing rule
 */
export const handleCreateWebhookRoutingRule = async (c: Context) => {
  try {
    const body = await c.req.json();
    const router = getWebhookRouter();
    
    router.addRule(body);

    return c.json({
      success: true,
      message: "Webhook routing rule created successfully"
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "CREATE_ROUTING_RULE_ERROR"
    }, 500);
  }
};

/**
 * Handle get automation rules
 */
export const handleGetAutomationRules = async (c: Context) => {
  try {
    const engine = getWebhookAutomationEngine();
    const rules = engine.getRules();

    return c.json({
      success: true,
      data: rules
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "GET_AUTOMATION_RULES_ERROR"
    }, 500);
  }
};

/**
 * Handle create automation rule
 */
export const handleCreateAutomationRule = async (c: Context) => {
  try {
    const body = await c.req.json();
    const engine = getWebhookAutomationEngine();
    
    // Add timestamps
    const rule = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    engine.addRule(rule);

    return c.json({
      success: true,
      message: "Automation rule created successfully"
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "CREATE_AUTOMATION_RULE_ERROR"
    }, 500);
  }
};

/**
 * Handle get webhook statistics
 */
export const handleGetWebhookStats = async (c: Context) => {
  try {
    const handler = getWebhookHandler();
    const stats = handler.getStats();

    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "GET_STATS_ERROR"
    }, 500);
  }
};

/**
 * Handle get webhook health
 */
export const handleGetWebhookHealth = async (c: Context) => {
  try {
    const handler = getWebhookHandler();
    const health = handler.healthCheck();

    return c.json({
      success: true,
      data: health
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "GET_HEALTH_ERROR"
    }, 500);
  }
};

