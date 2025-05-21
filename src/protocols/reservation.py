"""
Resource Reservation Protocol Module

This module implements the protocols for reserving and releasing resources
in the Resource Management System. It provides mechanisms to safely allocate
resources to tasks and release them when no longer needed.
"""

from typing import Dict, List, Optional, Tuple
from enum import Enum
import time
import uuid

from ..models import Resource, ResourceRequirement, ResourceState


class ReservationStatus(Enum):
    """Enumeration of possible reservation statuses."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PARTIAL = "partial"
    FAILED = "failed"
    RELEASED = "released"
    EXPIRED = "expired"


class ReservationStrategy(Enum):
    """Enumeration of resource reservation strategies."""
    GREEDY = "greedy"  # Reserve as much as possible from each resource
    BALANCED = "balanced"  # Distribute load evenly across resources
    OPTIMIZED = "optimized"  # Use optimization algorithm to find best allocation
    PRIORITY = "priority"  # Allocate based on resource priorities


class Reservation:
    """
    Represents a resource reservation in the system.
    
    A reservation is a record of resources allocated to a specific task or workflow.
    It tracks the resources, their allocated amounts, and the reservation status.
    """
    def __init__(
        self,
        requester_id: str,
        requirements: List[ResourceRequirement],
        strategy: ReservationStrategy = ReservationStrategy.BALANCED,
        timeout_seconds: int = 300
    ):
        self.id = str(uuid.uuid4())
        self.requester_id = requester_id
        self.requirements = requirements
        self.strategy = strategy
        self.status = ReservationStatus.PENDING
        self.created_at = time.time()
        self.confirmed_at: Optional[float] = None
        self.expires_at = self.created_at + timeout_seconds
        self.allocated_resources: Dict[str, Tuple[Resource, float]] = {}
        self.message: str = ""
    
    def is_expired(self) -> bool:
        """Check if the reservation has expired."""
        return time.time() > self.expires_at
    
    def confirm(self) -> bool:
        """
        Confirm the reservation, marking resources as officially allocated.
        
        Returns:
            bool: True if confirmation was successful, False otherwise
        """
        if self.status != ReservationStatus.PENDING:
            self.message = f"Cannot confirm reservation with status {self.status}"
            return False
            
        if self.is_expired():
            self.status = ReservationStatus.EXPIRED
            self.message = "Reservation expired before confirmation"
            return False
            
        # Update all allocated resources to IN_USE state
        for resource_id, (resource, _) in self.allocated_resources.items():
            resource.state = ResourceState.IN_USE
            
        self.status = ReservationStatus.CONFIRMED
        self.confirmed_at = time.time()
        self.message = "Reservation confirmed successfully"
        return True
    
    def release(self) -> bool:
        """
        Release all resources allocated in this reservation.
        
        Returns:
            bool: True if release was successful, False otherwise
        """
        if self.status not in [ReservationStatus.CONFIRMED, ReservationStatus.PARTIAL]:
            self.message = f"Cannot release reservation with status {self.status}"
            return False
            
        success = True
        for resource_id, (resource, amount) in self.allocated_resources.items():
            if not resource.release(amount):
                self.message = f"Failed to release resource {resource_id}"
                success = False
                
        if success:
            self.status = ReservationStatus.RELEASED
            self.message = "All resources released successfully"
            
        return success


class ReservationManager:
    """
    Manages resource reservations across the system.
    
    This class is responsible for handling reservation requests, allocating resources
    according to the specified strategy, and managing the lifecycle of reservations.
    """
    def __init__(self):
        self.active_reservations: Dict[str, Reservation] = {}
        self.resource_registry: Dict[str, Resource] = {}
    
    def register_resource(self, resource: Resource) -> None:
        """Register a resource with the reservation manager."""
        self.resource_registry[resource.id] = resource
    
    def unregister_resource(self, resource_id: str) -> bool:
        """Unregister a resource from the reservation manager."""
        if resource_id in self.resource_registry:
            del self.resource_registry[resource_id]
            return True
        return False
    
    def get_available_resources(self, requirement: ResourceRequirement) -> List[Resource]:
        """Get all available resources that can satisfy the given requirement."""
        return [
            resource for resource in self.resource_registry.values()
            if resource.is_available() and requirement.can_be_satisfied_by(resource)
        ]
    
    def create_reservation(
        self,
        requester_id: str,
        requirements: List[ResourceRequirement],
        strategy: ReservationStrategy = ReservationStrategy.BALANCED,
        timeout_seconds: int = 300
    ) -> Reservation:
        """
        Create a new resource reservation based on the given requirements.
        
        Args:
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            strategy: Strategy to use for resource allocation
            timeout_seconds: Time in seconds before reservation expires if not confirmed
            
        Returns:
            Reservation: The created reservation object
        """
        reservation = Reservation(
            requester_id=requester_id,
            requirements=requirements,
            strategy=strategy,
            timeout_seconds=timeout_seconds
        )
        
        # Apply the selected allocation strategy
        if strategy == ReservationStrategy.GREEDY:
            self._apply_greedy_strategy(reservation)
        elif strategy == ReservationStrategy.BALANCED:
            self._apply_balanced_strategy(reservation)
        elif strategy == ReservationStrategy.OPTIMIZED:
            self._apply_optimized_strategy(reservation)
        elif strategy == ReservationStrategy.PRIORITY:
            self._apply_priority_strategy(reservation)
        
        # Store the reservation if any resources were allocated
        if reservation.allocated_resources:
            if len(reservation.allocated_resources) == len(requirements):
                reservation.status = ReservationStatus.PENDING
                reservation.message = "All required resources allocated"
            else:
                reservation.status = ReservationStatus.PARTIAL
                reservation.message = "Only some required resources could be allocated"
        else:
            reservation.status = ReservationStatus.FAILED
            reservation.message = "Failed to allocate any required resources"
        
        self.active_reservations[reservation.id] = reservation
        return reservation
    
    def confirm_reservation(self, reservation_id: str) -> bool:
        """
        Confirm a pending reservation.
        
        Args:
            reservation_id: ID of the reservation to confirm
            
        Returns:
            bool: True if confirmation was successful, False otherwise
        """
        if reservation_id not in self.active_reservations:
            return False
            
        reservation = self.active_reservations[reservation_id]
        return reservation.confirm()
    
    def release_reservation(self, reservation_id: str) -> bool:
        """
        Release a confirmed reservation.
        
        Args:
            reservation_id: ID of the reservation to release
            
        Returns:
            bool: True if release was successful, False otherwise
        """
        if reservation_id not in self.active_reservations:
            return False
            
        reservation = self.active_reservations[reservation_id]
        success = reservation.release()
        
        if success:
            # Keep the reservation record but mark it as released
            reservation.status = ReservationStatus.RELEASED
            
        return success
    
    def cleanup_expired_reservations(self) -> int:
        """
        Clean up expired reservations and release their resources.
        
        Returns:
            int: Number of expired reservations cleaned up
        """
        count = 0
        for reservation_id, reservation in list(self.active_reservations.items()):
            if reservation.status == ReservationStatus.PENDING and reservation.is_expired():
                # Release all allocated resources
                for resource_id, (resource, amount) in reservation.allocated_resources.items():
                    resource.release(amount)
                
                reservation.status = ReservationStatus.EXPIRED
                count += 1
                
        return count
    
    def _apply_greedy_strategy(self, reservation: Reservation) -> None:
        """
        Apply the greedy allocation strategy to the reservation.
        
        This strategy tries to allocate as much as possible from each resource,
        potentially using fewer resources but with higher utilization.
        """
        for requirement in reservation.requirements:
            available_resources = self.get_available_resources(requirement)
            
            # Sort resources by available capacity (descending)
            available_resources.sort(
                key=lambda r: r.capacity.available(),
                reverse=True
            )
            
            for resource in available_resources:
                if resource.reserve(requirement.amount, reservation.requester_id):
                    reservation.allocated_resources[resource.id] = (resource, requirement.amount)
                    break
    
    def _apply_balanced_strategy(self, reservation: Reservation) -> None:
        """
        Apply the balanced allocation strategy to the reservation.
        
        This strategy distributes the load evenly across available resources,
        potentially using more resources but with lower utilization per resource.
        """
        for requirement in reservation.requirements:
            available_resources = self.get_available_resources(requirement)
            
            # Sort resources by utilization percentage (ascending)
            available_resources.sort(
                key=lambda r: r.capacity.utilization_percentage()
            )
            
            for resource in available_resources:
                if resource.reserve(requirement.amount, reservation.requester_id):
                    reservation.allocated_resources[resource.id] = (resource, requirement.amount)
                    break
    
    def _apply_optimized_strategy(self, reservation: Reservation) -> None:
        """
        Apply the optimized allocation strategy to the reservation.
        
        This strategy uses an optimization algorithm to find the best allocation
        based on multiple factors like utilization, performance, and cost.
        """
        # This would typically involve a more complex optimization algorithm
        # For now, we'll use a simple heuristic similar to balanced but with
        # additional consideration for resource capabilities
        
        for requirement in reservation.requirements:
            available_resources = self.get_available_resources(requirement)
            
            # Score resources based on multiple factors
            scored_resources = []
            for resource in available_resources:
                # Calculate a score based on utilization and capability match
                utilization_score = 1.0 - (resource.capacity.utilization_percentage() / 100)
                
                # Capability match score (simplified)
                capability_score = 0.5  # Default score
                if hasattr(requirement, 'preferred_resources') and resource.id in requirement.preferred_resources:
                    capability_score = 1.0
                
                # Combined score (equal weights for simplicity)
                combined_score = (utilization_score + capability_score) / 2
                scored_resources.append((resource, combined_score))
            
            # Sort by score (descending)
            scored_resources.sort(key=lambda x: x[1], reverse=True)
            
            # Allocate from highest-scoring resource
            for resource, _ in scored_resources:
                if resource.reserve(requirement.amount, reservation.requester_id):
                    reservation.allocated_resources[resource.id] = (resource, requirement.amount)
                    break
    
    def _apply_priority_strategy(self, reservation: Reservation) -> None:
        """
        Apply the priority-based allocation strategy to the reservation.
        
        This strategy allocates resources based on their priority levels,
        ensuring that high-priority tasks get the resources they need.
        """
        # Sort requirements by priority (descending)
        sorted_requirements = sorted(
            reservation.requirements,
            key=lambda r: r.priority,
            reverse=True
        )
        
        for requirement in sorted_requirements:
            available_resources = self.get_available_resources(requirement)
            
            # Sort resources by preferred status first, then by available capacity
            available_resources.sort(
                key=lambda r: (
                    r.id in requirement.preferred_resources,
                    r.capacity.available()
                ),
                reverse=True
            )
            
            for resource in available_resources:
                if resource.reserve(requirement.amount, reservation.requester_id):
                    reservation.allocated_resources[resource.id] = (resource, requirement.amount)
                    break

