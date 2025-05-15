#!/usr/bin/env python3
"""
Analysis Module

This module provides functionality for analyzing codebases, including code quality
analysis, dependency analysis, and structure analysis.
"""

import logging
import os
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from codegen_on_oss.analyzers.consolidated.core import (
    AnalysisResult,
    AnalysisType,
    BaseCodeAnalyzer,
    Issue,
    IssueCategory,
    IssueSeverity,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class CodeQualityAnalyzer(BaseCodeAnalyzer):
    """
    Analyzer for code quality issues.
    
    This analyzer checks for code quality issues such as complexity, style,
    and potential bugs.
    """
    
    def __init__(self, codebase_context=None):
        """
        Initialize the code quality analyzer.
        
        Args:
            codebase_context: Context for the codebase to analyze
        """
        super().__init__(codebase_context)
        self.analysis_type = AnalysisType.CODE_QUALITY
    
    def analyze(self) -> AnalysisResult:
        """
        Analyze the codebase for code quality issues.
        
        Returns:
            Analysis result containing code quality issues
        """
        logger.info("Analyzing code quality...")
        
        # Initialize result
        result = AnalysisResult(
            analysis_type=self.analysis_type,
            issues=[],
            summary={},
        )
        
        # Check for code quality issues
        self._check_complexity(result)
        self._check_style(result)
        self._check_potential_bugs(result)
        
        # Generate summary
        result.summary = {
            "total_issues": len(result.issues),
            "issues_by_severity": self._count_issues_by_severity(result.issues),
            "issues_by_category": self._count_issues_by_category(result.issues),
        }
        
        return result
    
    def _check_complexity(self, result: AnalysisResult):
        """
        Check for complexity issues.
        
        Args:
            result: Analysis result to update
        """
        # Get codebase
        codebase = self.codebase_context.codebase
        
        # Check function complexity
        for function in codebase.functions:
            # Skip test functions
            if self._is_test_function(function):
                continue
            
            # Check cyclomatic complexity
            complexity = self._calculate_cyclomatic_complexity(function)
            if complexity > 10:
                result.issues.append(
                    Issue(
                        code="high_complexity",
                        message=f"Function '{function.name}' has high cyclomatic complexity ({complexity})",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.COMPLEXITY,
                        location={
                            "file": function.file.file_path,
                            "line": function.line,
                        },
                        metadata={
                            "complexity": complexity,
                            "function_name": function.name,
                        },
                    )
                )
    
    def _check_style(self, result: AnalysisResult):
        """
        Check for style issues.
        
        Args:
            result: Analysis result to update
        """
        # Get codebase
        codebase = self.codebase_context.codebase
        
        # Check function naming
        for function in codebase.functions:
            # Skip test functions
            if self._is_test_function(function):
                continue
            
            # Check function name length
            if len(function.name) < 3:
                result.issues.append(
                    Issue(
                        code="short_name",
                        message=f"Function '{function.name}' has a short name",
                        severity=IssueSeverity.INFO,
                        category=IssueCategory.STYLE,
                        location={
                            "file": function.file.file_path,
                            "line": function.line,
                        },
                        metadata={
                            "function_name": function.name,
                        },
                    )
                )
    
    def _check_potential_bugs(self, result: AnalysisResult):
        """
        Check for potential bugs.
        
        Args:
            result: Analysis result to update
        """
        # Get codebase
        codebase = self.codebase_context.codebase
        
        # Check for unused imports
        for file in codebase.files:
            # Get imports
            imports = [imp for imp in codebase.imports if imp.file == file]
            
            # Check if imports are used
            for imp in imports:
                if not self._is_import_used(imp, file):
                    result.issues.append(
                        Issue(
                            code="unused_import",
                            message=f"Unused import '{imp.name}'",
                            severity=IssueSeverity.INFO,
                            category=IssueCategory.MAINTAINABILITY,
                            location={
                                "file": file.file_path,
                                "line": imp.line,
                            },
                            metadata={
                                "import_name": imp.name,
                            },
                        )
                    )
    
    def _is_test_function(self, function) -> bool:
        """
        Check if a function is a test function.
        
        Args:
            function: Function to check
            
        Returns:
            True if the function is a test function, False otherwise
        """
        # Check if the function is in a test file
        if "test" in function.file.file_path.lower():
            return True
        
        # Check if the function name starts with "test"
        if function.name.lower().startswith("test"):
            return True
        
        return False
    
    def _calculate_cyclomatic_complexity(self, function) -> int:
        """
        Calculate the cyclomatic complexity of a function.
        
        Args:
            function: Function to calculate complexity for
            
        Returns:
            Cyclomatic complexity
        """
        # This is a simplified implementation
        # In a real implementation, we would parse the function's AST
        # and count the number of branches
        return 1
    
    def _is_import_used(self, imp, file) -> bool:
        """
        Check if an import is used in a file.
        
        Args:
            imp: Import to check
            file: File to check
            
        Returns:
            True if the import is used, False otherwise
        """
        # This is a simplified implementation
        # In a real implementation, we would parse the file's AST
        # and check if the import is used
        return True
    
    def _count_issues_by_severity(self, issues: List[Issue]) -> Dict[str, int]:
        """
        Count issues by severity.
        
        Args:
            issues: List of issues
            
        Returns:
            Dictionary mapping severity to count
        """
        counts = {}
        for issue in issues:
            severity = issue.severity.value
            counts[severity] = counts.get(severity, 0) + 1
        return counts
    
    def _count_issues_by_category(self, issues: List[Issue]) -> Dict[str, int]:
        """
        Count issues by category.
        
        Args:
            issues: List of issues
            
        Returns:
            Dictionary mapping category to count
        """
        counts = {}
        for issue in issues:
            category = issue.category.value
            counts[category] = counts.get(category, 0) + 1
        return counts


def get_codebase_summary(codebase) -> Dict[str, Any]:
    """
    Get a summary of the codebase.
    
    Args:
        codebase: Codebase to summarize
        
    Returns:
        Dictionary containing codebase summary
    """
    # Count files by extension
    files_by_extension = {}
    for file in codebase.files:
        ext = os.path.splitext(file.file_path)[1]
        files_by_extension[ext] = files_by_extension.get(ext, 0) + 1
    
    # Count symbols
    symbols_count = {
        "functions": len(list(codebase.functions)),
        "classes": len(list(codebase.classes)),
        "imports": len(list(codebase.imports)),
    }
    
    # Generate summary
    summary = {
        "files_count": len(list(codebase.files)),
        "files_by_extension": files_by_extension,
        "symbols_count": symbols_count,
    }
    
    return summary


def analyze_codebase_structure(codebase) -> Dict[str, Any]:
    """
    Analyze the structure of a codebase.
    
    Args:
        codebase: Codebase to analyze
        
    Returns:
        Dictionary containing codebase structure analysis
    """
    # Get file structure
    file_structure = {}
    for file in codebase.files:
        # Get directory
        directory = os.path.dirname(file.file_path)
        
        # Add to structure
        if directory not in file_structure:
            file_structure[directory] = []
        
        file_structure[directory].append(file.file_path)
    
    # Generate analysis
    analysis = {
        "file_structure": file_structure,
    }
    
    return analysis


def analyze_dependencies(codebase) -> Dict[str, Any]:
    """
    Analyze dependencies in a codebase.
    
    Args:
        codebase: Codebase to analyze
        
    Returns:
        Dictionary containing dependency analysis
    """
    # Get imports
    imports = list(codebase.imports)
    
    # Build dependency graph
    dependency_graph = {}
    for imp in imports:
        # Get source and target
        source = imp.file.file_path
        target = imp.name
        
        # Add to graph
        if source not in dependency_graph:
            dependency_graph[source] = []
        
        dependency_graph[source].append(target)
    
    # Find circular dependencies
    circular_dependencies = find_circular_dependencies(dependency_graph)
    
    # Generate analysis
    analysis = {
        "dependency_graph": dependency_graph,
        "circular_dependencies": {
            "circular_imports": circular_dependencies,
        },
    }
    
    return analysis


def find_circular_dependencies(dependency_graph: Dict[str, List[str]]) -> List[List[str]]:
    """
    Find circular dependencies in a dependency graph.
    
    Args:
        dependency_graph: Dependency graph
        
    Returns:
        List of circular dependencies
    """
    # This is a simplified implementation
    # In a real implementation, we would use a graph algorithm
    # to find cycles in the dependency graph
    return []

