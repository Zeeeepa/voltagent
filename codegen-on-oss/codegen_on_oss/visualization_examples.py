"""Examples demonstrating the usage of the visualization capabilities."""

import networkx as nx
import matplotlib.pyplot as plt

from codegen_on_oss.analyzers.context.codebase import Codebase
from codegen_on_oss.visualizers.call_graph_from_node import (
    CallGraphFromNode,
    CallGraphFilter,
    CallPathsBetweenNodes,
)
from codegen_on_oss.visualizers.dead_code import DeadCodeVisualizer


def visualize_call_graph(codebase: Codebase, function_name: str, max_depth: int = 3):
    """Visualize the call graph starting from a specific function.
    
    Args:
        codebase: The codebase to analyze
        function_name: The name of the function to start from
        max_depth: Maximum depth of the call graph
    """
    # Create a call graph visualizer
    visualizer = CallGraphFromNode(
        function_name=function_name,
        max_depth=max_depth,
    )
    
    # Generate the call graph
    graph = visualizer.visualize(codebase)
    
    # Visualize the graph
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(graph)
    nx.draw(
        graph,
        pos,
        with_labels=True,
        node_color="lightblue",
        node_size=1500,
        font_size=10,
        font_weight="bold",
        arrows=True,
    )
    plt.title(f"Call Graph for {function_name}")
    plt.savefig(f"call_graph_{function_name}.png")
    plt.close()
    
    return graph


def visualize_filtered_call_graph(
    codebase: Codebase,
    function_name: str,
    class_name: str,
    method_names: list[str],
    max_depth: int = 3,
):
    """Visualize a filtered call graph showing only specific class methods.
    
    Args:
        codebase: The codebase to analyze
        function_name: The name of the function to start from
        class_name: The name of the class to filter methods from
        method_names: List of method names to include in the visualization
        max_depth: Maximum depth of the call graph
    """
    # Create a filtered call graph visualizer
    visualizer = CallGraphFilter(
        function_name=function_name,
        class_name=class_name,
        method_names=method_names,
        max_depth=max_depth,
    )
    
    # Generate the filtered call graph
    graph = visualizer.visualize(codebase)
    
    # Visualize the graph
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(graph)
    
    # Draw nodes with different colors based on their type
    node_colors = []
    for node in graph.nodes():
        if hasattr(node, "color") and node.color == "red":
            node_colors.append("red")
        elif hasattr(node, "color") and node.color == "yellow":
            node_colors.append("yellow")
        else:
            node_colors.append("lightblue")
    
    nx.draw(
        graph,
        pos,
        with_labels=True,
        node_color=node_colors,
        node_size=1500,
        font_size=10,
        font_weight="bold",
        arrows=True,
    )
    plt.title(f"Filtered Call Graph for {function_name} to {class_name} methods")
    plt.savefig(f"filtered_call_graph_{function_name}_{class_name}.png")
    plt.close()
    
    return graph


def visualize_call_paths(
    codebase: Codebase,
    start_function_name: str,
    end_function_name: str,
    max_depth: int = 5,
):
    """Visualize all call paths between two functions.
    
    Args:
        codebase: The codebase to analyze
        start_function_name: The name of the starting function
        end_function_name: The name of the ending function
        max_depth: Maximum depth of the call graph
    """
    # Create a call paths visualizer
    visualizer = CallPathsBetweenNodes(
        start_function_name=start_function_name,
        end_function_name=end_function_name,
        max_depth=max_depth,
    )
    
    # Generate the call paths graph
    graph = visualizer.visualize(codebase)
    
    # Visualize the graph
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(graph)
    
    # Draw nodes with different colors based on their type
    node_colors = []
    for node in graph.nodes():
        if hasattr(node, "color") and node.color == "blue":
            node_colors.append("blue")
        elif hasattr(node, "color") and node.color == "red":
            node_colors.append("red")
        else:
            node_colors.append("lightblue")
    
    nx.draw(
        graph,
        pos,
        with_labels=True,
        node_color=node_colors,
        node_size=1500,
        font_size=10,
        font_weight="bold",
        arrows=True,
    )
    plt.title(f"Call Paths from {start_function_name} to {end_function_name}")
    plt.savefig(f"call_paths_{start_function_name}_to_{end_function_name}.png")
    plt.close()
    
    return graph


def visualize_dead_code(codebase: Codebase, exclude_test_files: bool = True):
    """Visualize dead code in the codebase.
    
    Args:
        codebase: The codebase to analyze
        exclude_test_files: Whether to exclude test files from analysis
    """
    # Create a dead code visualizer
    visualizer = DeadCodeVisualizer(
        exclude_test_files=exclude_test_files,
        exclude_decorated=True,
    )
    
    # Generate the dead code graph
    graph = visualizer.visualize(codebase)
    
    # Visualize the graph
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(graph)
    
    # Draw nodes with different colors based on their type
    node_colors = []
    edge_colors = []
    
    for node in graph.nodes():
        if hasattr(node, "color") and node.color == "red":
            node_colors.append("red")
        else:
            node_colors.append("lightblue")
    
    for u, v in graph.edges():
        if hasattr(graph[u][v], "color") and graph[u][v]["color"] == "red":
            edge_colors.append("red")
        else:
            edge_colors.append("black")
    
    nx.draw(
        graph,
        pos,
        with_labels=True,
        node_color=node_colors,
        edge_color=edge_colors,
        node_size=1500,
        font_size=10,
        font_weight="bold",
        arrows=True,
    )
    plt.title("Dead Code Visualization")
    plt.savefig("dead_code.png")
    plt.close()
    
    return graph


def main():
    """Run visualization examples."""
    # Create a sample codebase
    codebase = Codebase()
    
    # Add some sample functions and classes
    # In a real scenario, these would be populated by analyzing the actual code
    
    print("Visualization examples have been created.")
    print("To use these visualizers with your codebase:")
    print("1. Import the visualizer classes")
    print("2. Create a visualizer instance with appropriate parameters")
    print("3. Call visualize() with your codebase")
    print("4. Use networkx and matplotlib to display or save the graph")


if __name__ == "__main__":
    main()

