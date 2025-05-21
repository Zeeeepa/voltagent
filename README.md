# Resource Management System

A system to optimize resource allocation and utilization across parallel workstreams in the Workflow Orchestration Framework.

## Overview

The Resource Management System provides tools for resource modeling, reservation, allocation, monitoring, pooling, scaling, and policy enforcement to efficiently manage resources in a parallel workflow orchestration framework.

## Features

- **Resource Modeling and Specification**: Flexible resource model that can represent various types of resources with detailed capabilities and constraints.
- **Resource Reservation and Release Protocols**: Mechanisms for safely reserving and releasing resources with different allocation strategies.
- **Resource Contention Detection and Resolution**: Tools to identify and resolve conflicts when multiple tasks compete for the same resources.
- **Resource Utilization Monitoring and Metrics**: Comprehensive metrics collection and visualization for resource usage and performance.
- **Resource Pooling and Sharing**: Efficient sharing of resources among multiple tasks with different pooling strategies.
- **Dynamic Resource Scaling**: Automatic adjustment of resource capacity based on demand and utilization.
- **Resource Allocation Policies**: Various policies for resource allocation, including fair, priority-based, quota-based, and weighted allocation.
- **Resource Constraint Validation**: Validation mechanisms to ensure that resource allocations satisfy all defined constraints.

## Architecture

The system is organized into several key components:

- **Models**: Core data models for resources, requirements, and constraints
- **Protocols**: Protocols for resource reservation and release
- **Allocation**: Algorithms for resource allocation and scheduling
- **Contention**: Detection and resolution of resource contention
- **Monitoring**: Metrics collection and dashboard for resource utilization
- **Pooling**: Resource pooling and sharing mechanisms
- **Scaling**: Dynamic resource scaling based on demand
- **Policies**: Resource allocation policies and enforcement
- **Validation**: Validation of resource constraints and requirements

For more details, see the [Architecture Documentation](docs/architecture.md).

## Usage

### Resource Definition

```python
from resource_management.models import (
    ResourceType,
    ResourceCapacity,
    ResourceSpecification,
    Resource
)

# Create a compute resource
compute_resource = Resource(
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
```

### Resource Reservation

```python
from resource_management.protocols import (
    ReservationManager,
    ReservationStrategy
)
from resource_management.models import ResourceRequirement

# Create a reservation manager
manager = ReservationManager()
manager.register_resource(compute_resource)

# Define resource requirements
compute_requirement = ResourceRequirement(
    resource_type=ResourceType.COMPUTE,
    amount=50,
    unit="cores"
)

# Create a reservation
reservation = manager.create_reservation(
    requester_id="task-1",
    requirements=[compute_requirement],
    strategy=ReservationStrategy.BALANCED
)

# Confirm the reservation
manager.confirm_reservation(reservation.id)

# Use the resources...

# Release the reservation when done
manager.release_reservation(reservation.id)
```

### Resource Allocation with Policies

```python
from resource_management.allocation import ResourceAllocator
from resource_management.policies import (
    PriorityAllocationPolicy,
    QuotaAllocationPolicy,
    ResourceQuota
)

# Create an allocator with a reservation manager
allocator = ResourceAllocator(manager)

# Create a priority-based allocation policy
priority_policy = PriorityAllocationPolicy("task-priority")
priority_policy.set_requester_priority("task-1", 10)  # High priority
priority_policy.set_requester_priority("task-2", 5)   # Medium priority

# Allocate resources using the policy
result = priority_policy.allocate(
    allocator=allocator,
    requester_id="task-1",
    requirements=[compute_requirement]
)

# Check allocation result
if result.is_successful():
    print("Resources allocated successfully")
    # Use the resources...
else:
    print("Resource allocation failed:", result.message)
```

### Resource Monitoring

```python
from resource_management.monitoring import (
    MetricsCollector,
    ResourceMetricsCollector,
    ResourceDashboard
)

# Create metrics collectors
metrics_collector = MetricsCollector()
resource_metrics = ResourceMetricsCollector(metrics_collector)

# Register resources for monitoring
resource_metrics.register_resource(compute_resource)

# Collect utilization metrics
resource_metrics.collect_utilization_metrics()

# Create a dashboard
dashboard = ResourceDashboard(metrics_collector)

# Get dashboard data
dashboard_data = dashboard.get_dashboard_data()
```

## Optimization Strategies

The system supports various strategies for optimizing resource allocation and utilization:

- **Allocation Strategies**: Greedy, balanced, priority-based, quota-based
- **Pooling Strategies**: Static, dynamic, elastic
- **Contention Resolution**: Wait, priority, preempt, scale, redistribute
- **Scaling Strategies**: Threshold-based, predictive, rate-of-change
- **Efficiency Optimization**: Bin packing, resource affinity, anti-affinity

For more details, see the [Optimization Strategies Documentation](docs/optimization_strategies.md).

## Dependencies

- Python 3.8+
- Standard library modules (no external dependencies)

## Testing

Run the tests using the standard unittest framework:

```bash
python -m unittest discover tests
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

