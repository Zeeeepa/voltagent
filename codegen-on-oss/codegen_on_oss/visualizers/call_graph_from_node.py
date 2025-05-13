"""Call graph visualization utilities."""

from typing import Optional, Union

import networkx as nx

from codegen_on_oss.analyzers.context.graph.class_definition import Class
from codegen_on_oss.analyzers.context.graph.function import Function
from codegen_on_oss.analyzers.context.graph.function_call import FunctionCall
from codegen_on_oss.visualizers.codebase_visualizer import CodebaseVisualizer


class CallGraphFromNode(CodebaseVisualizer):
    """Creates a directed call graph for a given function.
    
    Starting from the specified function, it recursively iterates through its function calls
    and the functions called by them, building a graph of the call paths to a maximum depth.
    The root of the directed graph is the starting function, each node represents a function call,
    and edge from node A to node B indicates that function A calls function B.
    """

    def __init__(
        self,
        function_name: str,
        max_depth: int = 5,
        graph_external_modules: bool = False,
    ):
        """Initialize the call graph visualizer.
        
        Args:
            function_name: Name of the function to trace
            max_depth: Maximum depth of the call graph
            graph_external_modules: Whether to include external module calls
        """
        self.function_name = function_name
        self.max_depth = max_depth
        self.graph_external_modules = graph_external_modules
        self.G: nx.DiGraph = nx.DiGraph()

    def visualize(self, codebase) -> nx.DiGraph:
        """Create a call graph visualization starting from the specified function.
        
        Args:
            codebase: The codebase to analyze
            
        Returns:
            A directed graph representing the call paths
        """
        # Get the function to trace
        function_to_trace = codebase.get_function(self.function_name)
        
        # Set starting node
        self.G.add_node(function_to_trace, color="yellow")
        
        # Add all the children (and sub-children) to the graph
        self._create_downstream_call_trace(function_to_trace)
        
        return self.G
    
    def _create_downstream_call_trace(
        self, 
        parent: Optional[Union[FunctionCall, Function]] = None, 
        depth: int = 0
    ):
        """Creates call graph for parent.
        
        This function recurses through the call graph of a function and creates a visualization.
        
        Args:
            parent: The function for which a call graph will be created
            depth: The current depth of the recursive stack
        """
        # If the maximum recursive depth has been exceeded, return
        if self.max_depth <= depth:
            return
            
        # If the parent is None, return
        if parent is None:
            return
            
        # Get all the function calls made by the parent
        for call in getattr(parent, "dependencies", []):
            # Skip if not a function call
            if not isinstance(call, FunctionCall):
                continue
                
            # Get the function being called
            called_function = getattr(call, "called_function", None)
            if called_function is None:
                continue
                
            # Add the called function to the graph
            self.G.add_node(called_function)
            
            # Add an edge from the parent to the called function
            self.G.add_edge(parent, called_function)
            
            # Recursively trace the called function's calls
            self._create_downstream_call_trace(called_function, depth + 1)


class CallGraphFilter(CallGraphFromNode):
    """Creates a filtered call graph for a given function.
    
    This visualizer extends CallGraphFromNode to filter the call graph to only include
    specific methods of a class. This is useful for visualizing specific API endpoints
    or other method types within a class.
    """

    def __init__(
        self,
        function_name: str,
        class_name: str,
        method_names: list[str],
        max_depth: int = 5,
    ):
        """Initialize the filtered call graph visualizer.
        
        Args:
            function_name: Name of the function to trace
            class_name: Name of the class to filter methods from
            method_names: List of method names to include in the visualization
            max_depth: Maximum depth of the call graph
        """
        super().__init__(function_name, max_depth)
        self.class_name = class_name
        self.method_names = method_names

    def visualize(self, codebase) -> nx.DiGraph:
        """Create a filtered call graph visualization.
        
        Args:
            codebase: The codebase to analyze
            
        Returns:
            A directed graph representing the filtered call paths
        """
        # Get the function to trace
        function_to_trace = codebase.get_function(self.function_name)
        
        # Get the class to filter methods from
        class_to_filter = codebase.get_class(self.class_name)
        
        if function_to_trace is None or class_to_filter is None:
            return self.G
        
        # Set starting node
        self.G.add_node(function_to_trace, color="yellow")
        
        # Get all methods of the class that match the method names
        filtered_methods = []
        for method in getattr(class_to_filter, "methods", []):
            if method.name in self.method_names:
                filtered_methods.append(method)
                self.G.add_node(method, color="red")
        
        # Add all the children (and sub-children) to the graph
        self._create_downstream_call_trace(function_to_trace)
        
        # Filter the graph to only include paths that lead to the filtered methods
        filtered_graph: nx.DiGraph = nx.DiGraph()
        
        # Add all filtered methods to the filtered graph
        for method in filtered_methods:
            filtered_graph.add_node(method, color="red")
        
        # Add all paths from the starting function to the filtered methods
        for method in filtered_methods:
            for path in nx.all_simple_paths(self.G, function_to_trace, method):
                for i in range(len(path) - 1):
                    filtered_graph.add_edge(path[i], path[i + 1])
        
        # Add the starting function to the filtered graph
        filtered_graph.add_node(function_to_trace, color="yellow")
        
        return filtered_graph


class CallPathsBetweenNodes(CodebaseVisualizer):
    """Visualizes all call paths between two functions.
    
    This visualizer identifies all possible call paths between a starting function
    and an ending function. It's useful for understanding how two parts of a codebase
    are connected and what the possible execution paths are between them.
    """

    def __init__(
        self,
        start_function_name: str,
        end_function_name: str,
        max_depth: int = 5,
    ):
        """Initialize the call paths visualizer.
        
        Args:
            start_function_name: Name of the starting function
            end_function_name: Name of the ending function
            max_depth: Maximum depth of the call graph
        """
        self.start_function_name = start_function_name
        self.end_function_name = end_function_name
        self.max_depth = max_depth

    def visualize(self, codebase) -> nx.DiGraph:
        """Create a visualization of call paths between two functions.
        
        Args:
            codebase: The codebase to analyze
            
        Returns:
            A directed graph representing the call paths
        """
        # Create a directed graph to visualize call paths
        G: nx.DiGraph = nx.DiGraph()
        
        # Get the start and end functions
        start_function = codebase.get_function(self.start_function_name)
        end_function = codebase.get_function(self.end_function_name)
        
        if start_function is None or end_function is None:
            return G
        
        # Add the start and end functions to the graph with different colors
        G.add_node(start_function, color="blue")
        G.add_node(end_function, color="red")
        
        # Create a call graph from the start function
        call_graph_visualizer = CallGraphFromNode(
            function_name=self.start_function_name,
            max_depth=self.max_depth,
        )
        
        # Generate the full call graph
        full_graph = call_graph_visualizer.visualize(codebase)
        
        # Check if there's a path from start to end
        if not nx.has_path(full_graph, start_function, end_function):
            return G
        
        # Find all simple paths from start to end
        for path in nx.all_simple_paths(full_graph, start_function, end_function):
            for i in range(len(path) - 1):
                G.add_edge(path[i], path[i + 1])
        
        return G
