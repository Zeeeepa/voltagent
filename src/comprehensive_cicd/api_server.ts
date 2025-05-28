import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { z } from 'zod';
import { config } from './config/index.js';
import { ClaudeCodeValidator } from './validation/service.js';
import { WSL2Manager } from './wsl2/manager.js';
import { AgentAPIClient } from './agentapi/client.js';
import { db } from './database/connection.js';

// Initialize services
const validator = new ClaudeCodeValidator({
  agentapiUrl: config.claudeCode.agentapiUrl,
  apiKey: config.claudeCode.apiKey,
});

const wsl2Manager = new WSL2Manager();
const agentApiClient = new AgentAPIClient();

// Create Express app
const app = express();
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.security.corsOrigin }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request validation schemas
const validatePRSchema = z.object({
  pr_info: z.object({
    url: z.string().url(),
    number: z.number(),
    branchName: z.string(),
    repository: z.string(),
    owner: z.string(),
  }),
  task_context: z.object({
    taskId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    priority: z.number().default(0),
    metadata: z.record(z.any()).optional(),
  }),
  options: z.object({
    enableSecurityAnalysis: z.boolean().optional(),
    enablePerformanceAnalysis: z.boolean().optional(),
    codeQualityWeight: z.number().optional(),
    functionalityWeight: z.number().optional(),
    testingWeight: z.number().optional(),
    documentationWeight: z.number().optional(),
    timeout: z.number().optional(),
  }).optional(),
});

const deployPRSchema = z.object({
  pr_url: z.string().url(),
  branch_name: z.string(),
  options: z.object({
    projectId: z.string().optional(),
    wsl2Config: z.record(z.any()).optional(),
  }).optional(),
});

const analyzeCodeSchema = z.object({
  deployment_path: z.string(),
  analysis_options: z.object({
    includeMetrics: z.boolean().optional(),
    includeComplexity: z.boolean().optional(),
    includeSecurity: z.boolean().optional(),
    includePerformance: z.boolean().optional(),
    includeTestCoverage: z.boolean().optional(),
  }).optional(),
});

const createWSL2InstanceSchema = z.object({
  project_id: z.string(),
  configuration: z.object({
    memory: z.string().optional(),
    processors: z.number().optional(),
    swap: z.string().optional(),
    enableGUI: z.boolean().optional(),
    enableSystemd: z.boolean().optional(),
    customPackages: z.array(z.string()).optional(),
  }).optional(),
});

// Error handling middleware
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Health check endpoint
app.get('/health', asyncHandler(async (req: express.Request, res: express.Response) => {
  const health = await validator.healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 206 : 503;
  
  res.status(statusCode).json({
    status: health.status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    components: health.components,
    metrics: health.metrics,
  });
}));

// PR Validation Endpoints
app.post(`/api/${config.server.apiVersion}/validation/pr`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { pr_info, task_context, options } = validatePRSchema.parse(req.body);
    
    const session = await validator.validatePR(pr_info, task_context, options);
    
    res.status(202).json({
      success: true,
      session_id: session.id,
      status: session.status,
      message: 'Validation started successfully',
      session,
    });
  })
);

app.post(`/api/${config.server.apiVersion}/validation/deploy`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { pr_url, branch_name, options } = deployPRSchema.parse(req.body);
    
    const result = await validator.deployPRToEnvironment(pr_url, branch_name, options);
    
    res.json({
      success: result.success,
      deployment_path: result.deploymentPath,
      instance_name: result.instanceName,
      logs: result.logs,
      error: result.error,
    });
  })
);

app.post(`/api/${config.server.apiVersion}/validation/analyze`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { deployment_path, analysis_options } = analyzeCodeSchema.parse(req.body);
    
    const result = await validator.runCodeAnalysis(deployment_path, analysis_options);
    
    res.json({
      success: true,
      analysis_result: result,
    });
  })
);

app.get(`/api/${config.server.apiVersion}/validation/:task_id/results`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { task_id } = req.params;
    
    const results = await validator.getValidationResults(task_id);
    
    res.json({
      success: true,
      task_id,
      results,
    });
  })
);

app.get(`/api/${config.server.apiVersion}/validation/session/:session_id`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { session_id } = req.params;
    
    const session = await validator.getValidationSession(session_id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Validation session not found',
      });
    }
    
    res.json({
      success: true,
      session,
    });
  })
);

