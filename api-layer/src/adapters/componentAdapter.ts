import { logger } from '../common/logger';

/**
 * Base interface for all component adapters
 */
export interface ComponentAdapter {
  /**
   * Get the name of the component
   */
  getName(): string;
  
  /**
   * Initialize the adapter
   */
  initialize(): Promise<void>;
  
  /**
   * Check if the component is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get the version of the component
   */
  getVersion(): Promise<string>;
}

/**
 * Abstract base class for component adapters
 */
export abstract class BaseComponentAdapter implements ComponentAdapter {
  protected name: string;
  protected initialized: boolean = false;
  
  constructor(name: string) {
    this.name = name;
  }
  
  getName(): string {
    return this.name;
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug(`Component adapter ${this.name} already initialized`);
      return;
    }
    
    try {
      await this.doInitialize();
      this.initialized = true;
      logger.info(`Component adapter ${this.name} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize component adapter ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Implementation-specific initialization
   */
  protected abstract doInitialize(): Promise<void>;
  
  abstract isAvailable(): Promise<boolean>;
  
  abstract getVersion(): Promise<string>;
}

/**
 * Registry for component adapters
 */
export class ComponentAdapterRegistry {
  private static instance: ComponentAdapterRegistry;
  private adapters: Map<string, ComponentAdapter> = new Map();
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ComponentAdapterRegistry {
    if (!ComponentAdapterRegistry.instance) {
      ComponentAdapterRegistry.instance = new ComponentAdapterRegistry();
    }
    
    return ComponentAdapterRegistry.instance;
  }
  
  /**
   * Register a component adapter
   */
  public register(adapter: ComponentAdapter): void {
    const name = adapter.getName();
    
    if (this.adapters.has(name)) {
      logger.warn(`Component adapter ${name} already registered, replacing`);
    }
    
    this.adapters.set(name, adapter);
    logger.info(`Component adapter ${name} registered`);
  }
  
  /**
   * Get a component adapter by name
   */
  public get<T extends ComponentAdapter>(name: string): T | undefined {
    return this.adapters.get(name) as T | undefined;
  }
  
  /**
   * Check if a component adapter is registered
   */
  public has(name: string): boolean {
    return this.adapters.has(name);
  }
  
  /**
   * Get all registered component adapters
   */
  public getAll(): ComponentAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * Initialize all registered component adapters
   */
  public async initializeAll(): Promise<void> {
    logger.info(`Initializing ${this.adapters.size} component adapters`);
    
    const promises = Array.from(this.adapters.values()).map(adapter => 
      adapter.initialize().catch(error => {
        logger.error(`Failed to initialize component adapter ${adapter.getName()}:`, error);
        return Promise.resolve(); // Continue with other adapters even if one fails
      })
    );
    
    await Promise.all(promises);
    logger.info('All component adapters initialized');
  }
}

