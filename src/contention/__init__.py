"""
Resource Management System Contention Package

This package contains the resource contention detection and resolution mechanisms.
"""

from .detector import (
    ContentionSeverity,
    ContentionResolutionStrategy,
    ContentionEvent,
    ContentionDetector,
    ContentionResolver
)

__all__ = [
    'ContentionSeverity',
    'ContentionResolutionStrategy',
    'ContentionEvent',
    'ContentionDetector',
    'ContentionResolver'
]

