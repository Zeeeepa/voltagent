/**
 * Unified System Initialization
 * 
 * Consolidates initialization patterns across the VoltAgent system,
 * providing a single entry point for system startup and configuration.
 */

import type { Agent } from "../agent";
import { CoreOrchestrator, type OrchestratorConfig } from "./index";
import { AgentRegistry } from "../server/registry";
import { AgentEventEmitter } from "../events";
import type { VoltAgentExporter } from "../telemetry/exporter";
import { startServer } from "../server";
import { checkForUpdates } from "../utils/update";

/**
 * System initialization configuration
 */
export interface SystemConfig {
  /** Orchestrator configuration */
  orchestrator?: OrchestratorConfig;
  
  /** Server configuration */
  server?: {
    /** Port to start server on */
    port?: number;
    /** Auto-start server */
    autoStart?: boolean;
    /** Enable WebSocket support */
    enableWebSocket?: boolean;
  };
  
  /** Telemetry configuration */
  telemetry?: {
    /** Enable telemetry collection */
    enabled?: boolean;
    /** Telemetry exporter instance */
    exporter?: VoltAgentExporter;
  };
  
  /** Dependency management */
  dependencies?: {
    /** Check for updates on startup */
    checkUpdates?: boolean;
    /** Auto-update dependencies */
    autoUpdate?: boolean;
  };
  
  /** Logging configuration */
  logging?: {
    /** Log level */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** Enable structured logging */
    structured?: boolean;
  };
}

/**
 * System initialization result
 */
export interface InitializationResult {
  orchestrator: CoreOrchestrator;
  registry: AgentRegistry;
  eventEmitter: AgentEventEmitter;
  server?: {
    port: number;
    url: string;
  };
  telemetryEnabled: boolean;
}

/**
 * Unified System Initializer
 * 
 * Provides centralized initialization for all core system components,
 * eliminating duplicate initialization logic across different modules.
 */
export class SystemInitializer {
  private static instance: SystemInitializer | null = null;
  private isInitialized = false;
  private config: Required<SystemConfig>;

  private constructor(config: SystemConfig = {}) {
    this.config = {
      orchestrator: {
        maxConcurrentOperations: 50,
        defaultTimeout: 30000,
        autoCleanup: true,
        cleanupInterval: 60000,
        enableTelemetry: true,
        enableEventPropagation: true,
        ...config.orchestrator,
      },
      server: {
        port: 3141,
        autoStart: true,
        enableWebSocket: true,
        ...config.server,
      },
      telemetry: {
        enabled: true,
        ...config.telemetry,
      },
      dependencies: {
        checkUpdates: true,
        autoUpdate: false,
        ...config.dependencies,
      },
      logging: {
        level: 'info',
        structured: false,
        ...config.logging,
      },
    };
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(config?: SystemConfig): SystemInitializer {
    if (!SystemInitializer.instance) {
      SystemInitializer.instance = new SystemInitializer(config);
    }
    return SystemInitializer.instance;
  }

  /**
   * Initialize the entire system
   */
  public async initialize(agents: Record<string, Agent<any>> = {}): Promise<InitializationResult> {
    if (this.isInitialized) {
      throw new Error('System is already initialized');
    }

    console.log('[SystemInitializer] Starting system initialization...');

    // 1. Initialize core orchestrator
    const orchestrator = CoreOrchestrator.getInstance(this.config.orchestrator);
    await orchestrator.initialize();
    console.log('[SystemInitializer] ✓ Core orchestrator initialized');

    // 2. Get registry and event emitter instances
    const registry = AgentRegistry.getInstance();
    const eventEmitter = AgentEventEmitter.getInstance();

    // 3. Set up telemetry if enabled
    let telemetryEnabled = false;
    if (this.config.telemetry.enabled && this.config.telemetry.exporter) {
      registry.setGlobalVoltAgentExporter(this.config.telemetry.exporter);
      telemetryEnabled = true;
      console.log('[SystemInitializer] ✓ Telemetry configured');
    }

    // 4. Register agents
    const agentCount = Object.keys(agents).length;
    if (agentCount > 0) {
      Object.values(agents).forEach(agent => {
        orchestrator.registerAgent(agent);
      });
      console.log(`[SystemInitializer] ✓ Registered ${agentCount} agents`);
    }

    // 5. Check dependencies if enabled
    if (this.config.dependencies.checkUpdates) {
      await this.checkDependencies();
    }

    // 6. Start server if enabled
    let serverInfo;
    if (this.config.server.autoStart) {
      try {
        const serverResult = await startServer();
        serverInfo = {
          port: serverResult.port,
          url: `http://localhost:${serverResult.port}`,
        };
        console.log(`[SystemInitializer] ✓ Server started on port ${serverResult.port}`);
      } catch (error) {
        console.error('[SystemInitializer] Failed to start server:', error);
        throw error;
      }
    }

    this.isInitialized = true;
    console.log('[SystemInitializer] ✓ System initialization complete');

    return {
      orchestrator,
      registry,
      eventEmitter,
      server: serverInfo,
      telemetryEnabled,
    };
  }

  /**
   * Shutdown the system
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log('[SystemInitializer] Starting system shutdown...');

    // Shutdown orchestrator
    const orchestrator = CoreOrchestrator.getInstance();
    await orchestrator.shutdown();

    this.isInitialized = false;
    console.log('[SystemInitializer] ✓ System shutdown complete');
  }

  /**
   * Check if system is initialized
   */
  public isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<SystemConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration (only before initialization)
   */
  public updateConfig(config: Partial<SystemConfig>): void {
    if (this.isInitialized) {
      throw new Error('Cannot update configuration after system is initialized');
    }

    this.config = {
      ...this.config,
      ...config,
      orchestrator: { ...this.config.orchestrator, ...config.orchestrator },
      server: { ...this.config.server, ...config.server },
      telemetry: { ...this.config.telemetry, ...config.telemetry },
      dependencies: { ...this.config.dependencies, ...config.dependencies },
      logging: { ...this.config.logging, ...config.logging },
    };
  }

  /**
   * Check for dependency updates
   */
  private async checkDependencies(): Promise<void> {
    try {
      const result = await checkForUpdates(undefined, {
        filter: "@voltagent",
      });

      if (result.hasUpdates) {
        console.log(`[SystemInitializer] ${result.message}`);
        console.log('[SystemInitializer] Run \'volt update\' to update VoltAgent packages');
      } else {
        console.log(`[SystemInitializer] ${result.message}`);
      }
    } catch (error) {
      console.error('[SystemInitializer] Error checking dependencies:', error);
    }
  }
}

/**
 * Factory function to initialize the system
 */
export async function initializeSystem(
  agents: Record<string, Agent<any>> = {},
  config?: SystemConfig
): Promise<InitializationResult> {
  const initializer = SystemInitializer.getInstance(config);
  return await initializer.initialize(agents);
}

/**
 * Factory function to shutdown the system
 */
export async function shutdownSystem(): Promise<void> {
  const initializer = SystemInitializer.getInstance();
  await initializer.shutdown();
}

/**
 * Get system configuration
 */
export function getSystemConfig(): Required<SystemConfig> {
  const initializer = SystemInitializer.getInstance();
  return initializer.getConfig();
}

/**
 * Check if system is initialized
 */
export function isSystemInitialized(): boolean {
  const initializer = SystemInitializer.getInstance();
  return initializer.isSystemInitialized();
}

// Export types
export type { SystemConfig, InitializationResult };

