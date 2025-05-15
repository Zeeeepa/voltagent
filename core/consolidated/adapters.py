"""
Adapters for backward compatibility with original and new task management implementations.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, Callable, List, Set, Union, Awaitable

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

logger = logging.getLogger(__name__)

class OriginalTaskManagerAdapter:
    """
    Adapter for backward compatibility with the original task manager.
    
    This adapter provides the same interface as the original task manager,
    but uses the consolidated task manager internally.
    """
    
    def __init__(self):
        """Initialize the adapter."""
        self.task_manager = TaskManager()
    
    def register_task(
        self,
        name: str,
        func: Callable,
        *args,
        priority: Any = None,
        dependencies: List[str] = None,
        max_retries: int = 0,
        retry_delay: float = 1.0,
        timeout: Optional[float] = None,
        **kwargs
    ) -> str:
        """
        Register a task with the task manager.
        
        Args:
            name: Name of the task
            func: Function to execute
            *args: Arguments to pass to the function
            priority: Priority of the task
            dependencies: List of task IDs that must complete before this task
            max_retries: Maximum number of retries if the task fails
            retry_delay: Delay in seconds between retries
            timeout: Timeout in seconds for the task
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Task ID
        """
        # Convert priority if needed
        if priority is not None and not isinstance(priority, TaskPriority):
            # Map original priority to consolidated priority
            priority_map = {
                1: TaskPriority.LOW,
                2: TaskPriority.NORMAL,
                3: TaskPriority.HIGH,
                4: TaskPriority.CRITICAL
            }
            priority = priority_map.get(priority, TaskPriority.NORMAL)
        else:
            priority = TaskPriority.NORMAL
        
        # Register task with consolidated task manager
        return self.task_manager.register_task(
            name=name,
            func=func,
            *args,
            priority=priority,
            dependencies=dependencies,
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout,
            **kwargs
        )
    
    def execute_task(self, task_id: str, wait: bool = False) -> Optional[Any]:
        """
        Execute a registered task.
        
        Args:
            task_id: ID of the task to execute
            wait: Whether to wait for the task to complete
            
        Returns:
            Task result if wait is True, otherwise execution ID
        """
        # Create event loop if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Execute task
        return loop.run_until_complete(self.task_manager.execute_task(task_id, wait=wait))
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            True if the task was cancelled, False otherwise
        """
        # Create event loop if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Cancel task
        return loop.run_until_complete(self.task_manager.cancel_task(task_id))
    
    def get_task_status(self, task_id: str) -> Optional[Any]:
        """
        Get the status of a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Task status
        """
        status = self.task_manager.get_task_status(task_id)
        
        # Convert status if needed
        if status is not None:
            # Map consolidated status to original status
            status_map = {
                TaskStatus.PENDING: "pending",
                TaskStatus.RUNNING: "running",
                TaskStatus.COMPLETED: "completed",
                TaskStatus.FAILED: "failed",
                TaskStatus.CANCELLED: "cancelled",
                TaskStatus.WAITING: "waiting"
            }
            return status_map.get(status, str(status))
        
        return None
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a task by ID.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Task dictionary
        """
        task = self.task_manager.get_task(task_id)
        if task:
            return task.to_dict()
        return None
    
    def get_all_tasks(self) -> List[Dict[str, Any]]:
        """
        Get all tasks.
        
        Returns:
            List of task dictionaries
        """
        return [task.to_dict() for task in self.task_manager.get_all_tasks()]
    
    def shutdown(self):
        """Shutdown the task manager."""
        # Create event loop if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Shutdown task manager
        loop.run_until_complete(self.task_manager.shutdown())

class NewTaskManagerAdapter:
    """
    Adapter for backward compatibility with the new task manager.
    
    This adapter provides the same interface as the new task manager,
    but uses the consolidated task manager internally.
    """
    
    def __init__(self, max_workers: int = None):
        """
        Initialize the adapter.
        
        Args:
            max_workers: Maximum number of concurrent tasks
        """
        self.task_manager = TaskManager(max_workers=max_workers)
    
    async def submit_task(self, task: Any) -> str:
        """
        Submit a task to the task manager.
        
        Args:
            task: Task to submit
            
        Returns:
            Task ID
        """
        # Extract task properties
        task_id = task.task_id
        focus_id = getattr(task, "focus_id", None)
        func = task.function if hasattr(task, "function") else task.func
        args = task.args if hasattr(task, "args") else ()
        auto_shutdown = getattr(task, "auto_shutdown", False)
        
        # Register task with consolidated task manager
        task_id = self.task_manager.register_task(
            name=f"Task {task_id}",
            func=func,
            *args,
            focus_id=focus_id,
            auto_shutdown=auto_shutdown,
            task_id=task_id
        )
        
        # Execute task
        await self.task_manager.execute_task(task_id, wait=False)
        
        return task_id
    
    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            True if the task was cancelled, False otherwise
        """
        return await self.task_manager.cancel_task(task_id)
    
    def get_task(self, task_id: str) -> Optional[Any]:
        """
        Get a task by ID.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Task object
        """
        return self.task_manager.get_task(task_id)
    
    def get_tasks_by_focus(self, focus_id: str) -> List[Any]:
        """
        Get all tasks for a focus point.
        
        Args:
            focus_id: ID of the focus point
            
        Returns:
            List of tasks
        """
        return self.task_manager.get_tasks_by_focus(focus_id)
    
    async def shutdown(self):
        """Shutdown the task manager."""
        await self.task_manager.shutdown()

# Create singleton instances
original_task_manager_adapter = OriginalTaskManagerAdapter()
new_task_manager_adapter = NewTaskManagerAdapter()

