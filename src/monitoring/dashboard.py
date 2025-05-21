"""
Resource Monitoring Dashboard Module

This module implements a dashboard for visualizing resource utilization metrics
and monitoring the health of the Resource Management System.
"""

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, field
import time
from datetime import datetime, timedelta

from .metrics import MetricsCollector, MetricSeries, MetricType


class DashboardWidgetType(Enum):
    """Enumeration of supported dashboard widget types."""
    GAUGE = "gauge"
    CHART = "chart"
    TABLE = "table"
    ALERT = "alert"
    STATUS = "status"


@dataclass
class DashboardWidget:
    """Represents a widget on the resource monitoring dashboard."""
    id: str
    title: str
    type: DashboardWidgetType
    metric_names: List[str]
    refresh_interval_seconds: int = 60
    position: Tuple[int, int] = (0, 0)  # (row, column)
    size: Tuple[int, int] = (1, 1)  # (rows, columns)
    config: Dict[str, Any] = field(default_factory=dict)
    last_updated: float = field(default_factory=time.time)
    
    def should_refresh(self) -> bool:
        """Check if the widget should be refreshed based on its interval."""
        return time.time() - self.last_updated >= self.refresh_interval_seconds
        
    def refresh(self, metrics_collector: MetricsCollector) -> Dict[str, Any]:
        """
        Refresh the widget data.
        
        Args:
            metrics_collector: The metrics collector to get data from
            
        Returns:
            Dict[str, Any]: The updated widget data
        """
        self.last_updated = time.time()
        
        # Collect data for each metric
        data = {}
        for metric_name in self.metric_names:
            metric = metrics_collector.get_metric(metric_name)
            if metric:
                if self.type == DashboardWidgetType.GAUGE:
                    # For gauges, just get the latest value
                    latest = metric.get_latest_value()
                    if latest:
                        data[metric_name] = latest.value
                    else:
                        data[metric_name] = None
                        
                elif self.type == DashboardWidgetType.CHART:
                    # For charts, get the full time series
                    time_window = self.config.get("time_window_seconds")
                    if time_window:
                        cutoff_time = time.time() - time_window
                        values = [
                            {"value": v.value, "timestamp": v.timestamp, "labels": v.labels}
                            for v in metric.values
                            if v.timestamp >= cutoff_time
                        ]
                    else:
                        values = [
                            {"value": v.value, "timestamp": v.timestamp, "labels": v.labels}
                            for v in metric.values
                        ]
                    data[metric_name] = values
                    
                elif self.type == DashboardWidgetType.TABLE:
                    # For tables, get the latest values with labels
                    latest_values = {}
                    for value in metric.values[-self.config.get("max_rows", 10):]:
                        key = tuple(sorted(value.labels.items()))
                        latest_values[key] = {
                            "value": value.value,
                            "timestamp": value.timestamp,
                            "labels": value.labels
                        }
                    data[metric_name] = list(latest_values.values())
                    
                elif self.type == DashboardWidgetType.ALERT:
                    # For alerts, check if the value exceeds a threshold
                    latest = metric.get_latest_value()
                    if latest:
                        threshold = self.config.get("threshold")
                        if threshold:
                            comparison = self.config.get("comparison", "gt")
                            if comparison == "gt" and latest.value > threshold:
                                data[metric_name] = {
                                    "triggered": True,
                                    "value": latest.value,
                                    "threshold": threshold
                                }
                            elif comparison == "lt" and latest.value < threshold:
                                data[metric_name] = {
                                    "triggered": True,
                                    "value": latest.value,
                                    "threshold": threshold
                                }
                            else:
                                data[metric_name] = {
                                    "triggered": False,
                                    "value": latest.value,
                                    "threshold": threshold
                                }
                        else:
                            data[metric_name] = {
                                "triggered": False,
                                "value": latest.value
                            }
                    else:
                        data[metric_name] = {"triggered": False}
                        
                elif self.type == DashboardWidgetType.STATUS:
                    # For status widgets, determine status based on thresholds
                    latest = metric.get_latest_value()
                    if latest:
                        warning_threshold = self.config.get("warning_threshold")
                        critical_threshold = self.config.get("critical_threshold")
                        
                        if critical_threshold and latest.value >= critical_threshold:
                            status = "critical"
                        elif warning_threshold and latest.value >= warning_threshold:
                            status = "warning"
                        else:
                            status = "normal"
                            
                        data[metric_name] = {
                            "status": status,
                            "value": latest.value
                        }
                    else:
                        data[metric_name] = {"status": "unknown"}
                        
        return data


