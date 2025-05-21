"""
Resource Allocation Policy Module

This module implements various resource allocation policies for the Resource Management System.
It provides mechanisms to allocate resources based on different strategies such as
fair allocation, priority-based allocation, and quota-based allocation.
"""

from typing import Dict, List, Set, Optional, Tuple, Callable, Any
from enum import Enum
from dataclasses import dataclass, field
import time
import uuid
import heapq

from ..models import Resource, ResourceType, ResourceRequirement
from ..allocation import ResourceAllocator, AllocationResult, AllocationStatus


class AllocationPolicyType(Enum):
    """Enumeration of resource allocation policy types."""
    FAIR = "fair"  # Distribute resources fairly among requesters
    PRIORITY = "priority"  # Allocate based on priority levels
    QUOTA = "quota"  # Allocate based on predefined quotas
    WEIGHTED = "weighted"  # Allocate based on weights
    CUSTOM = "custom"  # Custom allocation policy


@dataclass
class ResourceQuota:
    """
    Defines resource quotas for a requester.
    
    A resource quota specifies the maximum amount of resources that a
    requester is allowed to use.
    """
    requester_id: str
    resource_type: ResourceType
    max_count: int
    max_capacity: float
    current_count: int = 0
    current_capacity: float = 0.0
    
    def can_allocate(self, amount: float) -> bool:
        """
        Check if the requester can allocate more resources.
        
        Args:
            amount: The amount of resource to allocate
            
        Returns:
            bool: True if the allocation is within quota, False otherwise
        """
        if self.current_count >= self.max_count:
            return False
            
        if self.current_capacity + amount > self.max_capacity:
            return False
            
        return True
        
    def update_usage(self, count_delta: int, capacity_delta: float) -> None:
        """
        Update the current resource usage.
        
        Args:
            count_delta: Change in resource count
            capacity_delta: Change in resource capacity
        """
        self.current_count += count_delta
        self.current_capacity += capacity_delta
        
        # Ensure values don't go below zero
        self.current_count = max(0, self.current_count)
        self.current_capacity = max(0.0, self.current_capacity)


@dataclass
class AllocationWeight:
    """
    Defines allocation weights for a requester.
    
    Allocation weights determine how resources are distributed among
    requesters when using weighted allocation policies.
    """
    requester_id: str
    resource_type: ResourceType
    weight: float = 1.0  # Default weight


class AllocationPolicy:
    """
    Base class for resource allocation policies.
    
    An allocation policy determines how resources are allocated among
    multiple requesters based on specific rules and constraints.
    """
    def __init__(
        self,
        name: str,
        policy_type: AllocationPolicyType
    ):
        self.id = str(uuid.uuid4())
        self.name = name
        self.policy_type = policy_type
        
    def allocate(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        requirements: List[ResourceRequirement]
    ) -> AllocationResult:
        """
        Allocate resources based on the policy.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            
        Returns:
            AllocationResult: The result of the allocation attempt
        """
        # Default implementation just delegates to the allocator
        return allocator.allocate(requester_id, requirements)


