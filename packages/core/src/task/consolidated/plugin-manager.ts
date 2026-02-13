/**
 * Plugin interface
 */
export interface Plugin {
  id: string;
  name: string;
  version: string;
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
  [key: string]: any;
}

/**
 * Plugin registration options
 */
export interface PluginOptions {
  autoInitialize?: boolean;
  dependencies?: string[];
}

/**
 * Manages plugins for the task management system
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private initializedPlugins: Set<string> = new Set();

  /**
   * Registers a plugin
   * 
   * @param plugin The plugin to register
   * @param options Plugin registration options
   * @returns The registered plugin
   */
  registerPlugin(plugin: Plugin, options: PluginOptions = {}): Plugin {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID ${plugin.id} already registered`);
    }

    this.plugins.set(plugin.id, plugin);

    if (options.autoInitialize) {
      this.initializePlugin(plugin.id).catch(error => {
        console.error(`Failed to initialize plugin ${plugin.id}:`, error);
      });
    }

    return plugin;
  }

  /**
   * Initializes a plugin
   * 
   * @param pluginId The ID of the plugin to initialize
   * @returns A promise that resolves when the plugin is initialized
   */
  async initializePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }

    if (this.initializedPlugins.has(pluginId)) {
      return; // Already initialized
    }

    // Initialize the plugin
    await plugin.initialize();
    this.initializedPlugins.add(pluginId);
  }

  /**
   * Unloads a plugin
   * 
   * @param pluginId The ID of the plugin to unload
   * @returns A promise that resolves when the plugin is unloaded
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }

    if (this.initializedPlugins.has(pluginId)) {
      await plugin.shutdown();
      this.initializedPlugins.delete(pluginId);
    }

    this.plugins.delete(pluginId);
  }

  /**
   * Unloads all plugins
   * 
   * @returns A promise that resolves when all plugins are unloaded
   */
  async unloadAll(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    for (const pluginId of this.initializedPlugins) {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        shutdownPromises.push(plugin.shutdown());
      }
    }

    await Promise.all(shutdownPromises);
    this.initializedPlugins.clear();
    this.plugins.clear();
  }

  /**
   * Gets a plugin by ID
   * 
   * @param pluginId The ID of the plugin to get
   * @returns The plugin, or undefined if not found
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Gets all registered plugins
   * 
   * @returns An array of all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Checks if a plugin is initialized
   * 
   * @param pluginId The ID of the plugin to check
   * @returns True if the plugin is initialized, false otherwise
   */
  isPluginInitialized(pluginId: string): boolean {
    return this.initializedPlugins.has(pluginId);
  }
}

