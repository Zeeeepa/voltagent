"""
Thread pool manager for WiseFlow.

This module provides a thread pool manager for executing tasks concurrently.
It combines the best features of both original and new task management implementations.
"""

import os
import time
import asyncio
import logging
import uuid
import concurrent.futures
from typing import Dict, Any, Optional, Callable, List, Set, Union, Awaitable
from datetime import datetime
from enum import Enum, auto

from core.config import config
from core.consolidated.task_manager import TaskPriority, TaskStatus
from core.event_system import (
    EventType, Event, publish_sync,
    create_task_event
)
from core.utils.error_handling import handle_exceptions, TaskError

logger = logging.getLogger(__name__)

class ThreadPoolManager:
    """
    Thread pool manager for WiseFlow.
    
    This class provides a thread pool for executing CPU-bound tasks concurrently.
    It combines the best features of both original and new task management implementations.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Create a singleton instance."""
        if cls._instance is None:
            cls._instance = super(ThreadPoolManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(
        self,
        min_workers: int = None,
        max_workers: int = None,
        worker_timeout: float = 60.0
    ):
        """
        Initialize the thread pool manager.
        
        Args:
            min_workers: Minimum number of workers
            max_workers: Maximum number of workers
            worker_timeout: Timeout for idle workers in seconds
        """
        if self._initialized:
            return
            
        self.min_workers = min_workers or config.get("MIN_THREAD_WORKERS", os.cpu_count() or 2)
        self.max_workers = max_workers or config.get("MAX_THREAD_WORKERS", os.cpu_count() or 4)
        self.worker_timeout = worker_timeout
        
        # Ensure min_workers <= max_workers
        if self.min_workers > self.max_workers:
            logger.warning(f"min_workers ({self.min_workers}) > max_workers ({self.max_workers}), setting min_workers = max_workers")
            self.min_workers = self.max_workers
        
        # Initialize thread pool
        self.executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=self.max_workers,
            thread_name_prefix="wiseflow-worker"
        )
        
        # Task tracking
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.futures: Dict[str, concurrent.futures.Future] = {}
        
        # Metrics
        self.active_workers = 0
        self.queue_size = 0
        self.completed_tasks = 0
        self.failed_tasks = 0
        
        # Dynamic scaling
        self.current_worker_count = self.min_workers
        self.last_scale_time = datetime.now()
        self.scale_cooldown = 60.0  # seconds
        
        self._initialized = True
        
        logger.info(f"Thread pool manager initialized with {self.min_workers}-{self.max_workers} workers")
    
    def submit(
        self,
        func: Callable,
        *args,
        task_id: Optional[str] = None,
        name: str = "Unnamed Task",
        priority: TaskPriority = TaskPriority.NORMAL,
        **kwargs
    ) -> str:
        """
        Submit a task to the thread pool.
        
        Args:
            func: Function to execute
            *args: Arguments to pass to the function
            task_id: Optional task ID, if not provided a new one will be generated
            name: Name of the task
            priority: Priority of the task
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Task ID
        """
        task_id = task_id or str(uuid.uuid4())
        
        # Create task
        task = {
            "task_id": task_id,
            "name": name,
            "func": func,
            "args": args,
            "kwargs": kwargs,
            "priority": priority,
            "status": TaskStatus.PENDING,
            "created_at": datetime.now(),
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error": None
        }
        
        # Add task to manager
        self.tasks[task_id] = task
        
        # Submit task to executor
        future = self.executor.submit(func, *args, **kwargs)
        self.futures[task_id] = future
        
        # Update task status
        task["status"] = TaskStatus.RUNNING
        task["started_at"] = datetime.now()
        
        # Update metrics
        self.active_workers += 1
        
        # Add callback to handle completion
        future.add_done_callback(lambda f: self._handle_completion(task_id, f))
        
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
        
        logger.info(f"Task submitted to thread pool: {task_id} ({name})")
        return task_id
    
    def _handle_completion(self, task_id: str, future: concurrent.futures.Future):
        """
        Handle task completion.
        
        Args:
            task_id: ID of the task
            future: Future object for the task
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found")
            return
        
        try:
            # Get result
            result = future.result()
            
            # Update task
            task["status"] = TaskStatus.COMPLETED
            task["completed_at"] = datetime.now()
            task["result"] = result
            
            # Update metrics
            self.active_workers -= 1
            self.completed_tasks += 1
            
            # Publish event
            try:
                event = create_task_event(
                    EventType.TASK_COMPLETED,
                    task_id,
                    {"name": task["name"]}
                )
                publish_sync(event)
            except Exception as e:
                logger.warning(f"Failed to publish task completed event: {e}")
            
            logger.info(f"Task completed: {task_id} ({task['name']})")
        except Exception as e:
            # Update task
            task["status"] = TaskStatus.FAILED
            task["completed_at"] = datetime.now()
            task["error"] = str(e)
            
            # Update metrics
            self.active_workers -= 1
            self.failed_tasks += 1
            
            # Publish event
            try:
                event = create_task_event(
                    EventType.TASK_FAILED,
                    task_id,
                    {"name": task["name"], "error": str(e)}
                )
                publish_sync(event)
            except Exception as e:
                logger.warning(f"Failed to publish task failed event: {e}")
            
            logger.error(f"Task failed: {task_id} ({task['name']}): {e}")
    
    def cancel(self, task_id: str) -> bool:
        """
        Cancel a task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            True if the task was cancelled, False otherwise
        """
        future = self.futures.get(task_id)
        if not future:
            logger.warning(f"Task {task_id} not found")
            return False
        
        # Cancel future
        result = future.cancel()
        
        if result:
            # Update task
            task = self.tasks.get(task_id)
            if task:
                task["status"] = TaskStatus.CANCELLED
                task["completed_at"] = datetime.now()
                
                # Update metrics
                self.active_workers -= 1
                
                # Publish event
                try:
                    event = create_task_event(
                        EventType.TASK_CANCELLED,
                        task_id,
                        {"name": task["name"]}
                    )
                    publish_sync(event)
                except Exception as e:
                    logger.warning(f"Failed to publish task cancelled event: {e}")
                
                logger.info(f"Task cancelled: {task_id} ({task['name']})")
        
        return result
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a task by ID.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Task dictionary
        """
        return self.tasks.get(task_id)
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get metrics about the thread pool.
        
        Returns:
            Dictionary of metrics
        """
        return {
            "worker_count": self.current_worker_count,
            "min_workers": self.min_workers,
            "max_workers": self.max_workers,
            "active_workers": self.active_workers,
            "queue_size": self.queue_size,
            "completed_tasks": self.completed_tasks,
            "failed_tasks": self.failed_tasks,
            "total_tasks": len(self.tasks)
        }
    
    def adjust_pool_size(self, new_size: int) -> bool:
        """
        Adjust the thread pool size based on resource usage.
        
        Args:
            new_size: New pool size
            
        Returns:
            True if the pool size was adjusted, False otherwise
        """
        # Check if we're in cooldown period
        if (datetime.now() - self.last_scale_time).total_seconds() < self.scale_cooldown:
            logger.debug(f"Thread pool size adjustment in cooldown period")
            return False
        
        # Ensure new_size is within bounds
        new_size = max(self.min_workers, min(new_size, self.max_workers))
        
        # Check if size needs to be adjusted
        if new_size == self.current_worker_count:
            return False
        
        # Update current worker count
        self.current_worker_count = new_size
        
        # Update executor
        # Note: ThreadPoolExecutor doesn't support dynamic resizing,
        # so we need to create a new executor and transfer tasks
        old_executor = self.executor
        self.executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=new_size,
            thread_name_prefix="wiseflow-worker"
        )
        
        # Update last scale time
        self.last_scale_time = datetime.now()
        
        logger.info(f"Thread pool size adjusted to {new_size} workers")
        return True
    
    def stop(self):
        """Stop the thread pool."""
        # Cancel all pending tasks
        for task_id, future in list(self.futures.items()):
            if not future.done():
                future.cancel()
                
                # Update task
                task = self.tasks.get(task_id)
                if task:
                    task["status"] = TaskStatus.CANCELLED
                    task["completed_at"] = datetime.now()
        
        # Shutdown executor
        self.executor.shutdown(wait=False)
        
        logger.info("Thread pool stopped")

# Create a singleton instance
thread_pool_manager = ThreadPoolManager()

