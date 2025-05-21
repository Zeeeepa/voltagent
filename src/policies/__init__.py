"""
Resource Management System Policies Package

This package contains the resource allocation policies and strategies.
"""

from .allocation_policy import (
    AllocationPolicyType,
    ResourceQuota,
    AllocationWeight,
    AllocationPolicy,
    FairAllocationPolicy,
    PriorityAllocationPolicy,
    QuotaAllocationPolicy,
    WeightedAllocationPolicy
)

__all__ = [
    'AllocationPolicyType',
    'ResourceQuota',
    'AllocationWeight',
    'AllocationPolicy',
    'FairAllocationPolicy',
    'PriorityAllocationPolicy',
    'QuotaAllocationPolicy',
    'WeightedAllocationPolicy'
]