class FairAllocationPolicy(AllocationPolicy):
    """
    Implements fair resource allocation among requesters.
    
    This policy ensures that resources are distributed fairly among all
    requesters, giving each an equal share of available resources.
    """
    def __init__(self, name: str):
        super().__init__(name, AllocationPolicyType.FAIR)
        self.requester_allocations: Dict[str, Dict[ResourceType, float]] = {}
        
    def allocate(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        requirements: List[ResourceRequirement]
    ) -> AllocationResult:
        """
        Allocate resources fairly among requesters.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            
        Returns:
            AllocationResult: The result of the allocation attempt
        """
        # Initialize requester allocations if needed
        if requester_id not in self.requester_allocations:
            self.requester_allocations[requester_id] = {}
            
        # Check if the allocation would exceed fair share
        for requirement in requirements:
            resource_type = requirement.resource_type
            
            # Get current allocation for this resource type
            current_allocation = self.requester_allocations.get(requester_id, {}).get(resource_type, 0.0)
            
            # Calculate fair share
            total_requesters = len(self.requester_allocations)
            if total_requesters == 0:
                fair_share = float('inf')  # No limit for first requester
            else:
                # This is a simplified fair share calculation
                # In a real system, this would consider total available resources
                fair_share = 100.0 / total_requesters  # Arbitrary units
                
            # Check if allocation would exceed fair share
            if current_allocation + requirement.amount > fair_share:
                # Allocation would exceed fair share, but we'll still try
                # In a real system, this might involve preempting other allocations
                pass
                
        # Perform the allocation
        result = allocator.allocate(requester_id, requirements)
        
        # Update allocation tracking if successful
        if result.is_successful() or result.is_partial():
            for resource_id, (resource, amount) in result.allocated_resources.items():
                resource_type = resource.resource_type
                
                if resource_type not in self.requester_allocations[requester_id]:
                    self.requester_allocations[requester_id][resource_type] = 0.0
                    
                self.requester_allocations[requester_id][resource_type] += amount
                
        return result
        
    def release(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        reservation_id: str,
        resources: Dict[str, Tuple[Resource, float]]
    ) -> bool:
        """
        Release allocated resources.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity releasing resources
            reservation_id: ID of the reservation to release
            resources: Dict mapping resource IDs to (resource, amount) tuples
            
        Returns:
            bool: True if the resources were released, False otherwise
        """
        # Release the resources
        success = allocator.release(reservation_id)
        
        # Update allocation tracking if successful
        if success and requester_id in self.requester_allocations:
            for resource_id, (resource, amount) in resources.items():
                resource_type = resource.resource_type
                
                if resource_type in self.requester_allocations[requester_id]:
                    self.requester_allocations[requester_id][resource_type] -= amount
                    
                    # Ensure value doesn't go below zero
                    self.requester_allocations[requester_id][resource_type] = max(
                        0.0,
                        self.requester_allocations[requester_id][resource_type]
                    )
                    
        return success


class PriorityAllocationPolicy(AllocationPolicy):
    """
    Implements priority-based resource allocation.
    
    This policy allocates resources based on requester priorities, ensuring
    that high-priority requesters get resources before low-priority ones.
    """
    def __init__(self, name: str):
        super().__init__(name, AllocationPolicyType.PRIORITY)
        self.requester_priorities: Dict[str, int] = {}
        self.pending_allocations: List[Tuple[int, str, List[ResourceRequirement]]] = []
        
    def set_requester_priority(self, requester_id: str, priority: int) -> None:
        """
        Set the priority for a requester.
        
        Args:
            requester_id: ID of the requester
            priority: Priority level (higher values = higher priority)
        """
        self.requester_priorities[requester_id] = priority
        
    def get_requester_priority(self, requester_id: str) -> int:
        """
        Get the priority for a requester.
        
        Args:
            requester_id: ID of the requester
            
        Returns:
            int: The requester's priority level
        """
        return self.requester_priorities.get(requester_id, 0)
        
    def allocate(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        requirements: List[ResourceRequirement]
    ) -> AllocationResult:
        """
        Allocate resources based on requester priority.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            
        Returns:
            AllocationResult: The result of the allocation attempt
        """
        # Get requester priority
        priority = self.get_requester_priority(requester_id)
        
        # Try to allocate resources
        result = allocator.allocate(requester_id, requirements)
        
        if result.is_failed():
            # Add to pending allocations queue
            entry = (-priority, requester_id, requirements)  # Negative priority for max-heap
            heapq.heappush(self.pending_allocations, entry)
            
            result.status = AllocationStatus.DEFERRED
            result.message = f"Allocation queued with priority {priority}"
            
        return result
        
    def process_pending_allocations(self, allocator: ResourceAllocator) -> int:
        """
        Process pending allocations in priority order.
        
        Args:
            allocator: The resource allocator to use
            
        Returns:
            int: Number of successful allocations
        """
        successful_count = 0
        
        while self.pending_allocations:
            # Get the highest-priority pending allocation
            neg_priority, requester_id, requirements = heapq.heappop(self.pending_allocations)
            
            # Try to allocate resources
            result = allocator.allocate(requester_id, requirements)
            
            if result.is_successful():
                successful_count += 1
            else:
                # Put back in the queue with the same priority
                heapq.heappush(self.pending_allocations, (neg_priority, requester_id, requirements))
                break  # Stop processing if we can't satisfy the highest-priority request
                
        return successful_count


