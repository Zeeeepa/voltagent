"""
Resource Scaling Module

This module implements mechanisms for dynamically scaling resources based on demand
in the Resource Management System. It provides tools to automatically adjust resource
capacity to meet changing workload requirements.
"""

from typing import Dict, List, Set, Optional, Tuple, Callable, Any
from enum import Enum
from dataclasses import dataclass, field
import time
import uuid
import threading
import logging

from ..models import Resource, ResourceType, ResourceCapacity, ResourceState
from ..monitoring import MetricsCollector


class ScalingDirection(Enum):
    """Enumeration of scaling directions."""
    UP = "up"
    DOWN = "down"
    NONE = "none"


class ScalingTrigger(Enum):
    """Enumeration of triggers for scaling actions."""
    UTILIZATION = "utilization"
    CONTENTION = "contention"
    WAIT_TIME = "wait_time"
    MANUAL = "manual"
    SCHEDULED = "scheduled"


@dataclass
class ScalingPolicy:
    """
    Defines a policy for when and how to scale resources.
    
    A scaling policy specifies the conditions under which resources should be
    scaled up or down, as well as the scaling parameters.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    resource_type: ResourceType = ResourceType.CUSTOM
    
    # Utilization thresholds
    scale_up_utilization_threshold: float = 80.0  # Percentage
    scale_down_utilization_threshold: float = 20.0  # Percentage
    
    # Contention thresholds
    scale_up_contention_threshold: float = 5.0  # Contentions per minute
    scale_down_contention_threshold: float = 0.0  # Contentions per minute
    
    # Wait time thresholds
    scale_up_wait_time_threshold: float = 10.0  # Seconds
    scale_down_wait_time_threshold: float = 1.0  # Seconds
    
    # Scaling parameters
    cooldown_seconds: int = 300  # Minimum time between scaling actions
    scale_up_increment: int = 1  # Number of resources to add when scaling up
    scale_down_increment: int = 1  # Number of resources to remove when scaling down
    min_resources: int = 1  # Minimum number of resources to maintain
    max_resources: Optional[int] = None  # Maximum number of resources (None for unlimited)
    
    # Evaluation window
    evaluation_window_seconds: int = 300  # Time window for metric evaluation
    
    def evaluate_scaling_direction(
        self,
        utilization: float,
        contention_rate: float,
        wait_time: float
    ) -> Tuple[ScalingDirection, ScalingTrigger]:
        """
        Evaluate the scaling direction based on current metrics.
        
        Args:
            utilization: Current resource utilization percentage
            contention_rate: Current resource contention rate
            wait_time: Current resource allocation wait time
            
        Returns:
            Tuple[ScalingDirection, ScalingTrigger]: The scaling direction and trigger
        """
        # Check scale up conditions
        if utilization >= self.scale_up_utilization_threshold:
            return (ScalingDirection.UP, ScalingTrigger.UTILIZATION)
            
        if contention_rate >= self.scale_up_contention_threshold:
            return (ScalingDirection.UP, ScalingTrigger.CONTENTION)
            
        if wait_time >= self.scale_up_wait_time_threshold:
            return (ScalingDirection.UP, ScalingTrigger.WAIT_TIME)
            
        # Check scale down conditions
        if utilization <= self.scale_down_utilization_threshold:
            return (ScalingDirection.DOWN, ScalingTrigger.UTILIZATION)
            
        if contention_rate <= self.scale_down_contention_threshold and wait_time <= self.scale_down_wait_time_threshold:
            return (ScalingDirection.DOWN, ScalingTrigger.WAIT_TIME)
            
        # No scaling needed
        return (ScalingDirection.NONE, ScalingTrigger.NONE)


@dataclass
class ScalingAction:
    """
    Represents a resource scaling action.
    
    A scaling action records the details of a scaling operation, including
    the direction, trigger, and results of the scaling.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    policy_id: str = ""
    direction: ScalingDirection = ScalingDirection.NONE
    trigger: ScalingTrigger = ScalingTrigger.MANUAL
    resource_type: ResourceType = ResourceType.CUSTOM
    requested_count: int = 0
    actual_count: int = 0
    timestamp: float = field(default_factory=time.time)
    status: str = "pending"
    message: str = ""
    
    def is_successful(self) -> bool:
        """Check if the scaling action was successful."""
        return self.status == "success"
        
    def is_failed(self) -> bool:
        """Check if the scaling action failed."""
        return self.status == "failed"
        
    def is_pending(self) -> bool:
        """Check if the scaling action is pending."""
        return self.status == "pending"
        
    def mark_success(self, actual_count: int, message: str = "") -> None:
        """
        Mark the scaling action as successful.
        
        Args:
            actual_count: The actual number of resources scaled
            message: Optional success message
        """
        self.actual_count = actual_count
        self.status = "success"
        self.message = message or "Scaling action completed successfully"
        
    def mark_failed(self, message: str) -> None:
        """
        Mark the scaling action as failed.
        
        Args:
            message: Failure message
        """
        self.status = "failed"
        self.message = message


