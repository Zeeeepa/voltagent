"""
Resource Allocator Module

This module implements the core resource allocation algorithms for the Resource Management System.
It provides mechanisms to efficiently allocate resources to tasks based on various strategies
and policies.
"""

from typing import Dict, List, Optional, Tuple, Set
import heapq
from enum import Enum

from ..models import Resource, ResourceRequirement
from ..protocols import ReservationManager, ReservationStrategy, Reservation


class AllocationStatus(Enum):
    """Enumeration of possible allocation statuses."""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    PENDING = "pending"
    DEFERRED = "deferred"


class AllocationResult:
    """
    Represents the result of a resource allocation attempt.
    
    This class provides detailed information about the success or failure
    of a resource allocation operation, including which resources were allocated
    and which requirements could not be satisfied.
    """
    def __init__(self, status: AllocationStatus):
        self.status = status
        self.reservation_id: Optional[str] = None
        self.allocated_resources: Dict[str, Tuple[Resource, float]] = {}
        self.unsatisfied_requirements: List[ResourceRequirement] = []
        self.message: str = ""
        
    def is_successful(self) -> bool:
        """Check if the allocation was fully successful."""
        return self.status == AllocationStatus.SUCCESS
        
    def is_partial(self) -> bool:
        """Check if the allocation was partially successful."""
        return self.status == AllocationStatus.PARTIAL
        
    def is_failed(self) -> bool:
        """Check if the allocation failed completely."""
        return self.status == AllocationStatus.FAILED


class ResourceAllocator:
    """
    Manages the allocation of resources to tasks based on requirements and policies.
    
    This class is responsible for finding the optimal allocation of resources to tasks,
    taking into account resource requirements, priorities, and allocation policies.
    """
    def __init__(self, reservation_manager: ReservationManager):
        self.reservation_manager = reservation_manager
        self.pending_allocations: Dict[str, Tuple[str, List[ResourceRequirement]]] = {}
        
    def allocate(
        self,
        requester_id: str,
        requirements: List[ResourceRequirement],
        strategy: ReservationStrategy = ReservationStrategy.BALANCED,
        wait_if_unavailable: bool = False
    ) -> AllocationResult:
        """
        Allocate resources based on the given requirements.
        
        Args:
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            strategy: Strategy to use for resource allocation
            wait_if_unavailable: Whether to wait for resources if not immediately available
            
        Returns:
            AllocationResult: The result of the allocation attempt
        """
        # Create a reservation for the required resources
        reservation = self.reservation_manager.create_reservation(
            requester_id=requester_id,
            requirements=requirements,
            strategy=strategy
        )
        
        result = AllocationResult(AllocationStatus.PENDING)
        result.reservation_id = reservation.id
        
        # Check the reservation status
        if reservation.status == ReservationStatus.PENDING:
            # All requirements were satisfied
            self.reservation_manager.confirm_reservation(reservation.id)
            result.status = AllocationStatus.SUCCESS
            result.allocated_resources = reservation.allocated_resources
            result.message = "All resources allocated successfully"
            
        elif reservation.status == ReservationStatus.PARTIAL:
            # Only some requirements were satisfied
            if wait_if_unavailable:
                # Store the pending allocation for later retry
                allocation_id = reservation.id
                self.pending_allocations[allocation_id] = (requester_id, requirements)
                result.status = AllocationStatus.DEFERRED
                result.message = "Allocation deferred, waiting for resources to become available"
            else:
                # Release the partially allocated resources
                self.reservation_manager.release_reservation(reservation.id)
                result.status = AllocationStatus.PARTIAL
                result.allocated_resources = reservation.allocated_resources
                
                # Identify unsatisfied requirements
                allocated_types = {req.resource_type for req in requirements 
                                  if any(res[0].resource_type == req.resource_type 
                                        for res in reservation.allocated_resources.values())}
                result.unsatisfied_requirements = [req for req in requirements 
                                                 if req.resource_type not in allocated_types]
                result.message = "Only some resources could be allocated"
                
        else:  # ReservationStatus.FAILED
            result.status = AllocationStatus.FAILED
            result.unsatisfied_requirements = requirements
            result.message = "Failed to allocate any resources"
            
        return result
        
    def release(self, reservation_id: str) -> bool:
        """
        Release resources allocated in a reservation.
        
        Args:
            reservation_id: ID of the reservation to release
            
        Returns:
            bool: True if release was successful, False otherwise
        """
        return self.reservation_manager.release_reservation(reservation_id)
        
    def retry_pending_allocations(self) -> int:
        """
        Retry pending allocations that were deferred due to resource unavailability.
        
        Returns:
            int: Number of successful allocations
        """
        successful_count = 0
        
        for allocation_id, (requester_id, requirements) in list(self.pending_allocations.items()):
            result = self.allocate(requester_id, requirements)
            
            if result.is_successful():
                # Remove from pending allocations
                del self.pending_allocations[allocation_id]
                successful_count += 1
                
        return successful_count


