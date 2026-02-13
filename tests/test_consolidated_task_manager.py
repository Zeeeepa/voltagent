#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Tests for the consolidated task management system.
"""

import os
import sys
import unittest
import asyncio
import time
from unittest.mock import MagicMock, patch
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

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

class TestConsolidatedTaskManager(unittest.TestCase):
    """Tests for the consolidated task management system."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Reset singletons
        TaskManager._instance = None
        ThreadPoolManager._instance = None
        ResourceMonitor._instance = None
        PluginManager._instance = None
        TaskMonitor._instance = None
        
        # Create instances
        self.task_manager = TaskManager()
        self.thread_pool = ThreadPoolManager()
        self.resource_monitor = ResourceMonitor()
        self.plugin_manager = PluginManager()
        self.task_monitor = TaskMonitor()
        
    def tearDown(self):
        """Tear down test fixtures."""
        pass
    
    def test_task_creation(self):
        """Test task creation."""
        # Create a task
        task = Task(
            task_id="test-task",
            name="Test Task",
            func=lambda: "Hello, World!",
            priority=TaskPriority.NORMAL,
            description="Test task description",
            tags=["test"]
        )
        
        # Check task properties
        self.assertEqual(task.task_id, "test-task")
        self.assertEqual(task.name, "Test Task")
        self.assertEqual(task.priority, TaskPriority.NORMAL)
        self.assertEqual(task.status, TaskStatus.PENDING)
        self.assertEqual(task.description, "Test task description")
        self.assertEqual(task.tags, ["test"])
        
    def test_task_registration(self):
        """Test task registration."""
        # Register a task
        task_id = self.task_manager.register_task(
            name="Test Task",
            func=lambda: "Hello, World!",
            priority=TaskPriority.NORMAL,
            description="Test task description",
            tags=["test"]
        )
        
        # Check task registration
        self.assertIsNotNone(task_id)
        self.assertIn(task_id, self.task_manager.tasks)
        
        # Get task
        task = self.task_manager.get_task(task_id)
        self.assertEqual(task.name, "Test Task")
        self.assertEqual(task.priority, TaskPriority.NORMAL)
        self.assertEqual(task.status, TaskStatus.PENDING)
        self.assertEqual(task.description, "Test task description")
        self.assertEqual(task.tags, ["test"])
    
    def test_task_execution_sync(self):
        """Test synchronous task execution."""
        # Define a test function
        def test_func():
            return "Hello, World!"
        
        # Register a task
        task_id = self.task_manager.register_task(
            name="Test Task",
            func=test_func
        )
        
        # Execute the task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(self.task_manager.execute_task(task_id, wait=True))
            self.assertEqual(result, "Hello, World!")
            
            # Check task status
            task = self.task_manager.get_task(task_id)
            self.assertEqual(task.status, TaskStatus.COMPLETED)
            self.assertEqual(task.result, "Hello, World!")
        finally:
            loop.close()
    
    def test_task_execution_async(self):
        """Test asynchronous task execution."""
        # Define a test function
        async def test_func():
            return "Hello, World!"
        
        # Register a task
        task_id = self.task_manager.register_task(
            name="Test Task",
            func=test_func
        )
        
        # Execute the task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(self.task_manager.execute_task(task_id, wait=True))
            self.assertEqual(result, "Hello, World!")
            
            # Check task status
            task = self.task_manager.get_task(task_id)
            self.assertEqual(task.status, TaskStatus.COMPLETED)
            self.assertEqual(task.result, "Hello, World!")
        finally:
            loop.close()
    
    def test_task_dependencies(self):
        """Test task dependencies."""
        # Define test functions
        def task1_func():
            return "Task 1"
        
        def task2_func():
            return "Task 2"
        
        # Register tasks
        task1_id = self.task_manager.register_task(
            name="Task 1",
            func=task1_func
        )
        
        task2_id = self.task_manager.register_task(
            name="Task 2",
            func=task2_func,
            dependencies=[task1_id]
        )
        
        # Check task status
        task2 = self.task_manager.get_task(task2_id)
        self.assertEqual(task2.status, TaskStatus.WAITING)
        self.assertIn(task2_id, self.task_manager.waiting_tasks)
        
        # Execute task 1
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Execute task 1
            loop.run_until_complete(self.task_manager.execute_task(task1_id, wait=True))
            
            # Check task 1 status
            task1 = self.task_manager.get_task(task1_id)
            self.assertEqual(task1.status, TaskStatus.COMPLETED)
            
            # Check if task 2 is automatically executed
            loop.run_until_complete(asyncio.sleep(0.1))  # Give time for task 2 to start
            
            # Check task 2 status
            task2 = self.task_manager.get_task(task2_id)
            self.assertNotEqual(task2.status, TaskStatus.WAITING)
        finally:
            loop.close()
    
    def test_task_cancellation(self):
        """Test task cancellation."""
        # Define a test function
        def test_func():
            time.sleep(1)
            return "Hello, World!"
        
        # Register a task
        task_id = self.task_manager.register_task(
            name="Test Task",
            func=test_func
        )
        
        # Cancel the task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            success = loop.run_until_complete(self.task_manager.cancel_task(task_id))
            self.assertTrue(success)
            
            # Check task status
            task = self.task_manager.get_task(task_id)
            self.assertEqual(task.status, TaskStatus.CANCELLED)
        finally:
            loop.close()
    
    def test_task_retry(self):
        """Test task retry."""
        # Define a test function that fails on first attempt
        self.attempt = 0
        def test_func():
            self.attempt += 1
            if self.attempt == 1:
                raise ValueError("Test error")
            return "Success"
        
        # Register a task with retry
        task_id = self.task_manager.register_task(
            name="Test Task",
            func=test_func,
            max_retries=1,
            retry_delay=0.1
        )
        
        # Execute the task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Execute task
            with self.assertRaises(ValueError):
                loop.run_until_complete(self.task_manager.execute_task(task_id, wait=True))
            
            # Check task status
            task = self.task_manager.get_task(task_id)
            self.assertEqual(task.status, TaskStatus.FAILED)
            self.assertEqual(task.retry_count, 1)
            
            # Wait for retry
            loop.run_until_complete(asyncio.sleep(0.2))
            
            # Check task status after retry
            task = self.task_manager.get_task(task_id)
            self.assertEqual(task.status, TaskStatus.COMPLETED)
            self.assertEqual(task.result, "Success")
        finally:
            loop.close()
    
    def test_thread_pool(self):
        """Test thread pool."""
        # Define a test function
        def test_func():
            return "Hello, World!"
        
        # Submit a task
        task_id = self.thread_pool.submit(
            func=test_func,
            name="Test Task"
        )
        
        # Check task submission
        self.assertIsNotNone(task_id)
        self.assertIn(task_id, self.thread_pool.tasks)
        
        # Wait for task completion
        time.sleep(0.1)
        
        # Check task status
        task = self.thread_pool.get_task(task_id)
        self.assertEqual(task["status"], TaskStatus.COMPLETED)
        self.assertEqual(task["result"], "Hello, World!")
    
    def test_resource_monitor(self):
        """Test resource monitor."""
        # Define a callback
        callback_called = False
        def callback(resource_type, current_value, threshold):
            nonlocal callback_called
            callback_called = True
        
        # Add callback
        self.resource_monitor.add_callback(callback)
        
        # Mock resource usage
        with patch('psutil.cpu_percent', return_value=90.0):
            with patch('psutil.virtual_memory', return_value=MagicMock(percent=90.0)):
                # Get resource usage
                usage = self.resource_monitor.get_resource_usage()
                self.assertEqual(usage["cpu"], 90.0)
                self.assertEqual(usage["memory"], 90.0)
                
                # Trigger resource check
                self.resource_monitor._monitor_resources()
                
                # Check if callback was called
                self.assertTrue(callback_called)
    
    def test_plugin_manager(self):
        """Test plugin manager."""
        # Create a mock plugin
        class MockPlugin:
            def __init__(self):
                self.name = "mock_plugin"
                self.version = "1.0.0"
                self.initialized = False
            
            def initialize(self, config):
                self.initialized = True
                return True
            
            def shutdown(self):
                self.initialized = False
                return True
        
        # Register plugin
        plugin = MockPlugin()
        success = self.plugin_manager.register_plugin("mock_plugin", plugin)
        self.assertTrue(success)
        
        # Get plugin
        retrieved_plugin = self.plugin_manager.get_plugin("mock_plugin")
        self.assertEqual(retrieved_plugin, plugin)
        
        # Initialize plugin
        results = self.plugin_manager.initialize_all_plugins()
        self.assertTrue(results["mock_plugin"])
        self.assertTrue(plugin.initialized)
        
        # Shutdown plugin
        results = self.plugin_manager.shutdown_all_plugins()
        self.assertTrue(results["mock_plugin"])
        self.assertFalse(plugin.initialized)
    
    def test_task_monitor(self):
        """Test task monitor."""
        # Register a task
        task_id = self.task_monitor.register_task(
            task_type="test",
            description="Test task",
            metadata={"key": "value"}
        )
        
        # Check task registration
        self.assertIsNotNone(task_id)
        task_info = self.task_monitor.get_task_info(task_id)
        self.assertEqual(task_info["task_type"], "test")
        self.assertEqual(task_info["description"], "Test task")
        self.assertEqual(task_info["metadata"], {"key": "value"})
        self.assertEqual(task_info["status"], TaskStatus.PENDING.value)
        
        # Start task
        success = self.task_monitor.start_task(task_id)
        self.assertTrue(success)
        task_info = self.task_monitor.get_task_info(task_id)
        self.assertEqual(task_info["status"], TaskStatus.RUNNING.value)
        
        # Update progress
        success = self.task_monitor.update_task_progress(task_id, 0.5, "Halfway there")
        self.assertTrue(success)
        task_info = self.task_monitor.get_task_info(task_id)
        self.assertEqual(task_info["progress"], 0.5)
        
        # Complete task
        success = self.task_monitor.complete_task(task_id, {"result": "success"})
        self.assertTrue(success)
        task_info = self.task_monitor.get_task_info(task_id)
        self.assertEqual(task_info["status"], TaskStatus.COMPLETED.value)
        self.assertEqual(task_info["result"], {"result": "success"})

if __name__ == '__main__':
    unittest.main()

