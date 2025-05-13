"""Graph module for code analysis.

This module provides utilities for building and analyzing dependency graphs
from code structures.
"""

import logging
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import networkx as nx

logger = logging.getLogger(__name__)


def build_dependency_graph(edges: list[dict[str, Any]]) -> nx.DiGraph:
    """Build a dependency graph from a list of edges.

    Args:
        edges: List of dictionaries representing edges, each with 'source' and 'target' keys

    Returns:
        NetworkX DiGraph representing the dependencies
    """
    graph: nx.DiGraph = nx.DiGraph()

    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source and target:
            graph.add_edge(source, target)
        else:
            logger.warning(f"Invalid edge: {edge}")

    return graph


def find_cycles(graph: nx.DiGraph) -> list[list[Any]]:
    """Find all cycles in a directed graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        List of cycles, where each cycle is a list of nodes
    """
    try:
        return list(nx.simple_cycles(graph))
    except nx.NetworkXNoCycle:
        return []


def find_hubs(graph: nx.DiGraph, threshold: int = 5) -> list[Any]:
    """Find hub nodes in a graph (nodes with many connections).

    Args:
        graph: NetworkX DiGraph to analyze
        threshold: Minimum number of connections to be considered a hub

    Returns:
        List of hub nodes sorted by connection count
    """
    hubs = []

    for node in graph.nodes():
        # Count both incoming and outgoing connections
        in_degree = graph.in_degree(node)
        out_degree = graph.out_degree(node)
        connection_count = in_degree + out_degree

        if connection_count >= threshold:
            hubs.append(node)

    # Sort by connection count in descending order
    hubs.sort(
        key=lambda node: graph.in_degree(node) + graph.out_degree(node), reverse=True
    )

    return hubs


def find_isolated_nodes(graph: nx.DiGraph) -> list[Any]:
    """Find isolated nodes in a graph (nodes with no connections).

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        List of isolated nodes
    """
    return [node for node in graph.nodes() if graph.degree(node) == 0]


def find_entry_points(graph: nx.DiGraph) -> list[Any]:
    """Find entry points in a graph (nodes with no incoming edges).

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        List of entry point nodes
    """
    return [node for node in graph.nodes() if graph.in_degree(node) == 0]


def find_exit_points(graph: nx.DiGraph) -> list[Any]:
    """Find exit points in a graph (nodes with no outgoing edges).

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        List of exit point nodes
    """
    return [node for node in graph.nodes() if graph.out_degree(node) == 0]


def find_shortest_path(graph: nx.DiGraph, source: Any, target: Any) -> list[Any]:
    """Find the shortest path between two nodes in a graph.

    Args:
        graph: NetworkX DiGraph to analyze
        source: Source node
        target: Target node

    Returns:
        List of nodes representing the shortest path
    """
    try:
        return nx.shortest_path(graph, source, target)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []


def find_all_paths(graph: nx.DiGraph, source: Any, target: Any) -> list[list[Any]]:
    """Find all paths between two nodes in a graph.

    Args:
        graph: NetworkX DiGraph to analyze
        source: Source node
        target: Target node

    Returns:
        List of paths, where each path is a list of nodes
    """
    try:
        return list(nx.all_simple_paths(graph, source, target))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []


def get_subgraph(graph: nx.DiGraph, nodes: list[Any]) -> nx.DiGraph:
    """Get a subgraph containing only the specified nodes.

    Args:
        graph: NetworkX DiGraph to analyze
        nodes: List of nodes to include in the subgraph

    Returns:
        NetworkX DiGraph representing the subgraph
    """
    return graph.subgraph(nodes)


def get_node_dependencies(graph: nx.DiGraph, node: Any) -> list[Any]:
    """Get all nodes that a given node depends on.

    Args:
        graph: NetworkX DiGraph to analyze
        node: Node to find dependencies for

    Returns:
        List of nodes that the given node depends on
    """
    return list(graph.successors(node))


def get_node_dependents(graph: nx.DiGraph, node: Any) -> list[Any]:
    """Get all nodes that depend on a given node.

    Args:
        graph: NetworkX DiGraph to analyze
        node: Node to find dependents for

    Returns:
        List of nodes that depend on the given node
    """
    return list(graph.predecessors(node))


