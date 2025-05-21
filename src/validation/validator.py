"""
Resource Constraint Validator Module

This module implements mechanisms for validating resource constraints and requirements
in the Resource Management System. It provides tools to ensure that resource allocations
satisfy all defined constraints and requirements.
"""

from typing import Dict, List, Set, Optional, Tuple, Callable, Any
from enum import Enum
from dataclasses import dataclass, field

from ..models import Resource, ResourceType, ResourceRequirement, ResourceConstraint


class ValidationResult:
    """
    Represents the result of a resource constraint validation.
    
    This class provides detailed information about whether a resource allocation
    satisfies all defined constraints and requirements.
    """
    def __init__(self):
        self.is_valid = True
        self.violations: List[str] = []
        
    def add_violation(self, message: str) -> None:
        """
        Add a constraint violation.
        
        Args:
            message: Description of the violation
        """
        self.is_valid = False
        self.violations.append(message)
        
    def merge(self, other: 'ValidationResult') -> None:
        """
        Merge another validation result into this one.
        
        Args:
            other: The validation result to merge
        """
        if not other.is_valid:
            self.is_valid = False
            self.violations.extend(other.violations)


class ResourceValidator:
    """
    Validates resource constraints and requirements.
    
    This class is responsible for ensuring that resource allocations satisfy
    all defined constraints and requirements, preventing invalid allocations.
    """
    def __init__(self):
        self.custom_validators: Dict[str, Callable[[Resource, ResourceRequirement], ValidationResult]] = {}
        
    def validate_resource_for_requirement(
        self,
        resource: Resource,
        requirement: ResourceRequirement
    ) -> ValidationResult:
        """
        Validate if a resource satisfies a requirement.
        
        Args:
            resource: The resource to validate
            requirement: The requirement to validate against
            
        Returns:
            ValidationResult: The validation result
        """
        result = ValidationResult()
        
        # Check resource type
        if resource.resource_type != requirement.resource_type:
            result.add_violation(
                f"Resource type mismatch: {resource.resource_type.value} != {requirement.resource_type.value}"
            )
            return result  # Early return for type mismatch
            
        # Check capacity
        if resource.capacity.available() < requirement.amount:
            result.add_violation(
                f"Insufficient capacity: {resource.capacity.available()} < {requirement.amount}"
            )
            
        # Check constraints
        for constraint in requirement.constraints:
            # Find the matching capability in the resource
            if constraint.name in resource.specification.capabilities:
                capability_value = resource.specification.capabilities[constraint.name]
                
                if not constraint.validate(capability_value):
                    result.add_violation(
                        f"Constraint violation for {constraint.name}: "
                        f"value {capability_value} does not satisfy constraint"
                    )
            else:
                result.add_violation(
                    f"Missing capability: {constraint.name} not found in resource"
                )
                
        # Apply custom validators
        for validator_name, validator_func in self.custom_validators.items():
            custom_result = validator_func(resource, requirement)
            result.merge(custom_result)
            
        return result
        
    def validate_resources_for_requirements(
        self,
        resources: List[Resource],
        requirements: List[ResourceRequirement]
    ) -> ValidationResult:
        """
        Validate if a set of resources satisfies a set of requirements.
        
        Args:
            resources: The resources to validate
            requirements: The requirements to validate against
            
        Returns:
            ValidationResult: The validation result
        """
        result = ValidationResult()
        
        # Group resources by type
        resources_by_type: Dict[ResourceType, List[Resource]] = {}
        for resource in resources:
            if resource.resource_type not in resources_by_type:
                resources_by_type[resource.resource_type] = []
            resources_by_type[resource.resource_type].append(resource)
            
        # Check each requirement
        for requirement in requirements:
            resource_type = requirement.resource_type
            
            # Check if we have resources of this type
            if resource_type not in resources_by_type:
                result.add_violation(
                    f"No resources of type {resource_type.value} available"
                )
                continue
                
            # Find a resource that satisfies this requirement
            satisfied = False
            for resource in resources_by_type[resource_type]:
                validation = self.validate_resource_for_requirement(resource, requirement)
                
                if validation.is_valid:
                    satisfied = True
                    break
                    
            if not satisfied:
                result.add_violation(
                    f"No resource of type {resource_type.value} satisfies the requirement"
                )
                
        return result
        
    def register_custom_validator(
        self,
        name: str,
        validator_func: Callable[[Resource, ResourceRequirement], ValidationResult]
    ) -> None:
        """
        Register a custom validator function.
        
        Args:
            name: Name of the validator
            validator_func: Function that validates a resource against a requirement
        """
        self.custom_validators[name] = validator_func
        
    def unregister_custom_validator(self, name: str) -> bool:
        """
        Unregister a custom validator function.
        
        Args:
            name: Name of the validator to unregister
            
        Returns:
            bool: True if the validator was unregistered, False if not found
        """
        if name in self.custom_validators:
            del self.custom_validators[name]
            return True
        return False


