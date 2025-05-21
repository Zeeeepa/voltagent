"""
Tests for the resource model module.
"""

import unittest
from src.models import (
    ResourceType,
    ResourceState,
    ResourceCapacity,
    ResourceConstraint,
    ResourceSpecification,
    Resource,
    ResourceRequirement
)


class TestResourceModel(unittest.TestCase):
    """Test cases for the resource model classes."""
    
    def test_resource_capacity(self):
        """Test ResourceCapacity calculations."""
        capacity = ResourceCapacity(current=30, maximum=100, unit="GB")
        
        self.assertEqual(capacity.available(), 70)
        self.assertEqual(capacity.utilization_percentage(), 30)
        
        # Test edge case with zero maximum
        zero_capacity = ResourceCapacity(current=0, maximum=0, unit="GB")
        self.assertEqual(zero_capacity.available(), 0)
        self.assertEqual(zero_capacity.utilization_percentage(), 0)
        
    def test_resource_constraint(self):
        """Test ResourceConstraint validation."""
        # Numeric constraint
        num_constraint = ResourceConstraint(
            name="memory",
            min_value=8,
            max_value=32
        )
        
        self.assertTrue(num_constraint.validate(16))
        self.assertTrue(num_constraint.validate(8))
        self.assertTrue(num_constraint.validate(32))
        self.assertFalse(num_constraint.validate(4))
        self.assertFalse(num_constraint.validate(64))
        
        # String constraint with required values
        str_constraint = ResourceConstraint(
            name="os",
            required_values=["linux", "windows"]
        )
        
        self.assertTrue(str_constraint.validate("linux"))
        self.assertTrue(str_constraint.validate("windows"))
        self.assertFalse(str_constraint.validate("macos"))
        
        # String constraint with excluded values
        excl_constraint = ResourceConstraint(
            name="arch",
            excluded_values=["arm"]
        )
        
        self.assertTrue(excl_constraint.validate("x86_64"))
        self.assertFalse(excl_constraint.validate("arm"))
        
    def test_resource_specification(self):
        """Test ResourceSpecification validation."""
        spec = ResourceSpecification(
            resource_type=ResourceType.COMPUTE,
            capabilities={
                "cores": 8,
                "memory": 16,
                "arch": "x86_64",
                "gpu": False
            }
        )
        
        # Test capability validation
        self.assertTrue(spec.validate_capabilities({"cores": 4}))
        self.assertTrue(spec.validate_capabilities({"memory": 8}))
        self.assertTrue(spec.validate_capabilities({"arch": "x86_64"}))
        self.assertFalse(spec.validate_capabilities({"cores": 16}))
        self.assertFalse(spec.validate_capabilities({"memory": 32}))
        self.assertFalse(spec.validate_capabilities({"arch": "arm"}))
        self.assertFalse(spec.validate_capabilities({"unknown": "value"}))
        
    def test_resource(self):
        """Test Resource operations."""
        resource = Resource(
            name="compute-node-1",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=100, unit="cores"),
            state=ResourceState.AVAILABLE,
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "cores": 32,
                    "memory": 128,
                    "arch": "x86_64"
                }
            )
        )
        
        # Test availability
        self.assertTrue(resource.is_available())
        
        # Test reservation
        self.assertTrue(resource.reserve(50, "task-1"))
        self.assertEqual(resource.capacity.current, 50)
        self.assertEqual(resource.owner_id, "task-1")
        
        # Test partial availability after reservation
        self.assertTrue(resource.is_available())
        
        # Test another reservation
        self.assertTrue(resource.reserve(50, "task-2"))
        self.assertEqual(resource.capacity.current, 100)
        self.assertEqual(resource.state, ResourceState.RESERVED)
        self.assertEqual(resource.owner_id, "task-2")
        
        # Test availability after full reservation
        self.assertFalse(resource.is_available())
        
        # Test failed reservation when full
        self.assertFalse(resource.reserve(10, "task-3"))
        
        # Test release
        self.assertTrue(resource.release(60))
        self.assertEqual(resource.capacity.current, 40)
        self.assertEqual(resource.state, ResourceState.AVAILABLE)
        
        # Test full release
        self.assertTrue(resource.release(40))
        self.assertEqual(resource.capacity.current, 0)
        self.assertIsNone(resource.owner_id)
        
    def test_resource_requirement(self):
        """Test ResourceRequirement matching."""
        requirement = ResourceRequirement(
            resource_type=ResourceType.COMPUTE,
            amount=16,
            unit="cores",
            priority=1,
            constraints=[
                ResourceConstraint(name="arch", required_values=["x86_64"]),
                ResourceConstraint(name="memory", min_value=64)
            ]
        )
        
        # Create a matching resource
        matching_resource = Resource(
            name="compute-node-1",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=32, unit="cores"),
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "arch": "x86_64",
                    "memory": 128
                }
            )
        )
        
        # Create a non-matching resource (wrong architecture)
        wrong_arch_resource = Resource(
            name="compute-node-2",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=32, unit="cores"),
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "arch": "arm",
                    "memory": 128
                }
            )
        )
        
        # Create a non-matching resource (insufficient memory)
        low_memory_resource = Resource(
            name="compute-node-3",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=32, unit="cores"),
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "arch": "x86_64",
                    "memory": 32
                }
            )
        )
        
        # Create a non-matching resource (insufficient capacity)
        low_capacity_resource = Resource(
            name="compute-node-4",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=8, unit="cores"),
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "arch": "x86_64",
                    "memory": 128
                }
            )
        )
        
        # Test matching
        self.assertTrue(requirement.can_be_satisfied_by(matching_resource))
        self.assertFalse(requirement.can_be_satisfied_by(wrong_arch_resource))
        self.assertFalse(requirement.can_be_satisfied_by(low_memory_resource))
        self.assertFalse(requirement.can_be_satisfied_by(low_capacity_resource))


if __name__ == "__main__":
    unittest.main()

