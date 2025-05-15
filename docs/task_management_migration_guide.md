# WiseFlow Task Management Migration Guide

This guide provides instructions for migrating from the original or new task management implementations to the consolidated task management system.

## Overview

WiseFlow previously had two parallel task management implementations:

1. **Original Implementation (`run_task.py`)**:
   - Feature-rich with comprehensive resource monitoring
   - Advanced error handling and retry mechanisms
   - Task dependencies and priorities
   - Cross-source analysis capabilities

2. **New Implementation (`run_task_new.py`)**:
   - Modular, plugin-based architecture
   - Cleaner code organization
   - Better separation of concerns
   - More maintainable and extensible design

The consolidated task management system (`run_task_consolidated.py`) combines the best features of both implementations into a single, robust system with:

- Modular, plugin-based architecture
- Comprehensive resource monitoring and auto-shutdown
- Advanced error handling and retry mechanisms
- Task dependencies and priorities
- Cross-source analysis capabilities
- Better separation of concerns
- Improved code maintainability and extensibility

## Migration Steps

### 1. Update Imports

Replace imports from the original or new task management implementations with imports from the consolidated system:

**Original Implementation:**
```python
from core.imports import (
    TaskManager,
    TaskStatus,
    TaskPriority,
    ThreadPoolManager,
    ResourceMonitor
)
```

**New Implementation:**
```python
from core.task import AsyncTaskManager, Task, create_task_id
```

**Consolidated Implementation:**
```python
from core.consolidated import (
    TaskManager,
    Task,
    TaskStatus,
    TaskPriority,
    ThreadPoolManager,
    ResourceMonitor,
    PluginManager,
    TaskMonitor
)
```

### 2. Update Task Registration

#### Original Implementation:

```python
task_id = task_manager.register_task(
    name="Data Collection",
    func=process_data,
    args=(data,),
    priority=TaskPriority.HIGH,
    max_retries=2,
    retry_delay=60.0
)
```

#### New Implementation:

```python
task = Task(
    task_id=create_task_id(),
    focus_id=focus_id,
    function=process_data,
    args=(data,),
    auto_shutdown=auto_shutdown
)

await task_manager.submit_task(task)
```

#### Consolidated Implementation:

```python
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
```

### 3. Update Task Execution

#### Original Implementation:

```python
execution_id = task_manager.execute_task(task_id, wait=False)
```

#### New Implementation:

```python
await task_manager.submit_task(task)
```

#### Consolidated Implementation:

```python
execution_id = await task_manager.execute_task(task_id, wait=False)
```

### 4. Update Task Status Checking

#### Original Implementation:

```python
status = task_manager.get_task_status(task_id)
```

#### New Implementation:

```python
task = task_manager.get_task(task_id)
status = task.status
```

#### Consolidated Implementation:

```python
status = task_manager.get_task_status(task_id)
```

### 5. Update Task Cancellation

#### Original Implementation:

```python
success = task_manager.cancel_task(task_id)
```

#### New Implementation:

```python
await task_manager.cancel_task(task_id)
```

#### Consolidated Implementation:

```python
success = await task_manager.cancel_task(task_id)
```

### 6. Update Resource Monitoring

#### Original Implementation:

```python
resource_monitor.add_callback(resource_alert)
```

#### New Implementation:

Not directly available

#### Consolidated Implementation:

```python
resource_monitor.add_callback(resource_alert)
```

### 7. Update Plugin Management

#### Original Implementation:

Not directly available

#### New Implementation:

```python
plugins = plugin_manager.load_all_plugins()
plugin_manager.initialize_all_plugins(configs)
connector = plugin_manager.get_plugin("web_connector")
```

#### Consolidated Implementation:

```python
plugins = plugin_manager.load_all_plugins()
plugin_manager.initialize_all_plugins(configs)
connector = plugin_manager.get_plugin("web_connector")
```

## Running the Consolidated Task Management System

To use the consolidated task management system, run:

```bash
python -m core.run_task_consolidated
```

## Backward Compatibility

The consolidated task management system maintains backward compatibility with both original and new implementations through adapter classes and compatible APIs. However, it's recommended to migrate to the new consolidated API for better performance, maintainability, and access to all features.

## Common Migration Issues

### 1. Task Status Enum Values

The consolidated system uses a different `TaskStatus` enum. Make sure to update any code that checks task status values.

### 2. Async vs. Sync Functions

The consolidated system supports both synchronous and asynchronous functions. Make sure to use the appropriate execution method based on your function type.

### 3. Plugin System

If you've developed custom plugins for the new implementation, they should work with the consolidated system with minimal changes. Review the plugin interface documentation for any adjustments needed.

### 4. Configuration Changes

The consolidated system uses a unified configuration approach. Update your configuration files to use the new consolidated configuration format.

## Support

If you encounter any issues during migration, please contact the WiseFlow development team for assistance.

