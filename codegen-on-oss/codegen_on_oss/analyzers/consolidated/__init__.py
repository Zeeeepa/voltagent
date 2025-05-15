#!/usr/bin/env python3
"""
Consolidated Analyzers Package

This package provides a consolidated set of code analyzers for analyzing codebases.
It includes functionality for code quality analysis, dependency analysis, and more.
"""

# Import core components
from codegen_on_oss.analyzers.consolidated.core import (
    AnalysisResult,
    AnalysisType,
    BaseCodeAnalyzer,
    CodeLocation,
    Issue,
    IssueCategory,
    IssueCollection,
    IssueSeverity,
    IssueStatus,
    create_issue,
)

# Import visualization components
from codegen_on_oss.analyzers.consolidated.visualization import (
    Visualizer,
    create_visualizer,
)

__all__ = [
    # Core
    "AnalysisResult",
    "AnalysisType",
    "BaseCodeAnalyzer",
    "CodeLocation",
    "Issue",
    "IssueCategory",
    "IssueCollection",
    "IssueSeverity",
    "IssueStatus",
    "create_issue",
    
    # Visualization
    "Visualizer",
    "create_visualizer",
]

