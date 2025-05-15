# WiseFlow Consolidated Task Management System

This module provides a unified task management system for WiseFlow that combines the best features of both original and new task management implementations.

## Overview

The consolidated task management system provides:

- Modular, plugin-based architecture
- Comprehensive resource monitoring and auto-shutdown
- Advanced error handling and retry mechanisms
- Task dependencies and priorities
- Cross-source analysis capabilities
- Better separation of concerns
- Improved code maintainability and extensibility

## Components

### TaskManager

The `TaskManager` is the central component for task management, providing functionality to register, execute, and monitor tasks.

```python
from core.consolidated import TaskManager

# Get singleton instance
task_manager = TaskManager()

# Register a task
task_id = task_manager.register_task(
    name="Data Collection",
    func=process_data,
    data,
    priority=TaskPriority.HIGH,
    max_retries=2,
    retry_delay=60.0,
    focus_id=focus_id,
    auto_shutdown=auto_shutdown,
    description="Process data for analysis",
    tags=["data_collection", focus_id]
)

# Execute a task
execution_id = await task_manager.execute_task(task_id, wait=False)

# Get task status
status = task_manager.get_task_status(task_id)

# Cancel a task
success = await task_manager.cancel_task(task_id)
```

### ThreadPoolManager

The `ThreadPoolManager` handles concurrent task execution with dynamic resource allocation.

```python
from core.consolidated import ThreadPoolManager

# Get singleton instance
thread_pool = ThreadPoolManager()

# Submit a task
task_id = thread_pool.submit(
    func=process_data,
    data,
    name="Process Data",
    priority=TaskPriority.HIGH
)

# Cancel a task
success = thread_pool.cancel(task_id)

# Get metrics
metrics = thread_pool.get_metrics()

# Adjust pool size
thread_pool.adjust_pool_size(8)
```

### ResourceMonitor

The `ResourceMonitor` tracks system resources and provides feedback for optimization.

```python
from core.consolidated import ResourceMonitor

# Get singleton instance
resource_monitor = ResourceMonitor()

# Add a callback for resource alerts
resource_monitor.add_callback(resource_alert)

# Calculate optimal thread count
optimal_count = resource_monitor.calculate_optimal_thread_count()

# Record activity
resource_monitor.record_activity()

# Configure auto-shutdown
resource_monitor.set_auto_shutdown(True, 3600.0, shutdown_callback)
```

### PluginManager

The `PluginManager` handles plugin loading, initialization, and management.

```python
from core.consolidated import PluginManager

# Get singleton instance
plugin_manager = PluginManager()

# Load all plugins
plugins = plugin_manager.load_all_plugins()

# Initialize plugins
results = plugin_manager.initialize_all_plugins(configs)

# Get a plugin
connector = plugin_manager.get_plugin("web_connector")

# Register a plugin
plugin_manager.register_plugin("custom_plugin", custom_plugin)
```

### TaskMonitor

The `TaskMonitor` tracks task status, progress, and performance metrics.

```python
from core.consolidated import TaskMonitor

# Get singleton instance
task_monitor = TaskMonitor()

# Register a task
monitor_id = task_monitor.register_task(
    task_id=task_id,
    task_type="data_processing",
    description="Process customer data",
    metadata={"source": "customer_db", "priority": "high"}
)

# Update task progress
task_monitor.update_task_progress(task_id, 0.5, "Processed 50% of records")

# Complete a task
task_monitor.complete_task(task_id, result={"processed": 100, "errors": 0})

# Fail a task
task_monitor.fail_task(task_id, error="Database connection error")

# Get task information
task_info = task_monitor.get_task_info(task_id)
```

## Usage

To use the consolidated task management system, run:

```bash
python -m core.run_task_consolidated
```

## Migration

For instructions on migrating from the original or new task management implementations to the consolidated system, see the [Task Management Migration Guide](../../docs/task_management_migration_guide.md).

## Development

### Creating Plugins

To create a plugin for the consolidated task management system:

1. Create a new class that inherits from `PluginBase`
2. Implement the required methods: `initialize()` and `shutdown()`
3. Place the plugin in the plugins directory
4. Register the plugin with the plugin manager

Example:

```python
from core.consolidated.plugin_manager import PluginBase

class CustomPlugin(PluginBase):
    def __init__(self):
        super().__init__("custom_plugin", "1.0.0")
        
    def initialize(self, config):
        # Initialize the plugin
        return True
        
    def shutdown(self):
        # Shutdown the plugin
        return True
        
    def process(self, data):
        # Process data
        return processed_data
```

### Adding Task Types

To add a new task type:

1. Create a new function to handle the task
2. Register the function with the task manager
3. Update the task scheduler to use the new task type

Example:

```python
async def process_custom_data(data):
    # Process custom data
    return result

# Register the task
task_id = task_manager.register_task(
    name="Custom Data Processing",
    func=process_custom_data,
    data,
    priority=TaskPriority.NORMAL,
    description="Process custom data",
    tags=["custom_processing"]
)
```

## Testing

To run tests for the consolidated task management system:

```bash
python -m unittest discover -s tests/consolidated
```

