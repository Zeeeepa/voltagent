"""
Resource Pool Module

This module implements resource pooling mechanisms for the Resource Management System.
It provides tools to create and manage pools of resources that can be shared among
multiple tasks and workstreams.
"""

from typing import Dict, List, Set, Optional, Tuple, Callable
from enum import Enum
from dataclasses import dataclass, field
import time
import uuid

from ..models import Resource, ResourceType, ResourceRequirement, ResourceState


class PoolingStrategy(Enum):
    """Enumeration of resource pooling strategies."""
    STATIC = "static"  # Fixed pool size
    DYNAMIC = "dynamic"  # Pool size adjusts based on demand
    ELASTIC = "elastic"  # Pool can grow and shrink within limits


class ResourcePool:
    """
    Represents a pool of resources that can be shared among tasks.
    
    A resource pool groups similar resources together and provides mechanisms
    to allocate and release resources from the pool based on requirements.
    """
    def __init__(
        self,
        name: str,
        resource_type: ResourceType,
        strategy: PoolingStrategy = PoolingStrategy.STATIC,
        min_size: int = 1,
        max_size: Optional[int] = None,
        idle_timeout_seconds: Optional[int] = None
    ):
        self.id = str(uuid.uuid4())
        self.name = name
        self.resource_type = resource_type
        self.strategy = strategy
        self.min_size = min_size
        self.max_size = max_size
        self.idle_timeout_seconds = idle_timeout_seconds
        self.resources: Dict[str, Resource] = {}
        self.available_resources: Set[str] = set()
        self.reserved_resources: Dict[str, str] = {}  # resource_id -> requester_id
        self.last_activity: Dict[str, float] = {}  # resource_id -> timestamp
        self.created_at = time.time()
        
    def add_resource(self, resource: Resource) -> bool:
        """
        Add a resource to the pool.
        
        Args:
            resource: The resource to add
            
        Returns:
            bool: True if the resource was added, False otherwise
        """
        if resource.resource_type != self.resource_type:
            return False
            
        if self.max_size is not None and len(self.resources) >= self.max_size:
            return False
            
        self.resources[resource.id] = resource
        
        if resource.is_available():
            self.available_resources.add(resource.id)
            
        self.last_activity[resource.id] = time.time()
        return True
        
    def remove_resource(self, resource_id: str) -> Optional[Resource]:
        """
        Remove a resource from the pool.
        
        Args:
            resource_id: ID of the resource to remove
            
        Returns:
            Resource: The removed resource, or None if not found
        """
        if resource_id not in self.resources:
            return None
            
        resource = self.resources[resource_id]
        
        # Remove from all tracking collections
        del self.resources[resource_id]
        self.available_resources.discard(resource_id)
        if resource_id in self.reserved_resources:
            del self.reserved_resources[resource_id]
        if resource_id in self.last_activity:
            del self.last_activity[resource_id]
            
        return resource
        
    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """
        Get a resource from the pool by ID.
        
        Args:
            resource_id: ID of the resource to get
            
        Returns:
            Resource: The resource, or None if not found
        """
        return self.resources.get(resource_id)
        
    def reserve_resource(
        self,
        requester_id: str,
        requirement: Optional[ResourceRequirement] = None
    ) -> Optional[Resource]:
        """
        Reserve a resource from the pool.
        
        Args:
            requester_id: ID of the entity reserving the resource
            requirement: Optional specific requirements for the resource
            
        Returns:
            Resource: The reserved resource, or None if no suitable resource available
        """
        # Find a suitable resource
        resource_id = self._find_suitable_resource(requirement)
        
        if resource_id is None:
            return None
            
        # Reserve the resource
        resource = self.resources[resource_id]
        
        if requirement:
            # Reserve the specific amount required
            if not resource.reserve(requirement.amount, requester_id):
                return None
        else:
            # Reserve the entire resource
            if not resource.reserve(resource.capacity.available(), requester_id):
                return None
                
        # Update tracking
        self.available_resources.discard(resource_id)
        self.reserved_resources[resource_id] = requester_id
        self.last_activity[resource_id] = time.time()
        
        return resource
        
    def release_resource(self, resource_id: str) -> bool:
        """
        Release a reserved resource back to the pool.
        
        Args:
            resource_id: ID of the resource to release
            
        Returns:
            bool: True if the resource was released, False otherwise
        """
        if resource_id not in self.resources or resource_id not in self.reserved_resources:
            return False
            
        resource = self.resources[resource_id]
        
        # Release the resource
        if not resource.release(resource.capacity.current):
            return False
            
        # Update tracking
        del self.reserved_resources[resource_id]
        self.available_resources.add(resource_id)
        self.last_activity[resource_id] = time.time()
        
        return True
        
    def get_available_count(self) -> int:
        """Get the number of available resources in the pool."""
        return len(self.available_resources)
        
    def get_reserved_count(self) -> int:
        """Get the number of reserved resources in the pool."""
        return len(self.reserved_resources)
        
    def get_total_count(self) -> int:
        """Get the total number of resources in the pool."""
        return len(self.resources)
        
    def get_utilization_percentage(self) -> float:
        """Calculate the utilization percentage of the pool."""
        if not self.resources:
            return 0.0
            
        return (len(self.reserved_resources) / len(self.resources)) * 100
        
    def cleanup_idle_resources(self) -> int:
        """
        Clean up idle resources based on the idle timeout.
        
        Returns:
            int: Number of resources removed
        """
        if self.idle_timeout_seconds is None:
            return 0
            
        current_time = time.time()
        idle_cutoff = current_time - self.idle_timeout_seconds
        
        resources_to_remove = []
        
        for resource_id, last_active in self.last_activity.items():
            if resource_id in self.available_resources and last_active < idle_cutoff:
                resources_to_remove.append(resource_id)
                
        # Don't remove resources if it would violate the min_size constraint
        if len(self.resources) - len(resources_to_remove) < self.min_size:
            # Only remove enough to maintain min_size
            excess = len(self.resources) - self.min_size
            if excess <= 0:
                return 0
            resources_to_remove = resources_to_remove[:excess]
            
        # Remove the idle resources
        for resource_id in resources_to_remove:
            self.remove_resource(resource_id)
            
        return len(resources_to_remove)
        
    def _find_suitable_resource(
        self,
        requirement: Optional[ResourceRequirement]
    ) -> Optional[str]:
        """
        Find a suitable resource that meets the given requirement.
        
        Args:
            requirement: Optional specific requirements for the resource
            
        Returns:
            str: ID of a suitable resource, or None if none available
        """
        if not self.available_resources:
            return None
            
        if requirement is None:
            # Any available resource will do
            return next(iter(self.available_resources))
            
        # Find a resource that meets the requirement
        for resource_id in self.available_resources:
            resource = self.resources[resource_id]
            
            if requirement.can_be_satisfied_by(resource):
                return resource_id
                
        return None