class ResourceConstraintValidator:
    """
    Validates specific resource constraints.
    
    This class provides specialized validation for different types of resource
    constraints, such as capacity, performance, and compatibility constraints.
    """
    def validate_capacity_constraint(
        self,
        resource: Resource,
        min_capacity: float,
        max_capacity: Optional[float] = None
    ) -> ValidationResult:
        """
        Validate a capacity constraint.
        
        Args:
            resource: The resource to validate
            min_capacity: Minimum required capacity
            max_capacity: Optional maximum allowed capacity
            
        Returns:
            ValidationResult: The validation result
        """
        result = ValidationResult()
        
        available_capacity = resource.capacity.available()
        
        if available_capacity < min_capacity:
            result.add_violation(
                f"Insufficient capacity: {available_capacity} < {min_capacity}"
            )
            
        if max_capacity is not None and available_capacity > max_capacity:
            result.add_violation(
                f"Excessive capacity: {available_capacity} > {max_capacity}"
            )
            
        return result
        
    def validate_capability_constraint(
        self,
        resource: Resource,
        capability_name: str,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        required_values: Optional[List[Any]] = None,
        excluded_values: Optional[List[Any]] = None
    ) -> ValidationResult:
        """
        Validate a capability constraint.
        
        Args:
            resource: The resource to validate
            capability_name: Name of the capability to validate
            min_value: Optional minimum required value
            max_value: Optional maximum allowed value
            required_values: Optional list of required values
            excluded_values: Optional list of excluded values
            
        Returns:
            ValidationResult: The validation result
        """
        result = ValidationResult()
        
        # Check if the capability exists
        if capability_name not in resource.specification.capabilities:
            result.add_violation(
                f"Missing capability: {capability_name} not found in resource"
            )
            return result
            
        capability_value = resource.specification.capabilities[capability_name]
        
        # Check numeric constraints
        if isinstance(capability_value, (int, float)):
            if min_value is not None and capability_value < min_value:
                result.add_violation(
                    f"Capability {capability_name} below minimum: {capability_value} < {min_value}"
                )
                
            if max_value is not None and capability_value > max_value:
                result.add_violation(
                    f"Capability {capability_name} above maximum: {capability_value} > {max_value}"
                )
                
        # Check value constraints
        if required_values is not None and capability_value not in required_values:
            result.add_violation(
                f"Capability {capability_name} not in required values: {capability_value}"
            )
            
        if excluded_values is not None and capability_value in excluded_values:
            result.add_violation(
                f"Capability {capability_name} in excluded values: {capability_value}"
            )
            
        return result
        
    def validate_compatibility_constraint(
        self,
        resource: Resource,
        compatible_resources: List[Resource]
    ) -> ValidationResult:
        """
        Validate a compatibility constraint.
        
        Args:
            resource: The resource to validate
            compatible_resources: List of resources that must be compatible
            
        Returns:
            ValidationResult: The validation result
        """
        result = ValidationResult()
        
        # This is a simplified compatibility check
        # In a real system, this would involve more complex compatibility rules
        
        for compatible_resource in compatible_resources:
            # Check if the resources have compatible capabilities
            for key, value in resource.specification.capabilities.items():
                if key in compatible_resource.specification.capabilities:
                    compatible_value = compatible_resource.specification.capabilities[key]
                    
                    if value != compatible_value:
                        result.add_violation(
                            f"Compatibility issue: {resource.name} has {key}={value}, "
                            f"but {compatible_resource.name} has {key}={compatible_value}"
                        )
                        
        return result