app.post(`/api/${config.server.apiVersion}/validation/:session_id/cancel`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { session_id } = req.params;
    
    const success = await validator.cancelValidation(session_id);
    
    res.json({
      success,
      message: success ? 'Validation cancelled successfully' : 'Failed to cancel validation',
    });
  })
);

// WSL2 Management Endpoints
app.get(`/api/${config.server.apiVersion}/wsl2/instances`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const instances = await wsl2Manager.listInstances();
    
    res.json({
      success: true,
      instances,
    });
  })
);

app.post(`/api/${config.server.apiVersion}/wsl2/instances`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { project_id, configuration } = createWSL2InstanceSchema.parse(req.body);
    
    const instance = await wsl2Manager.createInstance(project_id, configuration);
    
    res.status(201).json({
      success: true,
      instance,
    });
  })
);

app.get(`/api/${config.server.apiVersion}/wsl2/instances/:instance_name`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { instance_name } = req.params;
    
    const instance = await wsl2Manager.getInstance(instance_name);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'WSL2 instance not found',
      });
    }
    
    res.json({
      success: true,
      instance,
    });
  })
);

app.delete(`/api/${config.server.apiVersion}/wsl2/instances/:instance_name`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { instance_name } = req.params;
    
    const success = await wsl2Manager.destroyInstance(instance_name);
    
    res.json({
      success,
      message: success ? 'Instance destroyed successfully' : 'Failed to destroy instance',
    });
  })
);

app.post(`/api/${config.server.apiVersion}/wsl2/cleanup`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { max_age_hours = 24 } = req.body;
    
    const cleanedCount = await wsl2Manager.cleanupOldInstances(max_age_hours);
    
    res.json({
      success: true,
      cleaned_instances: cleanedCount,
      message: `Cleaned up ${cleanedCount} old instances`,
    });
  })
);

// Metrics and Monitoring Endpoints
app.get(`/api/${config.server.apiVersion}/metrics`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const metrics = await validator.getValidationMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

app.get(`/api/${config.server.apiVersion}/metrics/database`, 
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const poolInfo = db.getPoolInfo();
    const isHealthy = await db.healthCheck();
    
    res.json({
      success: true,
      database: {
        healthy: isHealthy,
        pool: poolInfo,
      },
    });
  })
);

// WebSocket endpoint for real-time validation updates
app.ws(`/api/${config.server.apiVersion}/validation/stream/:session_id`, (ws: any, req: any) => {
  const sessionId = req.params.session_id;
  
  console.log(`WebSocket connection established for session: ${sessionId}`);
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    session_id: sessionId,
    timestamp: new Date().toISOString(),
  }));
  
  // Set up periodic status updates
  const statusInterval = setInterval(async () => {
    try {
      const session = await validator.getValidationSession(sessionId);
      if (session) {
        ws.send(JSON.stringify({
          type: 'status_update',
          session_id: sessionId,
          status: session.status,
          timestamp: new Date().toISOString(),
          data: session,
        }));
        
        // Close connection if session is completed or failed
        if (['completed', 'failed', 'cancelled'].includes(session.status)) {
          clearInterval(statusInterval);
          ws.close();
        }
      }
    } catch (error) {
      console.error(`Error sending status update for session ${sessionId}:`, error);
    }
  }, 5000); // Update every 5 seconds
  
  ws.on('close', () => {
    console.log(`WebSocket connection closed for session: ${sessionId}`);
    clearInterval(statusInterval);
  });
  
  ws.on('error', (error: Error) => {
    console.error(`WebSocket error for session ${sessionId}:`, error);
    clearInterval(statusInterval);
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);
  
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors,
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.server.nodeEnv === 'development' ? error.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await db.close();
  console.log('Database connection closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await db.close();
  console.log('Database connection closed');
  
  process.exit(0);
});

// Start server
const PORT = config.server.port;
server.listen(PORT, () => {
  console.log(`🚀 Comprehensive CI/CD API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API version: ${config.server.apiVersion}`);
  console.log(`🌍 Environment: ${config.server.nodeEnv}`);
  
  if (config.monitoring.enableMetrics) {
    console.log(`📈 Metrics available at: http://localhost:${PORT}/api/${config.server.apiVersion}/metrics`);
  }
});

export { app, server };

