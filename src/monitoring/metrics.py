"""
Resource Monitoring Metrics Module

This module implements the metrics collection and monitoring capabilities
for the Resource Management System. It provides tools to track resource
utilization, detect bottlenecks, and generate performance insights.
"""

from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass, field
import time
import statistics
from datetime import datetime, timedelta

from ..models import Resource, ResourceType


class MetricType(Enum):
    """Enumeration of supported metric types."""
    UTILIZATION = "utilization"
    ALLOCATION_RATE = "allocation_rate"
    CONTENTION_RATE = "contention_rate"
    WAIT_TIME = "wait_time"
    THROUGHPUT = "throughput"
    EFFICIENCY = "efficiency"
    CUSTOM = "custom"


@dataclass
class MetricValue:
    """Represents a single metric value with timestamp."""
    value: float
    timestamp: float = field(default_factory=time.time)
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class MetricSeries:
    """Represents a time series of metric values."""
    name: str
    type: MetricType
    unit: str
    description: str
    values: List[MetricValue] = field(default_factory=list)
    max_history: int = 1000  # Maximum number of values to keep
    
    def add_value(self, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """
        Add a new value to the metric series.
        
        Args:
            value: The metric value to add
            labels: Optional labels to associate with the value
        """
        if labels is None:
            labels = {}
            
        metric_value = MetricValue(value=value, timestamp=time.time(), labels=labels)
        self.values.append(metric_value)
        
        # Trim history if needed
        if len(self.values) > self.max_history:
            self.values = self.values[-self.max_history:]
            
    def get_latest_value(self) -> Optional[MetricValue]:
        """Get the most recent metric value."""
        if not self.values:
            return None
        return self.values[-1]
        
    def get_average(self, time_window_seconds: Optional[float] = None) -> Optional[float]:
        """
        Calculate the average value over a time window.
        
        Args:
            time_window_seconds: Optional time window in seconds (None for all values)
            
        Returns:
            float: The calculated average, or None if no values
        """
        if not self.values:
            return None
            
        if time_window_seconds is None:
            # Use all values
            values_to_average = [v.value for v in self.values]
        else:
            # Filter values within the time window
            cutoff_time = time.time() - time_window_seconds
            values_to_average = [v.value for v in self.values if v.timestamp >= cutoff_time]
            
        if not values_to_average:
            return None
            
        return statistics.mean(values_to_average)
        
    def get_percentile(
        self,
        percentile: float,
        time_window_seconds: Optional[float] = None
    ) -> Optional[float]:
        """
        Calculate a percentile value over a time window.
        
        Args:
            percentile: The percentile to calculate (0-100)
            time_window_seconds: Optional time window in seconds (None for all values)
            
        Returns:
            float: The calculated percentile, or None if no values
        """
        if not self.values:
            return None
            
        if time_window_seconds is None:
            # Use all values
            values_to_use = [v.value for v in self.values]
        else:
            # Filter values within the time window
            cutoff_time = time.time() - time_window_seconds
            values_to_use = [v.value for v in self.values if v.timestamp >= cutoff_time]
            
        if not values_to_use:
            return None
            
        return statistics.quantiles(values_to_use, n=100)[int(percentile) - 1]


class MetricsCollector:
    """
    Collects and manages resource utilization metrics.
    
    This class is responsible for collecting, storing, and providing access to
    metrics about resource utilization and performance in the system.
    """
    def __init__(self):
        self.metrics: Dict[str, MetricSeries] = {}
        self.custom_collectors: Dict[str, Callable[[], Dict[str, float]]] = {}
        
    def register_metric(
        self,
        name: str,
        metric_type: MetricType,
        unit: str,
        description: str,
        max_history: int = 1000
    ) -> MetricSeries:
        """
        Register a new metric to track.
        
        Args:
            name: Name of the metric
            metric_type: Type of the metric
            unit: Unit of measurement
            description: Description of what the metric represents
            max_history: Maximum number of values to keep
            
        Returns:
            MetricSeries: The created metric series
        """
        metric = MetricSeries(
            name=name,
            type=metric_type,
            unit=unit,
            description=description,
            max_history=max_history
        )
        
        self.metrics[name] = metric
        return metric
        
    def record_metric(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Record a value for a metric.
        
        Args:
            name: Name of the metric
            value: Value to record
            labels: Optional labels to associate with the value
        """
        if name not in self.metrics:
            raise ValueError(f"Metric '{name}' not registered")
            
        self.metrics[name].add_value(value, labels)
        
    def register_custom_collector(
        self,
        name: str,
        collector_func: Callable[[], Dict[str, float]]
    ) -> None:
        """
        Register a custom metric collector function.
        
        Args:
            name: Name of the collector
            collector_func: Function that returns a dict of metric values
        """
        self.custom_collectors[name] = collector_func
        
    def collect_custom_metrics(self) -> None:
        """Collect metrics from all registered custom collectors."""
        for collector_name, collector_func in self.custom_collectors.items():
            try:
                metrics = collector_func()
                for metric_name, value in metrics.items():
                    # Use collector name as a label
                    self.record_metric(
                        name=metric_name,
                        value=value,
                        labels={"collector": collector_name}
                    )
            except Exception as e:
                # Log the error but continue with other collectors
                print(f"Error collecting metrics from {collector_name}: {e}")
                
    def get_metric(self, name: str) -> Optional[MetricSeries]:
        """
        Get a metric series by name.
        
        Args:
            name: Name of the metric
            
        Returns:
            MetricSeries: The metric series, or None if not found
        """
        return self.metrics.get(name)
        
    def get_all_metrics(self) -> Dict[str, MetricSeries]:
        """Get all registered metrics."""
        return self.metrics


class ResourceMetricsCollector:
    """
    Collects metrics specifically related to resource utilization.
    
    This class is responsible for monitoring resources and collecting
    metrics about their utilization, allocation, and performance.
    """
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.resources: Dict[str, Resource] = {}
        
        # Register standard resource metrics
        self._register_standard_metrics()
        
    def _register_standard_metrics(self) -> None:
        """Register standard resource utilization metrics."""
        # Overall utilization metrics
        self.metrics_collector.register_metric(
            name="resource_utilization_overall",
            metric_type=MetricType.UTILIZATION,
            unit="percentage",
            description="Overall resource utilization across all resources"
        )
        
        # Per resource type utilization metrics
        for resource_type in ResourceType:
            self.metrics_collector.register_metric(
                name=f"resource_utilization_{resource_type.value}",
                metric_type=MetricType.UTILIZATION,
                unit="percentage",
                description=f"Utilization of {resource_type.value} resources"
            )
            
        # Allocation rate metrics
        self.metrics_collector.register_metric(
            name="resource_allocation_rate",
            metric_type=MetricType.ALLOCATION_RATE,
            unit="allocations_per_minute",
            description="Rate of resource allocations"
        )
        
        # Contention rate metrics
        self.metrics_collector.register_metric(
            name="resource_contention_rate",
            metric_type=MetricType.CONTENTION_RATE,
            unit="contentions_per_minute",
            description="Rate of resource contentions"
        )
        
        # Wait time metrics
        self.metrics_collector.register_metric(
            name="resource_wait_time",
            metric_type=MetricType.WAIT_TIME,
            unit="seconds",
            description="Average wait time for resource allocation"
        )
        
    def register_resource(self, resource: Resource) -> None:
        """
        Register a resource for metrics collection.
        
        Args:
            resource: The resource to register
        """
        self.resources[resource.id] = resource
        
    def unregister_resource(self, resource_id: str) -> None:
        """
        Unregister a resource from metrics collection.
        
        Args:
            resource_id: ID of the resource to unregister
        """
        if resource_id in self.resources:
            del self.resources[resource_id]
            
    def collect_utilization_metrics(self) -> None:
        """Collect utilization metrics for all registered resources."""
        if not self.resources:
            return
            
        # Calculate overall utilization
        total_utilization = 0.0
        resource_count = 0
        
        # Track utilization by resource type
        type_utilization: Dict[ResourceType, List[float]] = {}
        
        for resource in self.resources.values():
            utilization = resource.capacity.utilization_percentage()
            total_utilization += utilization
            resource_count += 1
            
            # Add to resource type utilization
            if resource.resource_type not in type_utilization:
                type_utilization[resource.resource_type] = []
            type_utilization[resource.resource_type].append(utilization)
            
        # Record overall utilization
        if resource_count > 0:
            overall_utilization = total_utilization / resource_count
            self.metrics_collector.record_metric(
                name="resource_utilization_overall",
                value=overall_utilization
            )
            
        # Record per-type utilization
        for resource_type, utilizations in type_utilization.items():
            avg_utilization = statistics.mean(utilizations)
            self.metrics_collector.record_metric(
                name=f"resource_utilization_{resource_type.value}",
                value=avg_utilization
            )
            
    def record_allocation(
        self,
        resource_type: ResourceType,
        wait_time: float
    ) -> None:
        """
        Record a resource allocation event.
        
        Args:
            resource_type: Type of resource allocated
            wait_time: Time spent waiting for allocation
        """
        # Update allocation rate
        self.metrics_collector.record_metric(
            name="resource_allocation_rate",
            value=1.0,  # Each call increments by 1
            labels={"resource_type": resource_type.value}
        )
        
        # Update wait time
        self.metrics_collector.record_metric(
            name="resource_wait_time",
            value=wait_time,
            labels={"resource_type": resource_type.value}
        )
        
    def record_contention(self, resource_type: ResourceType) -> None:
        """
        Record a resource contention event.
        
        Args:
            resource_type: Type of resource with contention
        """
        self.metrics_collector.record_metric(
            name="resource_contention_rate",
            value=1.0,  # Each call increments by 1
            labels={"resource_type": resource_type.value}
        )

