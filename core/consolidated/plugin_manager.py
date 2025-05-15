"""
Plugin manager for WiseFlow.

This module provides functionality to manage plugins for data collection,
processing, and analysis.
"""

import os
import sys
import importlib
import inspect
import logging
from typing import Dict, Any, Optional, List, Type, Union, Callable

logger = logging.getLogger(__name__)

class PluginBase:
    """Base class for all plugins."""
    
    def __init__(self, name: str, version: str):
        """
        Initialize the plugin.
        
        Args:
            name: Name of the plugin
            version: Version of the plugin
        """
        self.name = name
        self.version = version
        self.initialized = False
    
    def initialize(self, config: Dict[str, Any]) -> bool:
        """
        Initialize the plugin with configuration.
        
        Args:
            config: Configuration dictionary
            
        Returns:
            True if initialization was successful, False otherwise
        """
        raise NotImplementedError("Subclasses must implement initialize()")
    
    def shutdown(self) -> bool:
        """
        Shutdown the plugin.
        
        Returns:
            True if shutdown was successful, False otherwise
        """
        raise NotImplementedError("Subclasses must implement shutdown()")

class PluginManager:
    """
    Plugin manager for WiseFlow.
    
    This class manages plugins for data collection, processing, and analysis.
    It combines the best features of both original and new task management implementations.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Create a singleton instance."""
        if cls._instance is None:
            cls._instance = super(PluginManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, plugins_dir: str = "plugins"):
        """
        Initialize the plugin manager.
        
        Args:
            plugins_dir: Directory containing plugins
        """
        if self._initialized:
            return
            
        self.plugins_dir = plugins_dir
        self.plugins: Dict[str, PluginBase] = {}
        self.plugin_modules: Dict[str, Any] = {}
        
        self._initialized = True
        
        logger.info(f"Plugin manager initialized with plugins directory: {plugins_dir}")
    
    def load_all_plugins(self) -> Dict[str, PluginBase]:
        """
        Load all plugins from the plugins directory.
        
        Returns:
            Dictionary of loaded plugins
        """
        # Ensure plugins directory exists
        if not os.path.exists(self.plugins_dir):
            logger.warning(f"Plugins directory {self.plugins_dir} does not exist")
            return {}
        
        # Add plugins directory to path if not already there
        if self.plugins_dir not in sys.path:
            sys.path.append(self.plugins_dir)
        
        # Find all potential plugin modules
        plugin_files = []
        for root, dirs, files in os.walk(self.plugins_dir):
            for file in files:
                if file.endswith(".py") and not file.startswith("__"):
                    # Convert path to module name
                    rel_path = os.path.relpath(os.path.join(root, file), os.path.dirname(self.plugins_dir))
                    module_name = os.path.splitext(rel_path)[0].replace(os.path.sep, ".")
                    plugin_files.append(module_name)
        
        # Load each plugin module
        for module_name in plugin_files:
            try:
                module = importlib.import_module(module_name)
                self.plugin_modules[module_name] = module
                
                # Find plugin classes in the module
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, PluginBase) and 
                        obj is not PluginBase):
                        try:
                            # Instantiate the plugin
                            plugin = obj()
                            self.plugins[plugin.name] = plugin
                            logger.info(f"Loaded plugin: {plugin.name} (version {plugin.version})")
                        except Exception as e:
                            logger.error(f"Error instantiating plugin {name} from module {module_name}: {e}")
            except Exception as e:
                logger.error(f"Error loading plugin module {module_name}: {e}")
        
        logger.info(f"Loaded {len(self.plugins)} plugins")
        return self.plugins
    
    def initialize_all_plugins(self, configs: Optional[Dict[str, Dict[str, Any]]] = None) -> Dict[str, bool]:
        """
        Initialize all loaded plugins with configurations.
        
        Args:
            configs: Dictionary of plugin configurations
            
        Returns:
            Dictionary of plugin initialization results
        """
        configs = configs or {}
        results = {}
        
        for name, plugin in self.plugins.items():
            try:
                config = configs.get(name, {})
                success = plugin.initialize(config)
                results[name] = success
                
                if success:
                    plugin.initialized = True
                    logger.info(f"Initialized plugin: {name}")
                else:
                    logger.warning(f"Failed to initialize plugin: {name}")
            except Exception as e:
                logger.error(f"Error initializing plugin {name}: {e}")
                results[name] = False
        
        return results
    
    def get_plugin(self, name: str) -> Optional[PluginBase]:
        """
        Get a plugin by name.
        
        Args:
            name: Name of the plugin
            
        Returns:
            Plugin instance or None if not found
        """
        return self.plugins.get(name)
    
    def register_plugin(self, name: str, plugin: PluginBase) -> bool:
        """
        Register a plugin with the manager.
        
        Args:
            name: Name of the plugin
            plugin: Plugin instance
            
        Returns:
            True if registration was successful, False otherwise
        """
        if name in self.plugins:
            logger.warning(f"Plugin {name} already registered")
            return False
        
        self.plugins[name] = plugin
        logger.info(f"Registered plugin: {name} (version {plugin.version})")
        return True
    
    def unregister_plugin(self, name: str) -> bool:
        """
        Unregister a plugin from the manager.
        
        Args:
            name: Name of the plugin
            
        Returns:
            True if unregistration was successful, False otherwise
        """
        if name not in self.plugins:
            logger.warning(f"Plugin {name} not registered")
            return False
        
        plugin = self.plugins[name]
        
        # Shutdown plugin if initialized
        if plugin.initialized:
            try:
                plugin.shutdown()
            except Exception as e:
                logger.error(f"Error shutting down plugin {name}: {e}")
        
        # Remove plugin
        del self.plugins[name]
        logger.info(f"Unregistered plugin: {name}")
        return True
    
    def get_plugins_by_type(self, plugin_type: Type) -> Dict[str, PluginBase]:
        """
        Get all plugins of a specific type.
        
        Args:
            plugin_type: Type of plugins to get
            
        Returns:
            Dictionary of plugins of the specified type
        """
        return {name: plugin for name, plugin in self.plugins.items() if isinstance(plugin, plugin_type)}
    
    def get_all_plugins(self) -> Dict[str, PluginBase]:
        """
        Get all registered plugins.
        
        Returns:
            Dictionary of all plugins
        """
        return self.plugins.copy()
    
    def shutdown_all_plugins(self) -> Dict[str, bool]:
        """
        Shutdown all initialized plugins.
        
        Returns:
            Dictionary of plugin shutdown results
        """
        results = {}
        
        for name, plugin in self.plugins.items():
            if plugin.initialized:
                try:
                    success = plugin.shutdown()
                    results[name] = success
                    
                    if success:
                        plugin.initialized = False
                        logger.info(f"Shut down plugin: {name}")
                    else:
                        logger.warning(f"Failed to shut down plugin: {name}")
                except Exception as e:
                    logger.error(f"Error shutting down plugin {name}: {e}")
                    results[name] = False
            else:
                results[name] = True  # Not initialized, so no need to shut down
        
        return results

# Create a singleton instance
plugin_manager = PluginManager()

