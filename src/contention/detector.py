"""
Resource Contention Detector Module

This module implements mechanisms for detecting and resolving resource contention
in the Resource Management System. It provides tools to identify when multiple tasks
are competing for the same resources and strategies to resolve these conflicts.
"""

from typing import Dict, List, Set, Tuple, Optional
from enum import Enum
from dataclasses import dataclass, field
import time

from ..models import Resource, ResourceType
from ..protocols import Reservation, ReservationStatus


class ContentionSeverity(Enum):
    """Enumeration of resource contention severity levels."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ContentionResolutionStrategy(Enum):
    """Enumeration of strategies for resolving resource contention."""
    WAIT = "wait"  # Wait for resources to become available
    PRIORITY = "priority"  # Allocate based on task priority
    PREEMPT = "preempt"  # Preempt lower-priority tasks
    SCALE = "scale"  # Scale resources to meet demand
    REDISTRIBUTE = "redistribute"  # Redistribute resources among tasks


@dataclass
class ContentionEvent:
    """
    Represents a resource contention event in the system.
    
    A contention event occurs when multiple tasks compete for the same resources,
    potentially causing delays or failures in task execution.
    """
    id: str
    resource_type: ResourceType
    competing_reservations: List[str]
    severity: ContentionSeverity
    detected_at: float = field(default_factory=time.time)
    resolved_at: Optional[float] = None
    resolution_strategy: Optional[ContentionResolutionStrategy] = None
    
    def is_resolved(self) -> bool:
        """Check if the contention event has been resolved."""
        return self.resolved_at is not None
        
    def resolve(self, strategy: ContentionResolutionStrategy) -> None:
        """
        Mark the contention event as resolved.
        
        Args:
            strategy: The strategy used to resolve the contention
        """
        self.resolved_at = time.time()
        self.resolution_strategy = strategy


class ContentionDetector:
    """
    Detects and tracks resource contention in the system.
    
    This class is responsible for monitoring resource usage and identifying
    when multiple tasks are competing for the same resources, which could
    lead to performance degradation or deadlocks.
    """
    def __init__(self):
        self.contention_events: Dict[str, ContentionEvent] = {}
        self.resource_demand: Dict[ResourceType, int] = {}
        self.resource_supply: Dict[ResourceType, int] = {}
        self.reservation_resource_types: Dict[str, Set[ResourceType]] = {}
        
    def register_reservation(self, reservation: Reservation) -> None:
        """
        Register a reservation for contention detection.
        
        Args:
            reservation: The reservation to register
        """
        # Track which resource types this reservation uses
        resource_types = set()
        for resource_id, (resource, _) in reservation.allocated_resources.items():
            resource_types.add(resource.resource_type)
            
            # Update demand for this resource type
            if resource.resource_type not in self.resource_demand:
                self.resource_demand[resource.resource_type] = 0
            self.resource_demand[resource.resource_type] += 1
            
        self.reservation_resource_types[reservation.id] = resource_types
        
    def unregister_reservation(self, reservation_id: str) -> None:
        """
        Unregister a reservation from contention detection.
        
        Args:
            reservation_id: ID of the reservation to unregister
        """
        if reservation_id in self.reservation_resource_types:
            resource_types = self.reservation_resource_types[reservation_id]
            
            # Update demand for these resource types
            for resource_type in resource_types:
                if resource_type in self.resource_demand:
                    self.resource_demand[resource_type] -= 1
                    
            del self.reservation_resource_types[reservation_id]
            
    def update_resource_supply(self, resource_type: ResourceType, count: int) -> None:
        """
        Update the supply count for a resource type.
        
        Args:
            resource_type: The type of resource
            count: The number of resources available
        """
        self.resource_supply[resource_type] = count
        
    def detect_contention(self) -> List[ContentionEvent]:
        """
        Detect resource contention in the system.
        
        Returns:
            List[ContentionEvent]: List of detected contention events
        """
        new_events = []
        
        # Check for contention based on supply and demand
        for resource_type, demand in self.resource_demand.items():
            supply = self.resource_supply.get(resource_type, 0)
            
            if demand > supply:
                # There is contention for this resource type
                severity = self._calculate_contention_severity(demand, supply)
                
                if severity != ContentionSeverity.NONE:
                    # Find all reservations competing for this resource type
                    competing_reservations = [
                        res_id for res_id, types in self.reservation_resource_types.items()
                        if resource_type in types
                    ]
                    
                    # Create a contention event
                    event_id = f"contention_{resource_type.value}_{int(time.time())}"
                    event = ContentionEvent(
                        id=event_id,
                        resource_type=resource_type,
                        competing_reservations=competing_reservations,
                        severity=severity
                    )
                    
                    self.contention_events[event_id] = event
                    new_events.append(event)
                    
        return new_events
        
    def _calculate_contention_severity(
        self,
        demand: int,
        supply: int
    ) -> ContentionSeverity:
        """
        Calculate the severity of resource contention.
        
        Args:
            demand: The demand for the resource
            supply: The supply of the resource
            
        Returns:
            ContentionSeverity: The calculated severity level
        """
        if supply >= demand:
            return ContentionSeverity.NONE
            
        # Calculate contention ratio (higher ratio = more severe contention)
        if supply == 0:
            ratio = float('inf')  # Infinite contention
        else:
            ratio = demand / supply
            
        # Determine severity based on ratio
        if ratio <= 1.2:
            return ContentionSeverity.LOW
        elif ratio <= 1.5:
            return ContentionSeverity.MEDIUM
        elif ratio <= 2.0:
            return ContentionSeverity.HIGH
        else:
            return ContentionSeverity.CRITICAL


class ContentionResolver:
    """
    Resolves resource contention in the system.
    
    This class is responsible for implementing strategies to resolve resource
    contention, such as prioritizing tasks, preempting lower-priority tasks,
    or scaling resources to meet demand.
    """
    def __init__(self):
        self.resolution_strategies: Dict[ContentionSeverity, ContentionResolutionStrategy] = {
            ContentionSeverity.LOW: ContentionResolutionStrategy.WAIT,
            ContentionSeverity.MEDIUM: ContentionResolutionStrategy.REDISTRIBUTE,
            ContentionSeverity.HIGH: ContentionResolutionStrategy.PRIORITY,
            ContentionSeverity.CRITICAL: ContentionResolutionStrategy.PREEMPT
        }
        
    def resolve_contention(
        self,
        event: ContentionEvent,
        strategy: Optional[ContentionResolutionStrategy] = None
    ) -> Tuple[bool, str]:
        """
        Resolve a resource contention event.
        
        Args:
            event: The contention event to resolve
            strategy: Optional specific strategy to use (overrides default)
            
        Returns:
            Tuple[bool, str]: Success status and message
        """
        if event.is_resolved():
            return (False, "Contention event already resolved")
            
        # Determine resolution strategy
        if strategy is None:
            strategy = self.resolution_strategies.get(
                event.severity,
                ContentionResolutionStrategy.WAIT
            )
            
        # Apply the resolution strategy
        success, message = self._apply_resolution_strategy(event, strategy)
        
        if success:
            event.resolve(strategy)
            
        return (success, message)
        
    def _apply_resolution_strategy(
        self,
        event: ContentionEvent,
        strategy: ContentionResolutionStrategy
    ) -> Tuple[bool, str]:
        """
        Apply a specific resolution strategy to a contention event.
        
        Args:
            event: The contention event to resolve
            strategy: The strategy to apply
            
        Returns:
            Tuple[bool, str]: Success status and message
        """
        # This would typically involve interacting with other components
        # of the resource management system to implement the strategy
        
        if strategy == ContentionResolutionStrategy.WAIT:
            # No action needed, just wait for resources to become available
            return (True, "Waiting for resources to become available")
            
        elif strategy == ContentionResolutionStrategy.REDISTRIBUTE:
            # Redistribute resources among competing tasks
            # This would involve adjusting resource allocations
            return (True, "Resources redistributed among competing tasks")
            
        elif strategy == ContentionResolutionStrategy.PRIORITY:
            # Allocate resources based on task priority
            # This would involve checking task priorities and reallocating
            return (True, "Resources allocated based on task priority")
            
        elif strategy == ContentionResolutionStrategy.PREEMPT:
            # Preempt lower-priority tasks
            # This would involve identifying and preempting tasks
            return (True, "Lower-priority tasks preempted to free resources")
            
        elif strategy == ContentionResolutionStrategy.SCALE:
            # Scale resources to meet demand
            # This would involve requesting additional resources
            return (True, "Resources scaled to meet demand")
            
        else:
            return (False, f"Unknown resolution strategy: {strategy}")
            
    def get_recommended_strategy(
        self,
        event: ContentionEvent
    ) -> ContentionResolutionStrategy:
        """
        Get the recommended resolution strategy for a contention event.
        
        Args:
            event: The contention event
            
        Returns:
            ContentionResolutionStrategy: The recommended strategy
        """
        return self.resolution_strategies.get(
            event.severity,
            ContentionResolutionStrategy.WAIT
        )