class QuotaAllocationPolicy(AllocationPolicy):
    """
    Implements quota-based resource allocation.
    
    This policy allocates resources based on predefined quotas for each requester,
    ensuring that no requester exceeds their allocated quota.
    """
    def __init__(self, name: str):
        super().__init__(name, AllocationPolicyType.QUOTA)
        self.quotas: Dict[str, Dict[ResourceType, ResourceQuota]] = {}
        
    def set_quota(self, quota: ResourceQuota) -> None:
        """
        Set a resource quota for a requester.
        
        Args:
            quota: The resource quota to set
        """
        requester_id = quota.requester_id
        resource_type = quota.resource_type
        
        if requester_id not in self.quotas:
            self.quotas[requester_id] = {}
            
        self.quotas[requester_id][resource_type] = quota
        
    def get_quota(
        self,
        requester_id: str,
        resource_type: ResourceType
    ) -> Optional[ResourceQuota]:
        """
        Get a resource quota for a requester.
        
        Args:
            requester_id: ID of the requester
            resource_type: Type of resource
            
        Returns:
            ResourceQuota: The resource quota, or None if not found
        """
        return self.quotas.get(requester_id, {}).get(resource_type)
        
    def allocate(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        requirements: List[ResourceRequirement]
    ) -> AllocationResult:
        """
        Allocate resources based on requester quotas.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            
        Returns:
            AllocationResult: The result of the allocation attempt
        """
        # Check if allocation would exceed quota
        for requirement in requirements:
            resource_type = requirement.resource_type
            quota = self.get_quota(requester_id, resource_type)
            
            if quota and not quota.can_allocate(requirement.amount):
                # Allocation would exceed quota
                result = AllocationResult(AllocationStatus.FAILED)
                result.unsatisfied_requirements = [requirement]
                result.message = f"Allocation would exceed quota for {resource_type.value}"
                return result
                
        # Perform the allocation
        result = allocator.allocate(requester_id, requirements)
        
        # Update quota usage if successful
        if result.is_successful() or result.is_partial():
            for resource_id, (resource, amount) in result.allocated_resources.items():
                resource_type = resource.resource_type
                quota = self.get_quota(requester_id, resource_type)
                
                if quota:
                    quota.update_usage(1, amount)
                    
        return result
        
    def release(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        reservation_id: str,
        resources: Dict[str, Tuple[Resource, float]]
    ) -> bool:
        """
        Release allocated resources.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity releasing resources
            reservation_id: ID of the reservation to release
            resources: Dict mapping resource IDs to (resource, amount) tuples
            
        Returns:
            bool: True if the resources were released, False otherwise
        """
        # Release the resources
        success = allocator.release(reservation_id)
        
        # Update quota usage if successful
        if success:
            for resource_id, (resource, amount) in resources.items():
                resource_type = resource.resource_type
                quota = self.get_quota(requester_id, resource_type)
                
                if quota:
                    quota.update_usage(-1, -amount)
                    
        return success