class ResourceScaler:
    """
    Manages dynamic scaling of resources based on demand.
    
    This class is responsible for monitoring resource utilization and automatically
    adjusting resource capacity to meet changing workload requirements.
    """
    def __init__(
        self,
        metrics_collector: MetricsCollector,
        resource_factory: Optional[Dict[ResourceType, Callable[[], Resource]]] = None
    ):
        self.metrics_collector = metrics_collector
        self.resource_factory = resource_factory or {}
        self.policies: Dict[str, ScalingPolicy] = {}
        self.scaling_actions: List[ScalingAction] = []
        self.last_scaling_time: Dict[ResourceType, float] = {}
        self.resource_counts: Dict[ResourceType, int] = {}
        self.scaling_lock = threading.Lock()
        self.logger = logging.getLogger(__name__)
        
    def register_policy(self, policy: ScalingPolicy) -> None:
        """
        Register a scaling policy.
        
        Args:
            policy: The policy to register
        """
        self.policies[policy.id] = policy
        
    def unregister_policy(self, policy_id: str) -> bool:
        """
        Unregister a scaling policy.
        
        Args:
            policy_id: ID of the policy to unregister
            
        Returns:
            bool: True if the policy was unregistered, False if not found
        """
        if policy_id in self.policies:
            del self.policies[policy_id]
            return True
        return False
        
    def get_policy(self, policy_id: str) -> Optional[ScalingPolicy]:
        """
        Get a scaling policy by ID.
        
        Args:
            policy_id: ID of the policy to get
            
        Returns:
            ScalingPolicy: The policy, or None if not found
        """
        return self.policies.get(policy_id)
        
    def update_resource_count(self, resource_type: ResourceType, count: int) -> None:
        """
        Update the current count of resources of a specific type.
        
        Args:
            resource_type: The type of resource
            count: The current count
        """
        self.resource_counts[resource_type] = count
        
    def register_resource_factory(
        self,
        resource_type: ResourceType,
        factory_func: Callable[[], Resource]
    ) -> None:
        """
        Register a factory function for creating resources of a specific type.
        
        Args:
            resource_type: Type of resources the factory creates
            factory_func: Function that creates a new resource
        """
        self.resource_factory[resource_type] = factory_func
        
    def evaluate_scaling(self) -> List[ScalingAction]:
        """
        Evaluate all scaling policies and trigger scaling actions if needed.
        
        Returns:
            List[ScalingAction]: List of scaling actions triggered
        """
        actions = []
        
        with self.scaling_lock:
            for policy in self.policies.values():
                # Skip if we're in cooldown period for this resource type
                if policy.resource_type in self.last_scaling_time:
                    last_time = self.last_scaling_time[policy.resource_type]
                    if time.time() - last_time < policy.cooldown_seconds:
                        continue
                        
                # Get current metrics
                utilization = self._get_utilization(policy.resource_type, policy.evaluation_window_seconds)
                contention_rate = self._get_contention_rate(policy.resource_type, policy.evaluation_window_seconds)
                wait_time = self._get_wait_time(policy.resource_type, policy.evaluation_window_seconds)
                
                # Evaluate scaling direction
                direction, trigger = policy.evaluate_scaling_direction(
                    utilization=utilization,
                    contention_rate=contention_rate,
                    wait_time=wait_time
                )
                
                if direction != ScalingDirection.NONE:
                    # Create a scaling action
                    action = self._create_scaling_action(policy, direction, trigger)
                    
                    # Execute the scaling action
                    self._execute_scaling_action(action)
                    
                    # Record the action
                    self.scaling_actions.append(action)
                    actions.append(action)
                    
                    # Update last scaling time
                    self.last_scaling_time[policy.resource_type] = time.time()
                    
        return actions
        
    def scale_manually(
        self,
        resource_type: ResourceType,
        count: int
    ) -> ScalingAction:
        """
        Manually scale resources of a specific type.
        
        Args:
            resource_type: The type of resource to scale
            count: The number of resources to add (positive) or remove (negative)
            
        Returns:
            ScalingAction: The scaling action created
        """
        with self.scaling_lock:
            # Determine scaling direction
            if count > 0:
                direction = ScalingDirection.UP
            elif count < 0:
                direction = ScalingDirection.DOWN
            else:
                direction = ScalingDirection.NONE
                
            # Create a scaling action
            action = ScalingAction(
                direction=direction,
                trigger=ScalingTrigger.MANUAL,
                resource_type=resource_type,
                requested_count=abs(count)
            )
            
            # Execute the scaling action
            self._execute_scaling_action(action)
            
            # Record the action
            self.scaling_actions.append(action)
            
            # Update last scaling time
            self.last_scaling_time[resource_type] = time.time()
            
            return action
            
    def get_scaling_history(
        self,
        resource_type: Optional[ResourceType] = None,
        limit: int = 10
    ) -> List[ScalingAction]:
        """
        Get the history of scaling actions.
        
        Args:
            resource_type: Optional filter by resource type
            limit: Maximum number of actions to return
            
        Returns:
            List[ScalingAction]: List of scaling actions
        """
        if resource_type:
            filtered_actions = [a for a in self.scaling_actions if a.resource_type == resource_type]
        else:
            filtered_actions = self.scaling_actions
            
        # Sort by timestamp (newest first)
        sorted_actions = sorted(filtered_actions, key=lambda a: a.timestamp, reverse=True)
        
        return sorted_actions[:limit]
        
    def _get_utilization(
        self,
        resource_type: ResourceType,
        window_seconds: int
    ) -> float:
        """
        Get the current utilization for a resource type.
        
        Args:
            resource_type: The type of resource
            window_seconds: Time window for metric evaluation
            
        Returns:
            float: The current utilization percentage
        """
        metric = self.metrics_collector.get_metric(f"resource_utilization_{resource_type.value}")
        
        if metric:
            avg = metric.get_average(window_seconds)
            if avg is not None:
                return avg
                
        return 0.0
        
    def _get_contention_rate(
        self,
        resource_type: ResourceType,
        window_seconds: int
    ) -> float:
        """
        Get the current contention rate for a resource type.
        
        Args:
            resource_type: The type of resource
            window_seconds: Time window for metric evaluation
            
        Returns:
            float: The current contention rate
        """
        metric = self.metrics_collector.get_metric("resource_contention_rate")
        
        if metric:
            # Filter values by resource type
            cutoff_time = time.time() - window_seconds
            values = [
                v.value for v in metric.values
                if v.timestamp >= cutoff_time and
                v.labels.get("resource_type") == resource_type.value
            ]
            
            if values:
                # Calculate rate per minute
                total = sum(values)
                minutes = window_seconds / 60
                return total / minutes
                
        return 0.0
        
    def _get_wait_time(
        self,
        resource_type: ResourceType,
        window_seconds: int
    ) -> float:
        """
        Get the current wait time for a resource type.
        
        Args:
            resource_type: The type of resource
            window_seconds: Time window for metric evaluation
            
        Returns:
            float: The current wait time in seconds
        """
        metric = self.metrics_collector.get_metric("resource_wait_time")
        
        if metric:
            # Filter values by resource type
            cutoff_time = time.time() - window_seconds
            values = [
                v.value for v in metric.values
                if v.timestamp >= cutoff_time and
                v.labels.get("resource_type") == resource_type.value
            ]
            
            if values:
                return sum(values) / len(values)
                
        return 0.0
        
    def _create_scaling_action(
        self,
        policy: ScalingPolicy,
        direction: ScalingDirection,
        trigger: ScalingTrigger
    ) -> ScalingAction:
        """
        Create a scaling action based on a policy.
        
        Args:
            policy: The scaling policy
            direction: The scaling direction
            trigger: The scaling trigger
            
        Returns:
            ScalingAction: The created scaling action
        """
        # Determine the number of resources to scale
        if direction == ScalingDirection.UP:
            count = policy.scale_up_increment
        elif direction == ScalingDirection.DOWN:
            count = policy.scale_down_increment
        else:
            count = 0
            
        return ScalingAction(
            policy_id=policy.id,
            direction=direction,
            trigger=trigger,
            resource_type=policy.resource_type,
            requested_count=count
        )
        
    def _execute_scaling_action(self, action: ScalingAction) -> None:
        """
        Execute a scaling action.
        
        Args:
            action: The scaling action to execute
        """
        resource_type = action.resource_type
        current_count = self.resource_counts.get(resource_type, 0)
        
        if action.direction == ScalingDirection.UP:
            # Check if we have a factory for this resource type
            if resource_type not in self.resource_factory:
                action.mark_failed(f"No resource factory registered for {resource_type.value}")
                return
                
            # Check if scaling would exceed maximum
            policy = self.policies.get(action.policy_id)
            if policy and policy.max_resources is not None:
                if current_count + action.requested_count > policy.max_resources:
                    # Adjust the count to not exceed maximum
                    adjusted_count = policy.max_resources - current_count
                    if adjusted_count <= 0:
                        action.mark_failed(f"Already at maximum resources ({policy.max_resources})")
                        return
                    action.requested_count = adjusted_count
                    
            # Create new resources
            factory = self.resource_factory[resource_type]
            created_count = 0
            
            try:
                for _ in range(action.requested_count):
                    resource = factory()
                    # In a real system, we would register this resource with the resource manager
                    created_count += 1
                    
                # Update resource count
                self.resource_counts[resource_type] = current_count + created_count
                
                action.mark_success(
                    created_count,
                    f"Created {created_count} {resource_type.value} resources"
                )
                
            except Exception as e:
                self.logger.exception(f"Error creating resources: {e}")
                action.mark_failed(f"Error creating resources: {str(e)}")
                
        elif action.direction == ScalingDirection.DOWN:
            # Check if we have enough resources to remove
            if current_count < action.requested_count:
                action.requested_count = current_count
                
            # Check if scaling would go below minimum
            policy = self.policies.get(action.policy_id)
            if policy:
                if current_count - action.requested_count < policy.min_resources:
                    # Adjust the count to not go below minimum
                    adjusted_count = current_count - policy.min_resources
                    if adjusted_count <= 0:
                        action.mark_failed(f"Already at minimum resources ({policy.min_resources})")
                        return
                    action.requested_count = adjusted_count
                    
            # Remove resources
            removed_count = action.requested_count
            
            # Update resource count
            self.resource_counts[resource_type] = current_count - removed_count
            
            action.mark_success(
                removed_count,
                f"Removed {removed_count} {resource_type.value} resources"
            )

