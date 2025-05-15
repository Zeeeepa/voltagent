"""
Resource monitor for WiseFlow.

This module provides functionality to monitor system resources and adjust
task execution accordingly.
"""

import os
import time
import logging
import threading
import psutil
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime

logger = logging.getLogger(__name__)

class ResourceMonitor:
    """
    Resource monitor for WiseFlow.
    
    This class monitors system resources and provides feedback for optimization.
    It combines the best features of both original and new task management implementations.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Create a singleton instance."""
        if cls._instance is None:
            cls._instance = super(ResourceMonitor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(
        self,
        check_interval: float = 10.0,
        warning_threshold: float = 75.0,
        critical_threshold: float = 90.0
    ):
        """
        Initialize the resource monitor.
        
        Args:
            check_interval: Interval between resource checks in seconds
            warning_threshold: Threshold for warning alerts in percent
            critical_threshold: Threshold for critical alerts in percent
        """
        if self._initialized:
            return
            
        self.check_interval = check_interval
        self.thresholds = {
            "cpu": warning_threshold,
            "memory": warning_threshold,
            "cpu_critical": critical_threshold,
            "memory_critical": critical_threshold
        }
        
        self.callbacks = []
        self.monitor_thread = None
        self.stop_event = threading.Event()
        
        # Auto-shutdown settings
        self.auto_shutdown_enabled = False
        self.auto_shutdown_idle_time = 3600.0  # 1 hour
        self.last_activity_time = datetime.now()
        self.auto_shutdown_callback = None
        
        # Resource usage history
        self.history = {
            "cpu": [],
            "memory": [],
            "disk": [],
            "timestamp": []
        }
        self.history_size = 60  # Keep last 60 measurements
        
        self._initialized = True
        
        logger.info(f"Resource monitor initialized with check interval {check_interval}s")
    
    def start(self):
        """Start the resource monitor."""
        if self.monitor_thread and self.monitor_thread.is_alive():
            logger.warning("Resource monitor is already running")
            return
        
        self.stop_event.clear()
        self.monitor_thread = threading.Thread(
            target=self._monitor_resources,
            name="resource-monitor",
            daemon=True
        )
        self.monitor_thread.start()
        
        logger.info("Resource monitor started")
    
    def stop(self):
        """Stop the resource monitor."""
        if not self.monitor_thread or not self.monitor_thread.is_alive():
            logger.warning("Resource monitor is not running")
            return
        
        self.stop_event.set()
        self.monitor_thread.join(timeout=5.0)
        
        if self.monitor_thread.is_alive():
            logger.warning("Resource monitor thread did not stop gracefully")
        else:
            logger.info("Resource monitor stopped")
    
    def add_callback(self, callback: Callable[[str, float, float], None]):
        """
        Add a callback for resource alerts.
        
        Args:
            callback: Callback function that takes resource_type, current_value, and threshold
        """
        self.callbacks.append(callback)
        logger.debug(f"Added resource monitor callback: {callback.__name__}")
    
    def calculate_optimal_thread_count(self) -> int:
        """
        Calculate the optimal thread count based on resource usage.
        
        Returns:
            Optimal thread count
        """
        # Get current CPU and memory usage
        cpu_percent = psutil.cpu_percent()
        memory_percent = psutil.virtual_memory().percent
        
        # Get CPU count
        cpu_count = os.cpu_count() or 4
        
        # Calculate optimal thread count based on resource usage
        if cpu_percent > self.thresholds["cpu_critical"] or memory_percent > self.thresholds["memory_critical"]:
            # Critical resource usage, reduce to minimum
            return max(1, cpu_count // 4)
        elif cpu_percent > self.thresholds["cpu"] or memory_percent > self.thresholds["memory"]:
            # High resource usage, reduce threads
            return max(2, cpu_count // 2)
        else:
            # Normal resource usage, use all CPUs
            return cpu_count
    
    def record_activity(self):
        """Record system activity for auto-shutdown."""
        self.last_activity_time = datetime.now()
    
    def set_auto_shutdown(self, enabled: bool, idle_time: float = 3600.0, callback: Optional[Callable] = None):
        """
        Configure auto-shutdown settings.
        
        Args:
            enabled: Whether to enable auto-shutdown
            idle_time: Idle time before shutdown in seconds
            callback: Callback function to call on shutdown
        """
        self.auto_shutdown_enabled = enabled
        self.auto_shutdown_idle_time = idle_time
        
        if callback:
            self.auto_shutdown_callback = callback
        
        logger.info(f"Auto-shutdown {'enabled' if enabled else 'disabled'} with idle time {idle_time}s")
    
    def _monitor_resources(self):
        """Monitor system resources and trigger callbacks if thresholds are exceeded."""
        while not self.stop_event.is_set():
            try:
                # Get resource usage
                cpu_percent = psutil.cpu_percent()
                memory_percent = psutil.virtual_memory().percent
                disk_percent = psutil.disk_usage('/').percent
                
                # Add to history
                self.history["cpu"].append(cpu_percent)
                self.history["memory"].append(memory_percent)
                self.history["disk"].append(disk_percent)
                self.history["timestamp"].append(datetime.now())
                
                # Trim history if needed
                if len(self.history["cpu"]) > self.history_size:
                    self.history["cpu"] = self.history["cpu"][-self.history_size:]
                    self.history["memory"] = self.history["memory"][-self.history_size:]
                    self.history["disk"] = self.history["disk"][-self.history_size:]
                    self.history["timestamp"] = self.history["timestamp"][-self.history_size:]
                
                # Check thresholds and trigger callbacks
                if cpu_percent > self.thresholds["cpu_critical"]:
                    logger.warning(f"Critical CPU usage: {cpu_percent:.1f}% (threshold: {self.thresholds['cpu_critical']}%)")
                    for callback in self.callbacks:
                        try:
                            callback("cpu", cpu_percent, self.thresholds["cpu_critical"])
                        except Exception as e:
                            logger.error(f"Error in resource monitor callback: {e}")
                elif cpu_percent > self.thresholds["cpu"]:
                    logger.warning(f"High CPU usage: {cpu_percent:.1f}% (threshold: {self.thresholds['cpu']}%)")
                    for callback in self.callbacks:
                        try:
                            callback("cpu", cpu_percent, self.thresholds["cpu"])
                        except Exception as e:
                            logger.error(f"Error in resource monitor callback: {e}")
                
                if memory_percent > self.thresholds["memory_critical"]:
                    logger.warning(f"Critical memory usage: {memory_percent:.1f}% (threshold: {self.thresholds['memory_critical']}%)")
                    for callback in self.callbacks:
                        try:
                            callback("memory", memory_percent, self.thresholds["memory_critical"])
                        except Exception as e:
                            logger.error(f"Error in resource monitor callback: {e}")
                elif memory_percent > self.thresholds["memory"]:
                    logger.warning(f"High memory usage: {memory_percent:.1f}% (threshold: {self.thresholds['memory']}%)")
                    for callback in self.callbacks:
                        try:
                            callback("memory", memory_percent, self.thresholds["memory"])
                        except Exception as e:
                            logger.error(f"Error in resource monitor callback: {e}")
                
                # Check for auto-shutdown
                if self.auto_shutdown_enabled:
                    idle_time = (datetime.now() - self.last_activity_time).total_seconds()
                    
                    if idle_time > self.auto_shutdown_idle_time:
                        logger.info(f"System has been idle for {idle_time:.1f}s, triggering auto-shutdown")
                        
                        if self.auto_shutdown_callback:
                            try:
                                self.auto_shutdown_callback()
                            except Exception as e:
                                logger.error(f"Error in auto-shutdown callback: {e}")
                        
                        # Stop monitoring
                        return
                
                # Sleep until next check
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in resource monitor: {e}")
                time.sleep(self.check_interval)
    
    def get_resource_usage(self) -> Dict[str, float]:
        """
        Get current resource usage.
        
        Returns:
            Dictionary of resource usage
        """
        return {
            "cpu": psutil.cpu_percent(),
            "memory": psutil.virtual_memory().percent,
            "disk": psutil.disk_usage('/').percent
        }
    
    def get_resource_history(self) -> Dict[str, List]:
        """
        Get resource usage history.
        
        Returns:
            Dictionary of resource usage history
        """
        return self.history

# Create a singleton instance
resource_monitor = ResourceMonitor()

