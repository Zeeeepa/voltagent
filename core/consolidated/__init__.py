"""
Consolidated task management system for WiseFlow.

This module provides a unified task management system that combines the best features
of the original and new task management implementations.
"""

from core.consolidated.task_manager import TaskManager, Task, TaskStatus, TaskPriority
from core.consolidated.thread_pool_manager import ThreadPoolManager
from core.consolidated.resource_monitor import ResourceMonitor
from core.consolidated.plugin_manager import PluginManager
from core.consolidated.task_monitor import TaskMonitor

__all__ = [
    'TaskManager',
    'Task',
    'TaskStatus',
    'TaskPriority',
    'ThreadPoolManager',
    'ResourceMonitor',
    'PluginManager',
    'TaskMonitor'
]