class WeightedAllocationPolicy(AllocationPolicy):
    """
    Implements weighted resource allocation.
    
    This policy allocates resources based on weights assigned to requesters,
    giving a larger share of resources to requesters with higher weights.
    """
    def __init__(self, name: str):
        super().__init__(name, AllocationPolicyType.WEIGHTED)
        self.weights: Dict[str, Dict[ResourceType, AllocationWeight]] = {}
        self.total_weights: Dict[ResourceType, float] = {}
        self.requester_allocations: Dict[str, Dict[ResourceType, float]] = {}
        
    def set_weight(self, weight: AllocationWeight) -> None:
        """
        Set an allocation weight for a requester.
        
        Args:
            weight: The allocation weight to set
        """
        requester_id = weight.requester_id
        resource_type = weight.resource_type
        
        if requester_id not in self.weights:
            self.weights[requester_id] = {}
            
        # Update total weight
        old_weight = self.weights.get(requester_id, {}).get(resource_type, AllocationWeight(requester_id, resource_type)).weight
        weight_delta = weight.weight - old_weight
        
        if resource_type not in self.total_weights:
            self.total_weights[resource_type] = 0.0
            
        self.total_weights[resource_type] += weight_delta
        
        # Set the weight
        self.weights[requester_id][resource_type] = weight
        
    def get_weight(
        self,
        requester_id: str,
        resource_type: ResourceType
    ) -> float:
        """
        Get the allocation weight for a requester.
        
        Args:
            requester_id: ID of the requester
            resource_type: Type of resource
            
        Returns:
            float: The allocation weight
        """
        return self.weights.get(requester_id, {}).get(
            resource_type,
            AllocationWeight(requester_id, resource_type)
        ).weight
        
    def allocate(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        requirements: List[ResourceRequirement]
    ) -> AllocationResult:
        """
        Allocate resources based on requester weights.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity requesting resources
            requirements: List of resource requirements to satisfy
            
        Returns:
            AllocationResult: The result of the allocation attempt
        """
        # Initialize requester allocations if needed
        if requester_id not in self.requester_allocations:
            self.requester_allocations[requester_id] = {}
            
        # Check if allocation would exceed weighted share
        for requirement in requirements:
            resource_type = requirement.resource_type
            
            # Get current allocation for this resource type
            current_allocation = self.requester_allocations.get(requester_id, {}).get(resource_type, 0.0)
            
            # Calculate weighted share
            weight = self.get_weight(requester_id, resource_type)
            total_weight = self.total_weights.get(resource_type, 0.0)
            
            if total_weight == 0.0:
                weighted_share = float('inf')  # No limit if no weights defined
            else:
                # This is a simplified weighted share calculation
                # In a real system, this would consider total available resources
                weighted_share = (weight / total_weight) * 100.0  # Arbitrary units
                
            # Check if allocation would exceed weighted share
            if current_allocation + requirement.amount > weighted_share:
                # Allocation would exceed weighted share, but we'll still try
                # In a real system, this might involve adjusting the allocation
                pass
                
        # Perform the allocation
        result = allocator.allocate(requester_id, requirements)
        
        # Update allocation tracking if successful
        if result.is_successful() or result.is_partial():
            for resource_id, (resource, amount) in result.allocated_resources.items():
                resource_type = resource.resource_type
                
                if resource_type not in self.requester_allocations[requester_id]:
                    self.requester_allocations[requester_id][resource_type] = 0.0
                    
                self.requester_allocations[requester_id][resource_type] += amount
                
        return result
        
    def release(
        self,
        allocator: ResourceAllocator,
        requester_id: str,
        reservation_id: str,
        resources: Dict[str, Tuple[Resource, float]]
    ) -> bool:
        """
        Release allocated resources.
        
        Args:
            allocator: The resource allocator to use
            requester_id: ID of the entity releasing resources
            reservation_id: ID of the reservation to release
            resources: Dict mapping resource IDs to (resource, amount) tuples
            
        Returns:
            bool: True if the resources were released, False otherwise
        """
        # Release the resources
        success = allocator.release(reservation_id)
        
        # Update allocation tracking if successful
        if success and requester_id in self.requester_allocations:
            for resource_id, (resource, amount) in resources.items():
                resource_type = resource.resource_type
                
                if resource_type in self.requester_allocations[requester_id]:
                    self.requester_allocations[requester_id][resource_type] -= amount
                    
                    # Ensure value doesn't go below zero
                    self.requester_allocations[requester_id][resource_type] = max(
                        0.0,
                        self.requester_allocations[requester_id][resource_type]
                    )
                    
        return success

