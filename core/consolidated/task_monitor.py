"""
Task monitor for tracking task execution and status.

This module provides functionality to monitor task execution and status.
It combines the best features of both original and new task management implementations.
"""

import os
import time
import logging
import json
import threading
from typing import Any, Dict, List, Optional, Union, Callable
from enum import Enum
import uuid
from datetime import datetime

from core.consolidated.resource_monitor import resource_monitor

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """Status of a task."""
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'

class TaskMonitor:
    """
    Monitor for tracking task execution and status.
    
    This class provides functionality to monitor task execution and status.
    It combines the best features of both original and new task management implementations.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Create a singleton instance."""
        if cls._instance is None:
            cls._instance = super(TaskMonitor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(
        self,
        log_dir: str = 'logs',
        auto_shutdown_on_complete: bool = False,
        auto_shutdown_idle_time: float = 1800.0,
        auto_shutdown_callback: Optional[Callable] = None
    ):
        """
        Initialize the task monitor.
        
        Args:
            log_dir: Directory for storing task logs
            auto_shutdown_on_complete: Whether to enable auto-shutdown when all tasks complete
            auto_shutdown_idle_time: Idle time before auto-shutdown in seconds
            auto_shutdown_callback: Callback function for auto-shutdown
        """
        if self._initialized:
            return
            
        self.log_dir = log_dir
        self.auto_shutdown_on_complete = auto_shutdown_on_complete
        self.auto_shutdown_idle_time = auto_shutdown_idle_time
        self.auto_shutdown_callback = auto_shutdown_callback
        
        # Create log directory if it doesn't exist
        os.makedirs(self.log_dir, exist_ok=True)
        
        # Task tracking
        self.tasks = {}  # task_id -> task_info
        self.tasks_lock = threading.RLock()
        
        # Configure resource monitor for auto-shutdown
        resource_monitor.set_auto_shutdown(
            auto_shutdown_on_complete,
            auto_shutdown_idle_time,
            auto_shutdown_callback
        )
        
        # Start resource monitor if not already running
        if not resource_monitor.monitor_thread or not resource_monitor.monitor_thread.is_alive():
            resource_monitor.start()
            
        self._initialized = True
        logger.info("TaskMonitor initialized")
        
    def register_task(
        self,
        task_id: Optional[str] = None,
        task_type: str = 'default',
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        focus_id: Optional[str] = None
    ) -> str:
        """
        Register a new task.
        
        Args:
            task_id: Unique identifier for the task (generated if not provided)
            task_type: Type of task
            description: Description of the task
            metadata: Additional metadata for the task
            focus_id: ID of the focus point associated with this task
            
        Returns:
            str: Task ID
        """
        task_id = task_id or str(uuid.uuid4())
        
        with self.tasks_lock:
            # Check if task already exists
            if task_id in self.tasks:
                logger.warning(f"Task {task_id} already registered")
                return task_id
                
            # Create task info
            task_info = {
                'task_id': task_id,
                'task_type': task_type,
                'description': description or '',
                'metadata': metadata or {},
                'focus_id': focus_id,
                'status': TaskStatus.PENDING.value,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'started_at': None,
                'completed_at': None,
                'progress': 0.0,
                'result': None,
                'error': None,
                'log_file': os.path.join(self.log_dir, f"{task_id}.log")
            }
            
            self.tasks[task_id] = task_info
            
            # Record activity
            resource_monitor.record_activity()
            
            logger.info(f"Registered task {task_id} of type {task_type}")
            
            return task_id
            
    def start_task(self, task_id: str) -> bool:
        """
        Mark a task as started.
        
        Args:
            task_id: Task ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        with self.tasks_lock:
            if task_id not in self.tasks:
                logger.error(f"Task {task_id} not found")
                return False
                
            task_info = self.tasks[task_id]
            
            if task_info['status'] != TaskStatus.PENDING.value:
                logger.warning(f"Task {task_id} already started or completed")
                return False
                
            # Update task info
            task_info['status'] = TaskStatus.RUNNING.value
            task_info['started_at'] = datetime.now().isoformat()
            task_info['updated_at'] = datetime.now().isoformat()
            
            # Record activity
            resource_monitor.record_activity()
            
            logger.info(f"Started task {task_id}")
            
            return True
            
    def update_task_progress(self, task_id: str, progress: float, message: Optional[str] = None) -> bool:
        """
        Update task progress.
        
        Args:
            task_id: Task ID
            progress: Progress value (0.0 to 1.0)
            message: Optional progress message
            
        Returns:
            bool: True if successful, False otherwise
        """
        with self.tasks_lock:
            if task_id not in self.tasks:
                logger.error(f"Task {task_id} not found")
                return False
                
            task_info = self.tasks[task_id]
            
            if task_info['status'] != TaskStatus.RUNNING.value:
                logger.warning(f"Task {task_id} not running")
                return False
                
            # Validate progress value
            progress = max(0.0, min(1.0, progress))
            
            # Update task info
            task_info['progress'] = progress
            task_info['updated_at'] = datetime.now().isoformat()
            
            # Log progress message if provided
            if message:
                self._log_task_message(task_id, f"Progress {progress:.1%}: {message}")
            
            # Record activity
            resource_monitor.record_activity()
            
            logger.debug(f"Updated task {task_id} progress to {progress:.1%}")
            
            return True
            
    def complete_task(self, task_id: str, result: Any = None) -> bool:
        """
        Mark a task as completed.
        
        Args:
            task_id: Task ID
            result: Optional task result
            
        Returns:
            bool: True if successful, False otherwise
        """
        with self.tasks_lock:
            if task_id not in self.tasks:
                logger.error(f"Task {task_id} not found")
                return False
                
            task_info = self.tasks[task_id]
            
            if task_info['status'] != TaskStatus.RUNNING.value:
                logger.warning(f"Task {task_id} not running")
                return False
                
            # Update task info
            task_info['status'] = TaskStatus.COMPLETED.value
            task_info['completed_at'] = datetime.now().isoformat()
            task_info['updated_at'] = datetime.now().isoformat()
            task_info['progress'] = 1.0
            task_info['result'] = result
            
            # Log completion
            self._log_task_message(task_id, f"Task completed successfully")
            
            # Record activity
            resource_monitor.record_activity()
            
            logger.info(f"Completed task {task_id}")
            
            # Check if all tasks are completed and auto-shutdown is enabled
            if self.auto_shutdown_on_complete:
                active_tasks = [t for t in self.tasks.values() if t['status'] in [TaskStatus.PENDING.value, TaskStatus.RUNNING.value]]
                
                if not active_tasks:
                    logger.info("All tasks completed, triggering auto-shutdown")
                    
                    if self.auto_shutdown_callback:
                        try:
                            self.auto_shutdown_callback()
                        except Exception as e:
                            logger.error(f"Error in auto-shutdown callback: {e}")
            
            return True
            
    def fail_task(self, task_id: str, error: Optional[Union[str, Exception]] = None) -> bool:
        """
        Mark a task as failed.
        
        Args:
            task_id: Task ID
            error: Optional error message or exception
            
        Returns:
            bool: True if successful, False otherwise
        """
        with self.tasks_lock:
            if task_id not in self.tasks:
                logger.error(f"Task {task_id} not found")
                return False
                
            task_info = self.tasks[task_id]
            
            # Update task info
            task_info['status'] = TaskStatus.FAILED.value
            task_info['completed_at'] = datetime.now().isoformat()
            task_info['updated_at'] = datetime.now().isoformat()
            
            if error:
                if isinstance(error, Exception):
                    task_info['error'] = str(error)
                else:
                    task_info['error'] = error
                    
                # Log error
                self._log_task_message(task_id, f"Task failed: {task_info['error']}")
            else:
                self._log_task_message(task_id, f"Task failed")
            
            # Record activity
            resource_monitor.record_activity()
            
            logger.error(f"Failed task {task_id}: {task_info['error'] if 'error' in task_info else 'Unknown error'}")
            
            return True
            
    def cancel_task(self, task_id: str) -> bool:
        """
        Mark a task as cancelled.
        
        Args:
            task_id: Task ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        with self.tasks_lock:
            if task_id not in self.tasks:
                logger.error(f"Task {task_id} not found")
                return False
                
            task_info = self.tasks[task_id]
            
            # Update task info
            task_info['status'] = TaskStatus.CANCELLED.value
            task_info['completed_at'] = datetime.now().isoformat()
            task_info['updated_at'] = datetime.now().isoformat()
            
            # Log cancellation
            self._log_task_message(task_id, f"Task cancelled")
            
            # Record activity
            resource_monitor.record_activity()
            
            logger.info(f"Cancelled task {task_id}")
            
            return True
            
    def get_task_info(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task information dictionary
        """
        with self.tasks_lock:
            return self.tasks.get(task_id)
            
    def get_all_tasks(self, status: Optional[Union[TaskStatus, str]] = None) -> List[Dict[str, Any]]:
        """
        Get all tasks, optionally filtered by status.
        
        Args:
            status: Optional status filter
            
        Returns:
            List of task information dictionaries
        """
        with self.tasks_lock:
            if status is None:
                return list(self.tasks.values())
                
            status_value = status.value if isinstance(status, TaskStatus) else status
            return [task for task in self.tasks.values() if task['status'] == status_value]
            
    def get_tasks_by_focus(self, focus_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a focus point.
        
        Args:
            focus_id: Focus point ID
            
        Returns:
            List of task information dictionaries
        """
        with self.tasks_lock:
            return [task for task in self.tasks.values() if task.get('focus_id') == focus_id]
            
    def get_task_log(self, task_id: str) -> Optional[str]:
        """
        Get the log for a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task log content
        """
        with self.tasks_lock:
            if task_id not in self.tasks:
                logger.error(f"Task {task_id} not found")
                return None
                
            task_info = self.tasks[task_id]
            log_file = task_info['log_file']
            
            if not os.path.exists(log_file):
                return ""
                
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading task log file {log_file}: {e}")
                return None
                
    def _log_task_message(self, task_id: str, message: str):
        """
        Log a message for a task.
        
        Args:
            task_id: Task ID
            message: Message to log
        """
        task_info = self.tasks.get(task_id)
        if not task_info:
            return
            
        log_file = task_info['log_file']
        timestamp = datetime.now().isoformat()
        
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"[{timestamp}] {message}\n")
        except Exception as e:
            logger.error(f"Error writing to task log file {log_file}: {e}")
            
    def clear_completed_tasks(self, older_than_days: Optional[int] = None) -> int:
        """
        Clear completed, failed, and cancelled tasks.
        
        Args:
            older_than_days: Only clear tasks older than this many days
            
        Returns:
            Number of tasks cleared
        """
        with self.tasks_lock:
            to_clear = []
            now = datetime.now()
            
            for task_id, task_info in self.tasks.items():
                if task_info['status'] not in [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value, TaskStatus.CANCELLED.value]:
                    continue
                    
                if older_than_days is not None:
                    completed_at = datetime.fromisoformat(task_info['completed_at'])
                    days_old = (now - completed_at).days
                    
                    if days_old < older_than_days:
                        continue
                        
                to_clear.append(task_id)
                
            # Clear tasks
            for task_id in to_clear:
                del self.tasks[task_id]
                
            logger.info(f"Cleared {len(to_clear)} completed tasks")
            return len(to_clear)
            
    def export_task_history(self, file_path: str) -> bool:
        """
        Export task history to a JSON file.
        
        Args:
            file_path: Path to export file
            
        Returns:
            True if successful, False otherwise
        """
        with self.tasks_lock:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(self.tasks, f, indent=2)
                    
                logger.info(f"Exported task history to {file_path}")
                return True
            except Exception as e:
                logger.error(f"Error exporting task history to {file_path}: {e}")
                return False

# Create a singleton instance
task_monitor = TaskMonitor()