class ResourcePoolManager:
    """
    Manages multiple resource pools in the system.
    
    This class is responsible for creating, configuring, and managing resource pools,
    as well as allocating resources from the appropriate pools based on requirements.
    """
    def __init__(self):
        self.pools: Dict[str, ResourcePool] = {}
        self.resource_to_pool: Dict[str, str] = {}  # resource_id -> pool_id
        self.type_to_pools: Dict[ResourceType, List[str]] = {}  # resource_type -> [pool_id]
        self.pool_factory_funcs: Dict[ResourceType, Callable[[], ResourcePool]] = {}
        
    def create_pool(
        self,
        name: str,
        resource_type: ResourceType,
        strategy: PoolingStrategy = PoolingStrategy.STATIC,
        min_size: int = 1,
        max_size: Optional[int] = None,
        idle_timeout_seconds: Optional[int] = None
    ) -> ResourcePool:
        """
        Create a new resource pool.
        
        Args:
            name: Name of the pool
            resource_type: Type of resources in the pool
            strategy: Pooling strategy to use
            min_size: Minimum pool size
            max_size: Maximum pool size (None for unlimited)
            idle_timeout_seconds: Timeout for idle resources (None for no timeout)
            
        Returns:
            ResourcePool: The created pool
        """
        pool = ResourcePool(
            name=name,
            resource_type=resource_type,
            strategy=strategy,
            min_size=min_size,
            max_size=max_size,
            idle_timeout_seconds=idle_timeout_seconds
        )
        
        self.pools[pool.id] = pool
        
        # Update type to pools mapping
        if resource_type not in self.type_to_pools:
            self.type_to_pools[resource_type] = []
        self.type_to_pools[resource_type].append(pool.id)
        
        return pool
        
    def remove_pool(self, pool_id: str) -> bool:
        """
        Remove a resource pool.
        
        Args:
            pool_id: ID of the pool to remove
            
        Returns:
            bool: True if the pool was removed, False if not found
        """
        if pool_id not in self.pools:
            return False
            
        pool = self.pools[pool_id]
        
        # Remove all resources from the pool
        for resource_id in list(pool.resources.keys()):
            if resource_id in self.resource_to_pool:
                del self.resource_to_pool[resource_id]
                
        # Update type to pools mapping
        if pool.resource_type in self.type_to_pools:
            self.type_to_pools[pool.resource_type].remove(pool_id)
            
        # Remove the pool
        del self.pools[pool_id]
        
        return True
        
    def get_pool(self, pool_id: str) -> Optional[ResourcePool]:
        """
        Get a resource pool by ID.
        
        Args:
            pool_id: ID of the pool to get
            
        Returns:
            ResourcePool: The pool, or None if not found
        """
        return self.pools.get(pool_id)
        
    def get_pools_by_type(self, resource_type: ResourceType) -> List[ResourcePool]:
        """
        Get all pools of a specific resource type.
        
        Args:
            resource_type: Type of resources to get pools for
            
        Returns:
            List[ResourcePool]: List of pools with the specified resource type
        """
        if resource_type not in self.type_to_pools:
            return []
            
        return [self.pools[pool_id] for pool_id in self.type_to_pools[resource_type]]
        
    def add_resource_to_pool(
        self,
        resource: Resource,
        pool_id: Optional[str] = None
    ) -> bool:
        """
        Add a resource to a pool.
        
        Args:
            resource: The resource to add
            pool_id: Optional ID of the pool to add to (None to auto-select)
            
        Returns:
            bool: True if the resource was added, False otherwise
        """
        # If pool_id is not specified, find a suitable pool
        if pool_id is None:
            pools = self.get_pools_by_type(resource.resource_type)
            
            if not pools:
                # No suitable pool exists, create one
                if resource.resource_type in self.pool_factory_funcs:
                    # Use the factory function to create a pool
                    pool = self.pool_factory_funcs[resource.resource_type]()
                    pool_id = pool.id
                else:
                    # Create a default pool
                    pool = self.create_pool(
                        name=f"{resource.resource_type.value}_pool",
                        resource_type=resource.resource_type
                    )
                    pool_id = pool.id
            else:
                # Find the pool with the most available capacity
                pool_id = max(
                    pools,
                    key=lambda p: p.get_available_count() / max(p.get_total_count(), 1)
                ).id
                
        # Add the resource to the pool
        if pool_id not in self.pools:
            return False
            
        pool = self.pools[pool_id]
        
        if pool.add_resource(resource):
            self.resource_to_pool[resource.id] = pool_id
            return True
            
        return False
        
    def remove_resource_from_pool(self, resource_id: str) -> Optional[Resource]:
        """
        Remove a resource from its pool.
        
        Args:
            resource_id: ID of the resource to remove
            
        Returns:
            Resource: The removed resource, or None if not found
        """
        if resource_id not in self.resource_to_pool:
            return None
            
        pool_id = self.resource_to_pool[resource_id]
        pool = self.pools[pool_id]
        
        resource = pool.remove_resource(resource_id)
        
        if resource:
            del self.resource_to_pool[resource_id]
            
        return resource
        
    def get_resource_pool(self, resource_id: str) -> Optional[ResourcePool]:
        """
        Get the pool that a resource belongs to.
        
        Args:
            resource_id: ID of the resource
            
        Returns:
            ResourcePool: The pool, or None if the resource is not in a pool
        """
        if resource_id not in self.resource_to_pool:
            return None
            
        pool_id = self.resource_to_pool[resource_id]
        return self.pools.get(pool_id)
        
    def reserve_resource(
        self,
        requester_id: str,
        requirement: ResourceRequirement,
        preferred_pool_id: Optional[str] = None
    ) -> Optional[Resource]:
        """
        Reserve a resource that meets the given requirement.
        
        Args:
            requester_id: ID of the entity reserving the resource
            requirement: Requirements for the resource
            preferred_pool_id: Optional preferred pool to reserve from
            
        Returns:
            Resource: The reserved resource, or None if no suitable resource available
        """
        # Try the preferred pool first
        if preferred_pool_id and preferred_pool_id in self.pools:
            pool = self.pools[preferred_pool_id]
            
            if pool.resource_type == requirement.resource_type:
                resource = pool.reserve_resource(requester_id, requirement)
                
                if resource:
                    return resource
                    
        # Try all pools of the required type
        pools = self.get_pools_by_type(requirement.resource_type)
        
        for pool in pools:
            if pool.id != preferred_pool_id:  # Skip the preferred pool we already tried
                resource = pool.reserve_resource(requester_id, requirement)
                
                if resource:
                    return resource
                    
        return None
        
    def release_resource(self, resource_id: str) -> bool:
        """
        Release a reserved resource.
        
        Args:
            resource_id: ID of the resource to release
            
        Returns:
            bool: True if the resource was released, False otherwise
        """
        if resource_id not in self.resource_to_pool:
            return False
            
        pool_id = self.resource_to_pool[resource_id]
        pool = self.pools[pool_id]
        
        return pool.release_resource(resource_id)
        
    def register_pool_factory(
        self,
        resource_type: ResourceType,
        factory_func: Callable[[], ResourcePool]
    ) -> None:
        """
        Register a factory function for creating pools of a specific resource type.
        
        Args:
            resource_type: Type of resources the factory creates pools for
            factory_func: Function that creates a new pool
        """
        self.pool_factory_funcs[resource_type] = factory_func
        
    def cleanup_idle_resources(self) -> int:
        """
        Clean up idle resources in all pools.
        
        Returns:
            int: Total number of resources removed
        """
        total_removed = 0
        
        for pool in self.pools.values():
            removed = pool.cleanup_idle_resources()
            total_removed += removed
            
        return total_removed

