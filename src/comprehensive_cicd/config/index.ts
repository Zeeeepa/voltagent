import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema validation
const configSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    apiVersion: z.string().default('v1'),
  }),
  database: z.object({
    url: z.string().optional(),
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    name: z.string().default('comprehensive_cicd'),
    user: z.string().default('postgres'),
    password: z.string().default('password'),
    ssl: z.boolean().default(false),
    poolMin: z.number().default(2),
    poolMax: z.number().default(10),
  }),
  claudeCode: z.object({
    agentapiUrl: z.string().default('http://localhost:8000'),
    apiKey: z.string().optional(),
    path: z.string().default('/usr/local/bin/claude'),
  }),
  wsl2: z.object({
    distro: z.string().default('Ubuntu-22.04'),
    basePath: z.string().default('/mnt/c/projects'),
    maxInstances: z.number().default(5),
    memory: z.string().default('8GB'),
    processors: z.number().default(4),
    swap: z.string().default('2GB'),
    localhostForwarding: z.boolean().default(true),
  }),
  validation: z.object({
    timeout: z.number().default(300000),
    enableSecurityAnalysis: z.boolean().default(true),
    enablePerformanceAnalysis: z.boolean().default(true),
    codeQualityWeight: z.number().default(0.3),
    functionalityWeight: z.number().default(0.4),
    testingWeight: z.number().default(0.2),
    documentationWeight: z.number().default(0.1),
  }),
  deployment: z.object({
    strategy: z.enum(['wsl2', 'container']).default('wsl2'),
    enableContainerDeployment: z.boolean().default(false),
    containerRegistry: z.string().default('docker.io'),
    containerNamespace: z.string().default('codegen-cicd'),
  }),
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsPort: z.number().default(9090),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enableHealthChecks: z.boolean().default(true),
  }),
  security: z.object({
    jwtSecret: z.string().default('default-jwt-secret'),
    apiRateLimit: z.number().default(100),
    corsOrigin: z.string().default('*'),
    enableHelmet: z.boolean().default(true),
  }),
  github: z.object({
    token: z.string().optional(),
    webhookSecret: z.string().optional(),
  }),
  notifications: z.object({
    slackWebhookUrl: z.string().optional(),
    emailSmtpHost: z.string().optional(),
    emailSmtpPort: z.number().default(587),
    emailUser: z.string().optional(),
    emailPassword: z.string().optional(),
  }),
});

// Parse and validate configuration
const rawConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test',
    apiVersion: process.env.API_VERSION,
  },
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2'),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10'),
  },
  claudeCode: {
    agentapiUrl: process.env.AGENTAPI_URL,
    apiKey: process.env.CLAUDE_CODE_API_KEY,
    path: process.env.CLAUDE_CODE_PATH,
  },
  wsl2: {
    distro: process.env.WSL2_DISTRO,
    basePath: process.env.WSL2_BASE_PATH,
    maxInstances: parseInt(process.env.MAX_WSL2_INSTANCES || '5'),
    memory: process.env.WSL2_MEMORY,
    processors: parseInt(process.env.WSL2_PROCESSORS || '4'),
    swap: process.env.WSL2_SWAP,
    localhostForwarding: process.env.WSL2_LOCALHOST_FORWARDING === 'true',
  },
  validation: {
    timeout: parseInt(process.env.VALIDATION_TIMEOUT || '300000'),
    enableSecurityAnalysis: process.env.ENABLE_SECURITY_ANALYSIS === 'true',
    enablePerformanceAnalysis: process.env.ENABLE_PERFORMANCE_ANALYSIS === 'true',
    codeQualityWeight: parseFloat(process.env.CODE_QUALITY_WEIGHT || '0.3'),
    functionalityWeight: parseFloat(process.env.FUNCTIONALITY_WEIGHT || '0.4'),
    testingWeight: parseFloat(process.env.TESTING_WEIGHT || '0.2'),
    documentationWeight: parseFloat(process.env.DOCUMENTATION_WEIGHT || '0.1'),
  },
  deployment: {
    strategy: process.env.DEPLOYMENT_STRATEGY as 'wsl2' | 'container',
    enableContainerDeployment: process.env.ENABLE_CONTAINER_DEPLOYMENT === 'true',
    containerRegistry: process.env.CONTAINER_REGISTRY,
    containerNamespace: process.env.CONTAINER_NAMESPACE,
  },
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
    logLevel: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS === 'true',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET,
    apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
    corsOrigin: process.env.CORS_ORIGIN,
    enableHelmet: process.env.ENABLE_HELMET === 'true',
  },
  github: {
    token: process.env.GITHUB_TOKEN,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },
  notifications: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    emailSmtpHost: process.env.EMAIL_SMTP_HOST,
    emailSmtpPort: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    emailUser: process.env.EMAIL_USER,
    emailPassword: process.env.EMAIL_PASSWORD,
  },
};

export const config = configSchema.parse(rawConfig);

export type Config = z.infer<typeof configSchema>;

// Configuration validation function
export function validateConfig(): boolean {
  try {
    configSchema.parse(rawConfig);
    return true;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return false;
  }
}

// Get configuration for specific environment
export function getEnvironmentConfig(env: string = config.server.nodeEnv) {
  const envConfigs = {
    development: {
      ...config,
      monitoring: {
        ...config.monitoring,
        logLevel: 'debug' as const,
      },
    },
    production: {
      ...config,
      monitoring: {
        ...config.monitoring,
        logLevel: 'warn' as const,
      },
      security: {
        ...config.security,
        enableHelmet: true,
      },
    },
    test: {
      ...config,
      database: {
        ...config.database,
        name: `${config.database.name}_test`,
      },
      monitoring: {
        ...config.monitoring,
        logLevel: 'error' as const,
        enableMetrics: false,
      },
    },
  };

  return envConfigs[env as keyof typeof envConfigs] || config;
}

