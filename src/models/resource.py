"""
Resource Model Module

This module defines the core resource models and specifications for the Resource Management System.
It provides the foundation for representing different types of resources, their capabilities,
and constraints within the parallel workflow orchestration framework.
"""

from enum import Enum
from typing import Dict, List, Optional, Union
from dataclasses import dataclass, field
import uuid


class ResourceType(Enum):
    """Enumeration of supported resource types."""
    COMPUTE = "compute"
    MEMORY = "memory"
    STORAGE = "storage"
    NETWORK = "network"
    GPU = "gpu"
    SPECIALIZED = "specialized"
    CUSTOM = "custom"


class ResourceState(Enum):
    """Enumeration of possible resource states."""
    AVAILABLE = "available"
    RESERVED = "reserved"
    IN_USE = "in_use"
    SCALING = "scaling"
    MAINTENANCE = "maintenance"
    FAILED = "failed"


@dataclass
class ResourceCapacity:
    """Represents the capacity of a resource with current and maximum values."""
    current: float
    maximum: float
    unit: str

    def available(self) -> float:
        """Calculate available capacity."""
        return self.maximum - self.current

    def utilization_percentage(self) -> float:
        """Calculate utilization as a percentage."""
        if self.maximum == 0:
            return 0
        return (self.current / self.maximum) * 100


@dataclass
class ResourceConstraint:
    """Defines constraints that must be satisfied for resource allocation."""
    name: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    required_values: List[str] = field(default_factory=list)
    excluded_values: List[str] = field(default_factory=list)

    def validate(self, value: Union[float, str]) -> bool:
        """Validate if a value satisfies this constraint."""
        if isinstance(value, (int, float)):
            if self.min_value is not None and value < self.min_value:
                return False
            if self.max_value is not None and value > self.max_value:
                return False
        elif isinstance(value, str):
            if self.required_values and value not in self.required_values:
                return False
            if self.excluded_values and value in self.excluded_values:
                return False
        return True


@dataclass
class ResourceSpecification:
    """Detailed specification of a resource type."""
    resource_type: ResourceType
    capabilities: Dict[str, Union[str, float, bool]] = field(default_factory=dict)
    constraints: List[ResourceConstraint] = field(default_factory=list)
    metadata: Dict[str, str] = field(default_factory=dict)

    def validate_capabilities(self, requirements: Dict[str, Union[str, float, bool]]) -> bool:
        """Validate if this resource meets the given capability requirements."""
        for key, required_value in requirements.items():
            if key not in self.capabilities:
                return False
            
            current_value = self.capabilities[key]
            
            # Handle different types of capability comparisons
            if isinstance(required_value, (int, float)) and isinstance(current_value, (int, float)):
                if current_value < required_value:
                    return False
            elif current_value != required_value:
                return False
                
        return True


@dataclass
class Resource:
    """
    Represents a resource in the system that can be allocated to tasks.
    
    A resource has a unique identifier, type, capacity information, current state,
    and detailed specifications of its capabilities and constraints.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    resource_type: ResourceType = ResourceType.CUSTOM
    capacity: ResourceCapacity = field(default_factory=lambda: ResourceCapacity(0, 0, ""))
    state: ResourceState = ResourceState.AVAILABLE
    specification: ResourceSpecification = field(default_factory=lambda: ResourceSpecification(ResourceType.CUSTOM))
    owner_id: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    def is_available(self) -> bool:
        """Check if the resource is available for allocation."""
        return self.state == ResourceState.AVAILABLE and self.capacity.available() > 0
    
    def reserve(self, amount: float, owner_id: str) -> bool:
        """
        Attempt to reserve a specific amount of this resource.
        
        Args:
            amount: The amount of resource to reserve
            owner_id: ID of the entity reserving the resource
            
        Returns:
            bool: True if reservation was successful, False otherwise
        """
        if not self.is_available() or amount > self.capacity.available():
            return False
            
        self.capacity.current += amount
        if self.capacity.current >= self.capacity.maximum:
            self.state = ResourceState.RESERVED
        self.owner_id = owner_id
        return True
        
    def release(self, amount: float) -> bool:
        """
        Release a specific amount of this resource.
        
        Args:
            amount: The amount of resource to release
            
        Returns:
            bool: True if release was successful, False otherwise
        """
        if self.capacity.current < amount:
            return False
            
        self.capacity.current -= amount
        if self.state == ResourceState.RESERVED or self.state == ResourceState.IN_USE:
            self.state = ResourceState.AVAILABLE
        
        if self.capacity.current == 0:
            self.owner_id = None
            
        return True


@dataclass
class ResourceRequirement:
    """
    Defines the resource requirements for a task or workflow.
    
    This class is used to specify what resources a task needs to execute,
    including the type, amount, and any specific constraints.
    """
    resource_type: ResourceType
    amount: float
    unit: str
    priority: int = 0
    constraints: List[ResourceConstraint] = field(default_factory=list)
    preferred_resources: List[str] = field(default_factory=list)
    is_elastic: bool = False  # Whether the requirement can be satisfied with varying amounts
    
    def can_be_satisfied_by(self, resource: Resource) -> bool:
        """Check if this requirement can be satisfied by the given resource."""
        if resource.resource_type != self.resource_type:
            return False
            
        if resource.capacity.available() < self.amount:
            return False
            
        # Check if all constraints are satisfied
        for constraint in self.constraints:
            for key, value in resource.specification.capabilities.items():
                if key == constraint.name and not constraint.validate(value):
                    return False
                    
        return True

