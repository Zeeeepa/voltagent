#!/usr/bin/env python3
"""
Visualization Package

This package provides visualization functionality for codebase analysis results.
It includes visualizations for call graphs, dependency graphs, and structure graphs.
"""

import logging
from typing import Any, Dict, List, Optional, Set, Tuple, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class Visualizer:
    """
    Main visualizer class that provides a unified interface for all visualizations.
    
    This class serves as a facade for the various visualization components,
    making it easy to generate different types of visualizations.
    """
    
    def __init__(self):
        """Initialize the visualizer."""
        self._call_graph_visualizer = None
        self._dependency_graph_visualizer = None
        self._structure_graph_visualizer = None
    
    def generate_module_dependency_graph(
        self,
        codebase_context,
        module_path: str = None,
        layout: str = "hierarchical",
    ) -> dict[str, Any]:
        """
        Generate a module dependency graph.
        
        Args:
            codebase_context: Context for the codebase to visualize
            module_path: Path to the specific module to visualize
            layout: Layout algorithm to use
            
        Returns:
            Dictionary containing the visualization data
        """
        # Lazy-load the dependency graph visualizer
        if self._dependency_graph_visualizer is None:
            from codegen_on_oss.analyzers.visualization.dependency_graph.dependency_trace import (
                DependencyGraphVisualizer,
            )
            self._dependency_graph_visualizer = DependencyGraphVisualizer()
        
        # Generate the visualization
        return self._dependency_graph_visualizer.generate_graph(
            codebase_context=codebase_context,
            module_path=module_path,
            layout=layout,
        )
    
    def generate_function_call_graph(
        self,
        functions,
        codebase_context,
        depth: int = 2,
        layout: str = "hierarchical",
    ) -> dict[str, Any]:
        """
        Generate a function call graph.
        
        Args:
            functions: Function(s) to visualize
            codebase_context: Context for the codebase to visualize
            depth: Maximum depth of the call graph
            layout: Layout algorithm to use
            
        Returns:
            Dictionary containing the visualization data
        """
        # Lazy-load the call graph visualizer
        if self._call_graph_visualizer is None:
            from codegen_on_oss.analyzers.visualization.call_graph.call_trace import (
                CallGraphVisualizer,
            )
            self._call_graph_visualizer = CallGraphVisualizer()
        
        # Generate the visualization
        return self._call_graph_visualizer.generate_graph(
            functions=functions,
            codebase_context=codebase_context,
            depth=depth,
            layout=layout,
        )
    
    def generate_class_diagram(
        self,
        codebase_context,
        class_name: str = None,
        module_name: str = None,
        include_methods: bool = True,
        include_attributes: bool = True,
    ) -> dict[str, Any]:
        """
        Generate a class diagram.
        
        Args:
            codebase_context: Context for the codebase to visualize
            class_name: Name of the class to visualize
            module_name: Name of the module containing the class
            include_methods: Whether to include methods in the diagram
            include_attributes: Whether to include attributes in the diagram
            
        Returns:
            Dictionary containing the visualization data
        """
        # Lazy-load the structure graph visualizer
        if self._structure_graph_visualizer is None:
            from codegen_on_oss.analyzers.visualization.structure_graph.graph_viz_dir_tree import (
                StructureGraphVisualizer,
            )
            self._structure_graph_visualizer = StructureGraphVisualizer()
        
        # Generate the visualization
        return self._structure_graph_visualizer.generate_class_diagram(
            codebase_context=codebase_context,
            class_name=class_name,
            module_name=module_name,
            include_methods=include_methods,
            include_attributes=include_attributes,
        )
    
    def generate_sequence_diagram(
        self,
        codebase_context,
        function_name: str,
        file_path: str = None,
        max_depth: int = 3,
    ) -> dict[str, Any]:
        """
        Generate a sequence diagram.
        
        Args:
            codebase_context: Context for the codebase to visualize
            function_name: Name of the function to visualize
            file_path: Path to the file containing the function
            max_depth: Maximum depth of the sequence diagram
            
        Returns:
            Dictionary containing the visualization data
        """
        # Lazy-load the call graph visualizer
        if self._call_graph_visualizer is None:
            from codegen_on_oss.analyzers.visualization.call_graph.call_trace import (
                CallGraphVisualizer,
            )
            self._call_graph_visualizer = CallGraphVisualizer()
        
        # Generate the visualization
        return self._call_graph_visualizer.generate_sequence_diagram(
            codebase_context=codebase_context,
            function_name=function_name,
            file_path=file_path,
            max_depth=max_depth,
        )
    
    def export(self, visualization: dict[str, Any], format: str = "json") -> dict[str, Any]:
        """
        Export a visualization to a specific format.
        
        Args:
            visualization: Visualization data to export
            format: Format to export to
            
        Returns:
            Dictionary containing the exported visualization
        """
        if format == "json":
            return visualization
        
        if format == "dot":
            return self._export_to_dot(visualization)
        
        if format == "graphml":
            return self._export_to_graphml(visualization)
        
        if format == "plantuml":
            return self._export_to_plantuml(visualization)
        
        raise ValueError(f"Unsupported format: {format}")
    
    def _export_to_dot(self, visualization: dict[str, Any]) -> dict[str, Any]:
        """Export to DOT format."""
        # Implementation would go here
        return {"format": "dot", "content": "digraph G { /* DOT content */ }"}
    
    def _export_to_graphml(self, visualization: dict[str, Any]) -> dict[str, Any]:
        """Export to GraphML format."""
        # Implementation would go here
        return {"format": "graphml", "content": "<graphml><!-- GraphML content --></graphml>"}
    
    def _export_to_plantuml(self, visualization: dict[str, Any]) -> dict[str, Any]:
        """Export to PlantUML format."""
        # Implementation would go here
        return {"format": "plantuml", "content": "@startuml\n// PlantUML content\n@enduml"}


# Convenience function to create a visualizer
def create_visualizer() -> Visualizer:
    """
    Create a visualizer instance.
    
    Returns:
        Visualizer instance
    """
    return Visualizer()