class ResourceDashboard:
    """
    Dashboard for visualizing resource utilization and performance metrics.
    
    This class provides a configurable dashboard for monitoring the health and
    performance of the Resource Management System through various widgets.
    """
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.widgets: Dict[str, DashboardWidget] = {}
        
        # Create default dashboard layout
        self._create_default_dashboard()
        
    def _create_default_dashboard(self) -> None:
        """Create the default dashboard layout with standard widgets."""
        # Overall utilization gauge
        self.add_widget(
            DashboardWidget(
                id="overall_utilization",
                title="Overall Resource Utilization",
                type=DashboardWidgetType.GAUGE,
                metric_names=["resource_utilization_overall"],
                position=(0, 0),
                size=(1, 1),
                config={
                    "min": 0,
                    "max": 100,
                    "units": "%",
                    "thresholds": [
                        {"value": 70, "color": "yellow"},
                        {"value": 90, "color": "red"}
                    ]
                }
            )
        )
        
        # Resource utilization by type chart
        self.add_widget(
            DashboardWidget(
                id="utilization_by_type",
                title="Resource Utilization by Type",
                type=DashboardWidgetType.CHART,
                metric_names=[
                    "resource_utilization_compute",
                    "resource_utilization_memory",
                    "resource_utilization_storage",
                    "resource_utilization_network"
                ],
                position=(0, 1),
                size=(1, 2),
                config={
                    "chart_type": "line",
                    "time_window_seconds": 3600,  # 1 hour
                    "y_axis_label": "Utilization (%)",
                    "y_axis_min": 0,
                    "y_axis_max": 100
                }
            )
        )
        
        # Allocation rate chart
        self.add_widget(
            DashboardWidget(
                id="allocation_rate",
                title="Resource Allocation Rate",
                type=DashboardWidgetType.CHART,
                metric_names=["resource_allocation_rate"],
                position=(1, 0),
                size=(1, 1),
                config={
                    "chart_type": "bar",
                    "time_window_seconds": 3600,  # 1 hour
                    "y_axis_label": "Allocations per minute"
                }
            )
        )
        
        # Contention rate chart
        self.add_widget(
            DashboardWidget(
                id="contention_rate",
                title="Resource Contention Rate",
                type=DashboardWidgetType.CHART,
                metric_names=["resource_contention_rate"],
                position=(1, 1),
                size=(1, 1),
                config={
                    "chart_type": "bar",
                    "time_window_seconds": 3600,  # 1 hour
                    "y_axis_label": "Contentions per minute"
                }
            )
        )
        
        # Wait time chart
        self.add_widget(
            DashboardWidget(
                id="wait_time",
                title="Resource Allocation Wait Time",
                type=DashboardWidgetType.CHART,
                metric_names=["resource_wait_time"],
                position=(1, 2),
                size=(1, 1),
                config={
                    "chart_type": "line",
                    "time_window_seconds": 3600,  # 1 hour
                    "y_axis_label": "Wait time (seconds)"
                }
            )
        )
        
        # Resource status table
        self.add_widget(
            DashboardWidget(
                id="resource_status",
                title="Resource Status",
                type=DashboardWidgetType.TABLE,
                metric_names=["resource_utilization_overall"],
                position=(2, 0),
                size=(1, 3),
                config={
                    "columns": [
                        {"name": "Resource Type", "field": "labels.resource_type"},
                        {"name": "Utilization", "field": "value", "format": "percentage"},
                        {"name": "Last Updated", "field": "timestamp", "format": "datetime"}
                    ],
                    "max_rows": 10
                }
            )
        )
        
        # High utilization alert
        self.add_widget(
            DashboardWidget(
                id="high_utilization_alert",
                title="High Utilization Alert",
                type=DashboardWidgetType.ALERT,
                metric_names=["resource_utilization_overall"],
                position=(3, 0),
                size=(1, 1),
                config={
                    "threshold": 90,
                    "comparison": "gt",
                    "message": "Overall resource utilization is above 90%"
                }
            )
        )
        
        # System status
        self.add_widget(
            DashboardWidget(
                id="system_status",
                title="System Status",
                type=DashboardWidgetType.STATUS,
                metric_names=["resource_utilization_overall"],
                position=(3, 1),
                size=(1, 2),
                config={
                    "warning_threshold": 70,
                    "critical_threshold": 90,
                    "status_labels": {
                        "normal": "Healthy",
                        "warning": "Warning",
                        "critical": "Critical"
                    }
                }
            )
        )
        
    def add_widget(self, widget: DashboardWidget) -> None:
        """
        Add a widget to the dashboard.
        
        Args:
            widget: The widget to add
        """
        self.widgets[widget.id] = widget
        
    def remove_widget(self, widget_id: str) -> bool:
        """
        Remove a widget from the dashboard.
        
        Args:
            widget_id: ID of the widget to remove
            
        Returns:
            bool: True if the widget was removed, False if not found
        """
        if widget_id in self.widgets:
            del self.widgets[widget_id]
            return True
        return False
        
    def get_widget(self, widget_id: str) -> Optional[DashboardWidget]:
        """
        Get a widget by ID.
        
        Args:
            widget_id: ID of the widget to get
            
        Returns:
            DashboardWidget: The widget, or None if not found
        """
        return self.widgets.get(widget_id)
        
    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        Get the current data for all dashboard widgets.
        
        Returns:
            Dict[str, Any]: The dashboard data
        """
        dashboard_data = {
            "timestamp": time.time(),
            "widgets": {}
        }
        
        for widget_id, widget in self.widgets.items():
            if widget.should_refresh():
                widget_data = widget.refresh(self.metrics_collector)
            else:
                # Use cached data
                widget_data = {}
                
            dashboard_data["widgets"][widget_id] = {
                "id": widget_id,
                "title": widget.title,
                "type": widget.type.value,
                "position": widget.position,
                "size": widget.size,
                "last_updated": widget.last_updated,
                "data": widget_data
            }
            
        return dashboard_data
        
    def refresh_dashboard(self) -> Dict[str, Any]:
        """
        Refresh all widgets on the dashboard.
        
        Returns:
            Dict[str, Any]: The updated dashboard data
        """
        # Force refresh of all widgets
        for widget in self.widgets.values():
            widget.last_updated = 0
            
        return self.get_dashboard_data()