def get_connected_components(graph: nx.DiGraph) -> list[set[Any]]:
    """Get all connected components in a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        List of sets, where each set contains nodes in a connected component
    """
    # Convert directed graph to undirected for finding connected components
    undirected_graph = graph.to_undirected()
    return list(nx.connected_components(undirected_graph))


def get_strongly_connected_components(graph: nx.DiGraph) -> list[set[Any]]:
    """Get all strongly connected components in a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        List of sets, where each set contains nodes in a strongly connected component
    """
    return list(nx.strongly_connected_components(graph))


def get_node_centrality(graph: nx.DiGraph) -> dict[Any, float]:
    """Calculate centrality for all nodes in a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Dictionary mapping nodes to their centrality values
    """
    return nx.betweenness_centrality(graph)


def get_node_importance(graph: nx.DiGraph) -> dict[Any, float]:
    """Calculate importance (PageRank) for all nodes in a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Dictionary mapping nodes to their importance values
    """
    return nx.pagerank(graph)


def get_graph_density(graph: nx.DiGraph) -> float:
    """Calculate the density of a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Density value between 0 and 1
    """
    return nx.density(graph)


def get_graph_diameter(graph: nx.DiGraph) -> int:
    """Calculate the diameter of a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Diameter value (maximum shortest path length)
    """
    # Convert directed graph to undirected for finding diameter
    undirected_graph = graph.to_undirected()
    if not nx.is_connected(undirected_graph):
        # If graph is not connected, return the maximum diameter of connected components
        components = list(nx.connected_components(undirected_graph))
        diameters = [
            nx.diameter(undirected_graph.subgraph(component)) for component in components
        ]
        return max(diameters) if diameters else 0
    return nx.diameter(undirected_graph)


def get_graph_average_path_length(graph: nx.DiGraph) -> float:
    """Calculate the average shortest path length in a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Average shortest path length
    """
    # Convert directed graph to undirected for finding average path length
    undirected_graph = graph.to_undirected()
    if not nx.is_connected(undirected_graph):
        # If graph is not connected, return the weighted average of connected components
        components = list(nx.connected_components(undirected_graph))
        avg_paths = []
        component_sizes = []
        for component in components:
            subgraph = undirected_graph.subgraph(component)
            avg_paths.append(nx.average_shortest_path_length(subgraph))
            component_sizes.append(len(component))
        return sum(p * s for p, s in zip(avg_paths, component_sizes)) / sum(component_sizes)
    return nx.average_shortest_path_length(undirected_graph)


def get_graph_clustering_coefficient(graph: nx.DiGraph) -> float:
    """Calculate the average clustering coefficient of a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Average clustering coefficient
    """
    # Convert directed graph to undirected for finding clustering coefficient
    undirected_graph = graph.to_undirected()
    return nx.average_clustering(undirected_graph)


def get_graph_transitivity(graph: nx.DiGraph) -> float:
    """Calculate the transitivity of a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Transitivity value
    """
    # Convert directed graph to undirected for finding transitivity
    undirected_graph = graph.to_undirected()
    return nx.transitivity(undirected_graph)


def get_graph_assortativity(graph: nx.DiGraph) -> float:
    """Calculate the assortativity coefficient of a graph.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Assortativity coefficient
    """
    # Convert directed graph to undirected for finding assortativity
    undirected_graph = graph.to_undirected()
    try:
        return nx.degree_assortativity_coefficient(undirected_graph)
    except:
        return 0.0


def get_graph_summary(graph: nx.DiGraph) -> dict[str, Any]:
    """Get a summary of graph properties.

    Args:
        graph: NetworkX DiGraph to analyze

    Returns:
        Dictionary containing graph summary information
    """
    return {
        "nodes": len(graph.nodes()),
        "edges": len(graph.edges()),
        "density": get_graph_density(graph),
        "connected_components": len(get_connected_components(graph)),
        "strongly_connected_components": len(get_strongly_connected_components(graph)),
        "cycles": len(find_cycles(graph)),
        "entry_points": len(find_entry_points(graph)),
        "exit_points": len(find_exit_points(graph)),
        "isolated_nodes": len(find_isolated_nodes(graph)),
        "hubs": len(find_hubs(graph)),
    }

