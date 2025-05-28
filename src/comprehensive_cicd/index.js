#!/usr/bin/env node

/**
 * Comprehensive CI/CD System Entry Point
 * Integrates codegen functionality with intelligent prompt generation and PR tracking
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.comprehensive_cicd') });

const ComprehensiveCICDServer = require('./api/server');
const CodegenIntegration = require('./services/codegen-integration');
const TaskStorage = require('./database/task-storage');
const WorkflowOrchestrator = require('./workflows/orchestrator');
const MetricsCollector = require('./monitoring/metrics');

class ComprehensiveCICDSystem {
    constructor(config = {}) {
        this.config = {
            // Server configuration
            port: config.port || process.env.API_PORT || 3000,
            
            // Service configuration
            enableCodegenIntegration: config.enableCodegenIntegration !== false,
            enableWorkflowOrchestration: config.enableWorkflowOrchestration !== false,
            enableMetricsCollection: config.enableMetricsCollection !== false,
            
            // Environment
            environment: config.environment || process.env.NODE_ENV || 'development',
            
            ...config
        };

        this.server = null;
        this.services = {};
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Comprehensive CI/CD System...');
            console.log(`📍 Environment: ${this.config.environment}`);
            console.log(`🌐 Port: ${this.config.port}`);
            
            // Validate environment
            await this.validateEnvironment();
            
            // Initialize core services
            await this.initializeServices();
            
            // Initialize API server
            await this.initializeServer();
            
            this.initialized = true;
            console.log('✅ Comprehensive CI/CD System initialized successfully');
            
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ Failed to initialize Comprehensive CI/CD System:', error);
            throw error;
        }
    }

    async validateEnvironment() {
        console.log('🔍 Validating environment configuration...');
        
        const requiredEnvVars = [
            'DATABASE_PASSWORD'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        
        // Validate Codegen configuration if not in mock mode
        if (!process.env.CODEGEN_ENABLE_MOCK_MODE && this.config.enableCodegenIntegration) {
            if (!process.env.CODEGEN_API_KEY) {
                console.warn('⚠️  CODEGEN_API_KEY not provided. Enabling mock mode.');
                process.env.CODEGEN_ENABLE_MOCK_MODE = 'true';
            }
        }
        
        console.log('✅ Environment validation completed');
    }

    async initializeServices() {
        console.log('🔧 Initializing core services...');
        
        // Initialize Task Storage
        this.services.taskStorage = new TaskStorage();
        await this.services.taskStorage.initialize();
        
        // Initialize Codegen Integration (if enabled)
        if (this.config.enableCodegenIntegration) {
            this.services.codegenIntegration = new CodegenIntegration();
            await this.services.codegenIntegration.initialize();
        }
        
        // Initialize Workflow Orchestrator (if enabled)
        if (this.config.enableWorkflowOrchestration) {
            this.services.workflowOrchestrator = new WorkflowOrchestrator();
            await this.services.workflowOrchestrator.initialize();
        }
        
        // Initialize Metrics Collector (if enabled)
        if (this.config.enableMetricsCollection) {
            this.services.metricsCollector = new MetricsCollector();
            await this.services.metricsCollector.initialize();
        }
        
        console.log('✅ Core services initialized');
    }

    async initializeServer() {
        console.log('🌐 Initializing API server...');
        
        this.server = new ComprehensiveCICDServer({
            port: this.config.port,
            corsOrigin: process.env.CORS_ORIGIN,
            rateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
                max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
            }
        });
        
        await this.server.start();
        console.log('✅ API server initialized');
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            
            try {
                // Stop accepting new requests
                if (this.server) {
                    console.log('🌐 Stopping API server...');
                    await this.server.stop();
                }
                
                // Close service connections
                if (this.services.taskStorage) {
                    console.log('🗄️  Closing database connections...');
                    await this.services.taskStorage.close();
                }
                
                console.log('✅ Graceful shutdown completed');
                process.exit(0);
                
            } catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        };
        
        // Handle different shutdown signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('💥 Uncaught Exception:', error);
            shutdown('uncaughtException');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            shutdown('unhandledRejection');
        });
    }

    // Public API methods

    async createTask(taskData) {
        if (!this.services.taskStorage) {
            throw new Error('Task storage service not initialized');
        }
        
        return await this.services.taskStorage.createTask(taskData);
    }

    async triggerCompleteWorkflow(taskId, options = {}) {
        if (!this.services.workflowOrchestrator) {
            throw new Error('Workflow orchestrator service not initialized');
        }
        
        return await this.services.workflowOrchestrator.triggerCompleteWorkflow(taskId, options);
    }

    async getMetrics() {
        if (!this.services.metricsCollector) {
            throw new Error('Metrics collector service not initialized');
        }
        
        return await this.services.metricsCollector.getMetrics();
    }

    async getSystemHealth() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {}
        };
        
        try {
            // Check database health
            if (this.services.taskStorage) {
                health.services.database = await this.services.taskStorage.healthCheck();
            }
            
            // Check metrics collector health
            if (this.services.metricsCollector) {
                health.services.metrics = this.services.metricsCollector.getSystemHealth();
            }
            
            // Determine overall health
            const unhealthyServices = Object.values(health.services)
                .filter(service => service.status !== 'healthy');
            
            if (unhealthyServices.length > 0) {
                health.status = 'degraded';
            }
            
        } catch (error) {
            health.status = 'unhealthy';
            health.error = error.message;
        }
        
        return health;
    }

    // CLI interface
    static async createCLI() {
        const args = process.argv.slice(2);
        const command = args[0];
        
        switch (command) {
            case 'start':
                await ComprehensiveCICDSystem.start();
                break;
                
            case 'health':
                await ComprehensiveCICDSystem.checkHealth();
                break;
                
            case 'metrics':
                await ComprehensiveCICDSystem.showMetrics();
                break;
                
            case 'init-db':
                await ComprehensiveCICDSystem.initializeDatabase();
                break;
                
            default:
                console.log(`
Comprehensive CI/CD System CLI

Usage: node index.js <command>

Commands:
  start      Start the CI/CD system
  health     Check system health
  metrics    Show system metrics
  init-db    Initialize database schema

Environment:
  Set environment variables in .env.comprehensive_cicd file
                `);
        }
    }

    static async start() {
        const system = new ComprehensiveCICDSystem();
        await system.initialize();
    }

    static async checkHealth() {
        try {
            const system = new ComprehensiveCICDSystem();
            await system.initialize();
            
            const health = await system.getSystemHealth();
            console.log('🏥 System Health Check:');
            console.log(JSON.stringify(health, null, 2));
            
            process.exit(health.status === 'healthy' ? 0 : 1);
            
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            process.exit(1);
        }
    }

    static async showMetrics() {
        try {
            const system = new ComprehensiveCICDSystem();
            await system.initialize();
            
            const metrics = await system.getMetrics();
            console.log('📊 System Metrics:');
            console.log(JSON.stringify(metrics, null, 2));
            
        } catch (error) {
            console.error('❌ Failed to retrieve metrics:', error.message);
            process.exit(1);
        }
    }

    static async initializeDatabase() {
        try {
            console.log('🗄️  Initializing database schema...');
            
            const taskStorage = new TaskStorage();
            await taskStorage.initialize();
            await taskStorage.close();
            
            console.log('✅ Database schema initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            process.exit(1);
        }
    }
}

// Export for programmatic use
module.exports = ComprehensiveCICDSystem;

// CLI execution
if (require.main === module) {
    ComprehensiveCICDSystem.createCLI().catch(error => {
        console.error('💥 CLI execution failed:', error);
        process.exit(1);
    });
}

