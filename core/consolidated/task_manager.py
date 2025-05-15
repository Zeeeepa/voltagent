"""
Task management module for WiseFlow.

This module provides functionality to manage and execute tasks asynchronously.
It combines the best features of both original and new task management implementations.
"""

import os
import time
import asyncio
import logging
import uuid
from typing import Dict, Any, Optional, Callable, List, Set, Union, Awaitable, Tuple
from datetime import datetime
from enum import Enum, auto

from core.config import config
from core.event_system import (
    EventType, Event, publish_sync, publish,
    create_task_event
)
from core.utils.error_handling import handle_exceptions, TaskError

logger = logging.getLogger(__name__)

class TaskPriority(Enum):
    """Task priority levels."""
    LOW = auto()
    NORMAL = auto()
    HIGH = auto()
    CRITICAL = auto()

class TaskStatus(Enum):
    """Task status values."""
    PENDING = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()
    CANCELLED = auto()
    WAITING = auto()

class TaskDependencyError(Exception):
    """Error raised when a task dependency cannot be satisfied."""
    pass

def create_task_id() -> str:
    """Create a unique task ID."""
    return str(uuid.uuid4())

class Task:
    """
    Task class for the task manager.
    
    This class represents a task that can be executed asynchronously.
    """
    
    def __init__(
        self,
        task_id: str,
        name: str,
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        dependencies: List[str] = None,
        max_retries: int = 0,
        retry_delay: float = 1.0,
        timeout: Optional[float] = None,
        focus_id: Optional[str] = None,
        auto_shutdown: bool = False,
        description: Optional[str] = None,
        tags: List[str] = None
    ):
        """
        Initialize a task.
        
        Args:
            task_id: Unique identifier for the task
            name: Name of the task
            func: Function to execute
            args: Arguments to pass to the function
            kwargs: Keyword arguments to pass to the function
            priority: Priority of the task
            dependencies: List of task IDs that must complete before this task
            max_retries: Maximum number of retries if the task fails
            retry_delay: Delay in seconds between retries
            timeout: Timeout in seconds for the task
            focus_id: ID of the focus point associated with this task
            auto_shutdown: Whether to shut down the system after this task completes
            description: Description of the task
            tags: List of tags for the task
        """
        self.task_id = task_id
        self.name = name
        self.func = func
        self.args = args
        self.kwargs = kwargs or {}
        self.priority = priority
        self.dependencies = dependencies or []
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self.focus_id = focus_id
        self.auto_shutdown = auto_shutdown
        self.description = description or name
        self.tags = tags or []
        
        self.status = TaskStatus.PENDING
        self.result = None
        self.error = None
        self.created_at = datetime.now()
        self.started_at = None
        self.completed_at = None
        self.retry_count = 0
        self.task_object = None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the task to a dictionary.
        
        Returns:
            Dictionary representation of the task
        """
        return {
            "task_id": self.task_id,
            "name": self.name,
            "priority": self.priority.name,
            "status": self.status.name,
            "dependencies": self.dependencies,
            "focus_id": self.focus_id,
            "auto_shutdown": self.auto_shutdown,
            "description": self.description,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "error": str(self.error) if self.error else None
        }

class TaskManager:
    """
    Task manager for WiseFlow.
    
    This class provides functionality to manage and execute tasks asynchronously.
    It combines the best features of both original and new task management implementations.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Create a singleton instance."""
        if cls._instance is None:
            cls._instance = super(TaskManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, max_workers: int = None, plugin_manager = None):
        """
        Initialize the task manager.
        
        Args:
            max_workers: Maximum number of concurrent tasks
            plugin_manager: Plugin manager instance
        """
        if self._initialized:
            return
            
        # Import here to avoid circular imports
        from core.consolidated.thread_pool_manager import ThreadPoolManager
        
        self.max_workers = max_workers or config.get("MAX_CONCURRENT_TASKS", 4)
        self.plugin_manager = plugin_manager
        
        self.tasks: Dict[str, Task] = {}
        self.running_tasks: Set[str] = set()
        self.completed_tasks: Set[str] = set()
        self.failed_tasks: Set[str] = set()
        self.cancelled_tasks: Set[str] = set()
        self.waiting_tasks: Set[str] = set()
        
        self.task_lock = asyncio.Lock()
        self.is_running = False
        self.scheduler_task = None
        
        # Initialize thread pool manager
        self.thread_pool = ThreadPoolManager(max_workers=self.max_workers)
        
        self._initialized = True
        
        logger.info(f"Task manager initialized with {self.max_workers} workers")
    
    def register_task(
        self,
        name: str,
        func: Callable,
        *args,
        priority: TaskPriority = TaskPriority.NORMAL,
        dependencies: List[str] = None,
        max_retries: int = 0,
        retry_delay: float = 1.0,
        timeout: Optional[float] = None,
        focus_id: Optional[str] = None,
        auto_shutdown: bool = False,
        description: Optional[str] = None,
        tags: List[str] = None,
        task_id: Optional[str] = None,
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
            focus_id: ID of the focus point associated with this task
            auto_shutdown: Whether to shut down the system after this task completes
            description: Description of the task
            tags: List of tags for the task
            task_id: Optional task ID, if not provided a new one will be generated
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Task ID
        """
        task_id = task_id or create_task_id()
        
        # Check if dependencies exist
        if dependencies:
            for dep_id in dependencies:
                if dep_id not in self.tasks:
                    raise TaskDependencyError(f"Dependency {dep_id} does not exist")
        
        # Create task
        task = Task(
            task_id=task_id,
            name=name,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
            dependencies=dependencies,
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout,
            focus_id=focus_id,
            auto_shutdown=auto_shutdown,
            description=description,
            tags=tags
        )
        
        # Add task to manager
        self.tasks[task_id] = task
        
        # Add to waiting tasks if it has dependencies
        if dependencies:
            self.waiting_tasks.add(task_id)
            task.status = TaskStatus.WAITING
        
        # Publish event
        try:
            event = create_task_event(
                EventType.TASK_CREATED,
                task_id,
                {"name": name, "priority": priority.name}
            )
            publish_sync(event)
        except Exception as e:
            logger.warning(f"Failed to publish task created event: {e}")
        
        logger.info(f"Task registered: {task_id} ({name})")
        return task_id
    
    async def execute_task(self, task_id: str, wait: bool = False) -> Optional[Any]:
        """
        Execute a registered task.
        
        Args:
            task_id: ID of the task to execute
            wait: Whether to wait for the task to complete
            
        Returns:
            Task result if wait is True, otherwise execution ID
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return None
        
        # Check if task can be executed
        if task.status != TaskStatus.PENDING and task.status != TaskStatus.WAITING:
            logger.warning(f"Task {task_id} is not in a pending or waiting state")
            return None
        
        # Check if dependencies are satisfied
        for dep_id in task.dependencies:
            dep_task = self.tasks.get(dep_id)
            if not dep_task or dep_task.status != TaskStatus.COMPLETED:
                logger.warning(f"Task {task_id} has unsatisfied dependency {dep_id}")
                return None
        
        # Update task status
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now()
        self.running_tasks.add(task_id)
        
        # Remove from waiting tasks if it was waiting
        if task_id in self.waiting_tasks:
            self.waiting_tasks.remove(task_id)
        
        # Publish event
        try:
            event = create_task_event(
                EventType.TASK_STARTED,
                task_id,
                {"name": task.name}
            )
            await publish(event)
        except Exception as e:
            logger.warning(f"Failed to publish task started event: {e}")
        
        # Execute task
        execution_id = str(uuid.uuid4())
        
        if wait:
            # Execute synchronously
            try:
                result = await self._execute_task(task)
                return result
            except Exception as e:
                logger.error(f"Error executing task {task_id}: {e}")
                return None
        else:
            # Execute asynchronously
            asyncio.create_task(self._execute_task(task))
            return execution_id
    
    async def _execute_task(self, task: Task) -> Any:
        """
        Execute a task.
        
        Args:
            task: Task to execute
            
        Returns:
            Task result
        """
        logger.info(f"Executing task: {task.task_id} ({task.name})")
        
        try:
            # Check if the function is async
            if asyncio.iscoroutinefunction(task.func):
                # Execute async function
                result = await task.func(*task.args, **task.kwargs)
            else:
                # Execute sync function in thread pool
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: task.func(*task.args, **task.kwargs)
                )
            
            # Update task
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            task.result = result
            
            # Update task sets
            self.running_tasks.remove(task.task_id)
            self.completed_tasks.add(task.task_id)
            
            # Publish event
            try:
                event = create_task_event(
                    EventType.TASK_COMPLETED,
                    task.task_id,
                    {"name": task.name}
                )
                await publish(event)
            except Exception as e:
                logger.warning(f"Failed to publish task completed event: {e}")
            
            logger.info(f"Task completed: {task.task_id} ({task.name})")
            
            # Check for dependent tasks
            await self._check_dependent_tasks()
            
            # Check for auto-shutdown
            if task.auto_shutdown:
                logger.info(f"Auto-shutdown triggered by task: {task.task_id} ({task.name})")
                await self.shutdown()
            
            return result
        except Exception as e:
            # Update task
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            task.error = e
            task.retry_count += 1
            
            # Update task sets
            self.running_tasks.remove(task.task_id)
            self.failed_tasks.add(task.task_id)
            
            # Publish event
            try:
                event = create_task_event(
                    EventType.TASK_FAILED,
                    task.task_id,
                    {"name": task.name, "error": str(e)}
                )
                await publish(event)
            except Exception as e:
                logger.warning(f"Failed to publish task failed event: {e}")
            
            logger.error(f"Task failed: {task.task_id} ({task.name}): {e}")
            
            # Check if task should be retried
            if task.retry_count <= task.max_retries:
                logger.info(f"Retrying task: {task.task_id} ({task.name}), attempt {task.retry_count} of {task.max_retries}")
                
                # Schedule retry
                asyncio.create_task(self._retry_task(task))
            
            # Re-raise the exception
            raise
    
    async def _retry_task(self, task: Task):
        """
        Retry a failed task after a delay.
        
        Args:
            task: Task to retry
        """
        # Wait for retry delay
        await asyncio.sleep(task.retry_delay)
        
        # Reset task status
        task.status = TaskStatus.PENDING
        
        # Remove from failed tasks
        self.failed_tasks.remove(task.task_id)
        
        # Execute task
        await self.execute_task(task.task_id, wait=False)
    
    async def _check_dependent_tasks(self):
        """Check for tasks that are waiting on dependencies and execute them if ready."""
        for task_id in list(self.waiting_tasks):
            task = self.tasks.get(task_id)
            if not task:
                continue
            
            # Check if all dependencies are satisfied
            dependencies_satisfied = True
            for dep_id in task.dependencies:
                dep_task = self.tasks.get(dep_id)
                if not dep_task or dep_task.status != TaskStatus.COMPLETED:
                    dependencies_satisfied = False
                    break
            
            if dependencies_satisfied:
                # Execute task
                logger.info(f"Dependencies satisfied for task: {task_id} ({task.name})")
                await self.execute_task(task_id, wait=False)
    
    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            True if the task was cancelled, False otherwise
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return False
        
        # Check if task can be cancelled
        if task.status != TaskStatus.PENDING and task.status != TaskStatus.WAITING:
            logger.warning(f"Task {task_id} is not in a pending or waiting state")
            return False
        
        # Update task status
        task.status = TaskStatus.CANCELLED
        task.completed_at = datetime.now()
        
        # Update task sets
        if task_id in self.waiting_tasks:
            self.waiting_tasks.remove(task_id)
        self.cancelled_tasks.add(task_id)
        
        # Publish event
        try:
            event = create_task_event(
                EventType.TASK_CANCELLED,
                task_id,
                {"name": task.name}
            )
            await publish(event)
        except Exception as e:
            logger.warning(f"Failed to publish task cancelled event: {e}")
        
        logger.info(f"Task cancelled: {task_id} ({task.name})")
        return True
    
    def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        """
        Get the status of a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Task status
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return None
        
        return task.status
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """
        Get a task by ID.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Task object
        """
        return self.tasks.get(task_id)
    
    def get_tasks_by_focus(self, focus_id: str) -> List[Task]:
        """
        Get all tasks for a focus point.
        
        Args:
            focus_id: ID of the focus point
            
        Returns:
            List of tasks
        """
        return [task for task in self.tasks.values() if task.focus_id == focus_id]
    
    def get_tasks_by_status(self, status: TaskStatus) -> List[Task]:
        """
        Get all tasks with a specific status.
        
        Args:
            status: Task status
            
        Returns:
            List of tasks
        """
        return [task for task in self.tasks.values() if task.status == status]
    
    def get_tasks_by_tag(self, tag: str) -> List[Task]:
        """
        Get all tasks with a specific tag.
        
        Args:
            tag: Task tag
            
        Returns:
            List of tasks
        """
        return [task for task in self.tasks.values() if tag in task.tags]
    
    def get_all_tasks(self) -> List[Task]:
        """
        Get all tasks.
        
        Returns:
            List of tasks
        """
        return list(self.tasks.values())
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get metrics about the task manager.
        
        Returns:
            Dictionary of metrics
        """
        return {
            "total_tasks": len(self.tasks),
            "pending_tasks": len([t for t in self.tasks.values() if t.status == TaskStatus.PENDING]),
            "running_tasks": len(self.running_tasks),
            "completed_tasks": len(self.completed_tasks),
            "failed_tasks": len(self.failed_tasks),
            "cancelled_tasks": len(self.cancelled_tasks),
            "waiting_tasks": len(self.waiting_tasks),
            "thread_pool_metrics": self.thread_pool.get_metrics()
        }
    
    async def start(self):
        """Start the task manager."""
        if self.is_running:
            logger.warning("Task manager is already running")
            return
        
        self.is_running = True
        logger.info("Task manager started")
    
    async def stop(self):
        """Stop the task manager."""
        if not self.is_running:
            logger.warning("Task manager is not running")
            return
        
        self.is_running = False
        
        # Cancel scheduler task if it exists
        if self.scheduler_task:
            self.scheduler_task.cancel()
            self.scheduler_task = None
        
        logger.info("Task manager stopped")
    
    async def shutdown(self):
        """Shutdown the task manager and all related components."""
        await self.stop()
        
        # Shutdown thread pool
        self.thread_pool.stop()
        
        logger.info("Task manager shut down")

# Create a singleton instance
task_manager = TaskManager()

