"""
Tests for the resource reservation protocol module.
"""

import unittest
import time
from src.models import (
    ResourceType,
    ResourceState,
    ResourceCapacity,
    ResourceSpecification,
    Resource,
    ResourceRequirement
)
from src.protocols import (
    ReservationStatus,
    ReservationStrategy,
    Reservation,
    ReservationManager
)


class TestReservationProtocol(unittest.TestCase):
    """Test cases for the reservation protocol classes."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create test resources
        self.compute_resource = Resource(
            name="compute-node-1",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=100, unit="cores"),
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "cores": 32,
                    "memory": 128,
                    "arch": "x86_64"
                }
            )
        )
        
        self.memory_resource = Resource(
            name="memory-node-1",
            resource_type=ResourceType.MEMORY,
            capacity=ResourceCapacity(current=0, maximum=256, unit="GB"),
            specification=ResourceSpecification(
                resource_type=ResourceType.MEMORY,
                capabilities={
                    "type": "ddr4",
                    "speed": 3200
                }
            )
        )
        
        # Create test requirements
        self.compute_requirement = ResourceRequirement(
            resource_type=ResourceType.COMPUTE,
            amount=50,
            unit="cores"
        )
        
        self.memory_requirement = ResourceRequirement(
            resource_type=ResourceType.MEMORY,
            amount=128,
            unit="GB"
        )
        
        # Create reservation manager
        self.manager = ReservationManager()
        self.manager.register_resource(self.compute_resource)
        self.manager.register_resource(self.memory_resource)
        
    def test_reservation_creation(self):
        """Test creating a reservation."""
        reservation = Reservation(
            requester_id="task-1",
            requirements=[self.compute_requirement],
            strategy=ReservationStrategy.BALANCED,
            timeout_seconds=60
        )
        
        self.assertEqual(reservation.requester_id, "task-1")
        self.assertEqual(reservation.status, ReservationStatus.PENDING)
        self.assertFalse(reservation.is_expired())
        
        # Test expiration
        reservation.expires_at = time.time() - 10
        self.assertTrue(reservation.is_expired())
        
    def test_reservation_confirmation(self):
        """Test confirming a reservation."""
        reservation = Reservation(
            requester_id="task-1",
            requirements=[self.compute_requirement],
            strategy=ReservationStrategy.BALANCED,
            timeout_seconds=60
        )
        
        # Add a resource to the reservation
        resource = self.compute_resource
        resource.reserve(50, "task-1")
        reservation.allocated_resources[resource.id] = (resource, 50)
        
        # Confirm the reservation
        self.assertTrue(reservation.confirm())
        self.assertEqual(reservation.status, ReservationStatus.CONFIRMED)
        self.assertEqual(resource.state, ResourceState.IN_USE)
        
        # Test confirming an already confirmed reservation
        self.assertFalse(reservation.confirm())
        
    def test_reservation_release(self):
        """Test releasing a reservation."""
        reservation = Reservation(
            requester_id="task-1",
            requirements=[self.compute_requirement],
            strategy=ReservationStrategy.BALANCED,
            timeout_seconds=60
        )
        
        # Add a resource to the reservation
        resource = self.compute_resource
        resource.reserve(50, "task-1")
        reservation.allocated_resources[resource.id] = (resource, 50)
        
        # Confirm the reservation
        reservation.confirm()
        
        # Release the reservation
        self.assertTrue(reservation.release())
        self.assertEqual(reservation.status, ReservationStatus.RELEASED)
        self.assertEqual(resource.state, ResourceState.AVAILABLE)
        self.assertEqual(resource.capacity.current, 0)
        
        # Test releasing an already released reservation
        self.assertFalse(reservation.release())
        
    def test_reservation_manager_create(self):
        """Test creating a reservation through the manager."""
        # Create a reservation with the manager
        reservation = self.manager.create_reservation(
            requester_id="task-1",
            requirements=[self.compute_requirement, self.memory_requirement],
            strategy=ReservationStrategy.BALANCED
        )
        
        self.assertEqual(reservation.status, ReservationStatus.PENDING)
        self.assertEqual(len(reservation.allocated_resources), 2)
        
        # Check that resources were allocated
        compute_allocated = False
        memory_allocated = False
        
        for resource_id, (resource, amount) in reservation.allocated_resources.items():
            if resource.resource_type == ResourceType.COMPUTE:
                compute_allocated = True
                self.assertEqual(amount, 50)
            elif resource.resource_type == ResourceType.MEMORY:
                memory_allocated = True
                self.assertEqual(amount, 128)
                
        self.assertTrue(compute_allocated)
        self.assertTrue(memory_allocated)
        
    def test_reservation_manager_confirm(self):
        """Test confirming a reservation through the manager."""
        # Create a reservation with the manager
        reservation = self.manager.create_reservation(
            requester_id="task-1",
            requirements=[self.compute_requirement],
            strategy=ReservationStrategy.BALANCED
        )
        
        # Confirm the reservation
        self.assertTrue(self.manager.confirm_reservation(reservation.id))
        
        # Check that the reservation was confirmed
        self.assertEqual(reservation.status, ReservationStatus.CONFIRMED)
        
        # Check that the resource state was updated
        for resource_id, (resource, _) in reservation.allocated_resources.items():
            self.assertEqual(resource.state, ResourceState.IN_USE)
            
    def test_reservation_manager_release(self):
        """Test releasing a reservation through the manager."""
        # Create a reservation with the manager
        reservation = self.manager.create_reservation(
            requester_id="task-1",
            requirements=[self.compute_requirement],
            strategy=ReservationStrategy.BALANCED
        )
        
        # Confirm the reservation
        self.manager.confirm_reservation(reservation.id)
        
        # Release the reservation
        self.assertTrue(self.manager.release_reservation(reservation.id))
        
        # Check that the reservation was released
        self.assertEqual(reservation.status, ReservationStatus.RELEASED)
        
        # Check that the resource state was updated
        for resource_id, (resource, _) in reservation.allocated_resources.items():
            self.assertEqual(resource.state, ResourceState.AVAILABLE)
            self.assertEqual(resource.capacity.current, 0)
            
    def test_reservation_manager_cleanup(self):
        """Test cleaning up expired reservations."""
        # Create a reservation with a short timeout
        reservation = self.manager.create_reservation(
            requester_id="task-1",
            requirements=[self.compute_requirement],
            strategy=ReservationStrategy.BALANCED,
            timeout_seconds=1
        )
        
        # Wait for the reservation to expire
        time.sleep(1.1)
        
        # Clean up expired reservations
        count = self.manager.cleanup_expired_reservations()
        
        self.assertEqual(count, 1)
        self.assertEqual(reservation.status, ReservationStatus.EXPIRED)
        
        # Check that resources were released
        for resource_id, (resource, _) in reservation.allocated_resources.items():
            self.assertEqual(resource.capacity.current, 0)
            
    def test_reservation_strategies(self):
        """Test different reservation strategies."""
        # Create additional resources for testing strategies
        compute_resource2 = Resource(
            name="compute-node-2",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=100, unit="cores"),
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "cores": 32,
                    "memory": 128,
                    "arch": "x86_64"
                }
            )
        )
        
        compute_resource3 = Resource(
            name="compute-node-3",
            resource_type=ResourceType.COMPUTE,
            capacity=ResourceCapacity(current=0, maximum=100, unit="cores"),
            specification=ResourceSpecification(
                resource_type=ResourceType.COMPUTE,
                capabilities={
                    "cores": 32,
                    "memory": 128,
                    "arch": "x86_64"
                }
            )
        )
        
        # Register the additional resources
        self.manager.register_resource(compute_resource2)
        self.manager.register_resource(compute_resource3)
        
        # Pre-allocate some resources to create different utilization levels
        compute_resource2.reserve(30, "other-task")
        compute_resource3.reserve(70, "other-task")
        
        # Test greedy strategy (should prefer compute_resource with most available)
        greedy_reservation = self.manager.create_reservation(
            requester_id="task-greedy",
            requirements=[ResourceRequirement(
                resource_type=ResourceType.COMPUTE,
                amount=20,
                unit="cores"
            )],
            strategy=ReservationStrategy.GREEDY
        )
        
        # The greedy strategy should have chosen the resource with most available capacity
        greedy_allocated = False
        for resource_id, (resource, amount) in greedy_reservation.allocated_resources.items():
            if resource.name == "compute-node-1":
                greedy_allocated = True
                
        self.assertTrue(greedy_allocated)
        
        # Test balanced strategy (should prefer least utilized resource)
        balanced_reservation = self.manager.create_reservation(
            requester_id="task-balanced",
            requirements=[ResourceRequirement(
                resource_type=ResourceType.COMPUTE,
                amount=20,
                unit="cores"
            )],
            strategy=ReservationStrategy.BALANCED
        )
        
        # The balanced strategy should have chosen the resource with lowest utilization
        balanced_allocated = False
        for resource_id, (resource, amount) in balanced_reservation.allocated_resources.items():
            if resource.name == "compute-node-1" or resource.name == "compute-node-2":
                balanced_allocated = True
                
        self.assertTrue(balanced_allocated)


if __name__ == "__main__":
    unittest.main()