class PriorityResourceAllocator(ResourceAllocator):
    """
    A resource allocator that prioritizes allocations based on task priority.
    
    This allocator ensures that high-priority tasks get resources before
    lower-priority tasks, potentially preempting lower-priority allocations
    if necessary.
    """
    def __init__(self, reservation_manager: ReservationManager):
        super().__init__(reservation_manager)
        self.priority_queue: List[Tuple[int, str, str, List[ResourceRequirement]]] = []
        
    def allocate_with_priority(
        self,
        requester_id: str,
        requirements: List[ResourceRequirement],
        priority: int,
        preempt_lower_priority: bool = False
    ) -> AllocationResult:
        """
        Allocate resources with a specified priority level.
        
        Args:
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            priority: Priority level of the allocation (higher values = higher priority)
            preempt_lower_priority: Whether to preempt lower-priority allocations if needed
            
        Returns:
            AllocationResult: The result of the allocation attempt
        """
        # Try to allocate without preemption first
        result = self.allocate(
            requester_id=requester_id,
            requirements=requirements,
            strategy=ReservationStrategy.PRIORITY
        )
        
        if result.is_successful():
            return result
            
        if preempt_lower_priority:
            # Find lower-priority allocations that could be preempted
            preemptable_resources = self._find_preemptable_resources(priority, requirements)
            
            if preemptable_resources:
                # Preempt the lower-priority allocations
                self._preempt_allocations(preemptable_resources)
                
                # Try allocation again
                result = self.allocate(
                    requester_id=requester_id,
                    requirements=requirements,
                    strategy=ReservationStrategy.PRIORITY
                )
                
                if result.is_successful():
                    result.message = "Resources allocated by preempting lower-priority allocations"
                    
        if not result.is_successful():
            # Queue the allocation request for later
            allocation_entry = (-priority, requester_id, str(id(requirements)), requirements)
            heapq.heappush(self.priority_queue, allocation_entry)
            
            result.status = AllocationStatus.DEFERRED
            result.message = "Allocation queued with priority {}".format(priority)
            
        return result
        
    def process_priority_queue(self) -> int:
        """
        Process the priority queue, attempting to allocate resources to queued requests.
        
        Returns:
            int: Number of successful allocations
        """
        successful_count = 0
        
        while self.priority_queue:
            # Get the highest-priority request
            neg_priority, requester_id, req_id, requirements = heapq.heappop(self.priority_queue)
            priority = -neg_priority  # Convert back to positive priority
            
            # Try to allocate resources
            result = self.allocate(
                requester_id=requester_id,
                requirements=requirements,
                strategy=ReservationStrategy.PRIORITY
            )
            
            if result.is_successful():
                successful_count += 1
            else:
                # Put back in the queue with the same priority
                heapq.heappush(self.priority_queue, (neg_priority, requester_id, req_id, requirements))
                break  # Stop processing if we can't satisfy the highest-priority request
                
        return successful_count
        
    def _find_preemptable_resources(
        self,
        priority: int,
        requirements: List[ResourceRequirement]
    ) -> Dict[str, Tuple[str, Resource, float]]:
        """
        Find lower-priority allocations that could be preempted.
        
        Args:
            priority: Priority level of the requesting allocation
            requirements: Resource requirements to satisfy
            
        Returns:
            Dict mapping reservation IDs to tuples of (requester_id, resource, amount)
        """
        # This would require tracking the priority of each active reservation
        # For simplicity, we'll return an empty dict for now
        return {}
        
    def _preempt_allocations(
        self,
        preemptable_resources: Dict[str, Tuple[str, Resource, float]]
    ) -> None:
        """
        Preempt lower-priority allocations to free up resources.
        
        Args:
            preemptable_resources: Dict of resources to preempt
        """
        for reservation_id, (requester_id, resource, amount) in preemptable_resources.items():
            # Release the reservation
            self.reservation_manager.release_reservation(reservation_id)
            
            # Notify the requester that their allocation was preempted
            # This would typically involve a callback or event mechanism
            pass

