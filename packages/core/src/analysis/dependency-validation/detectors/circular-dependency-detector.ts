import type { DependencyGraph, Finding, CircularDependencyIssue } from "../types";

/**
 * Detector for circular dependencies using depth-first search
 */
export class CircularDependencyDetector {
  /**
   * Detect circular dependencies in the dependency graph
   */
  async detect(graph: DependencyGraph, maxDepth: number = 10): Promise<CircularDependencyIssue[]> {
    const findings: CircularDependencyIssue[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cycles = this.dfsDetectCycles(
          graph,
          nodeId,
          visited,
          recursionStack,
          pathStack,
          maxDepth
        );
        findings.push(...cycles);
      }
    }

    // Remove duplicate cycles
    return this.deduplicateCycles(findings);
  }

  /**
   * Depth-first search to detect cycles
   */
  private dfsDetectCycles(
    graph: DependencyGraph,
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    pathStack: string[],
    maxDepth: number
  ): CircularDependencyIssue[] {
    const findings: CircularDependencyIssue[] = [];

    // Prevent infinite recursion
    if (pathStack.length > maxDepth) {
      return findings;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    pathStack.push(nodeId);

    const dependencies = graph.edges.get(nodeId) || new Set();

    for (const depId of dependencies) {
      if (!visited.has(depId)) {
        // Recursive case: explore unvisited dependency
        const nestedFindings = this.dfsDetectCycles(
          graph,
          depId,
          visited,
          recursionStack,
          pathStack,
          maxDepth
        );
        findings.push(...nestedFindings);
      } else if (recursionStack.has(depId)) {
        // Cycle detected: dependency is in current recursion stack
        const cycleStartIndex = pathStack.indexOf(depId);
        const cycle = [...pathStack.slice(cycleStartIndex), depId];
        
        const finding = this.createCircularDependencyFinding(graph, cycle);
        findings.push(finding);
      }
    }

    // Backtrack
    recursionStack.delete(nodeId);
    pathStack.pop();

    return findings;
  }

  /**
   * Create a circular dependency finding
   */
  private createCircularDependencyFinding(
    graph: DependencyGraph,
    cycle: string[]
  ): CircularDependencyIssue {
    const cycleNames = cycle.map(nodeId => {
      const node = graph.nodes.get(nodeId);
      return node ? this.getDisplayName(node.path) : nodeId;
    });

    const files = cycle
      .map(nodeId => graph.nodes.get(nodeId)?.path)
      .filter((path): path is string => !!path);

    const severity = this.calculateCycleSeverity(cycle, graph);
    const suggestion = this.generateCycleSuggestion(cycleNames);

    return {
      type: "circular_dependency",
      cycle: cycleNames,
      suggestion,
      severity,
      files,
    };
  }

  /**
   * Calculate severity based on cycle characteristics
   */
  private calculateCycleSeverity(cycle: string[], graph: DependencyGraph): "low" | "medium" | "high" {
    // Longer cycles are generally more problematic
    if (cycle.length > 5) {
      return "high";
    }

    // Check if cycle involves external packages
    const hasExternalDeps = cycle.some(nodeId => {
      const node = graph.nodes.get(nodeId);
      return node?.isExternal;
    });

    if (hasExternalDeps) {
      return "high";
    }

    // Medium severity for moderate cycles
    if (cycle.length > 3) {
      return "medium";
    }

    return "low";
  }

  /**
   * Generate suggestion for breaking the cycle
   */
  private generateCycleSuggestion(cycle: string[]): string {
    if (cycle.length === 2) {
      return `Break circular dependency between ${cycle[0]} and ${cycle[1]} by extracting shared functionality to a separate module`;
    }

    if (cycle.length === 3) {
      return `Break circular dependency in ${cycle.join(" → ")} by introducing dependency inversion or extracting common interfaces`;
    }

    return `Break complex circular dependency (${cycle.length} modules) by refactoring architecture and extracting shared components`;
  }

  /**
   * Remove duplicate cycles (same cycle detected from different starting points)
   */
  private deduplicateCycles(findings: CircularDependencyIssue[]): CircularDependencyIssue[] {
    const uniqueCycles = new Map<string, CircularDependencyIssue>();

    for (const finding of findings) {
      const normalizedCycle = this.normalizeCycle(finding.cycle);
      const key = normalizedCycle.join("→");

      if (!uniqueCycles.has(key)) {
        uniqueCycles.set(key, finding);
      }
    }

    return Array.from(uniqueCycles.values());
  }

  /**
   * Normalize cycle to start from the lexicographically smallest element
   */
  private normalizeCycle(cycle: string[]): string[] {
    if (cycle.length <= 1) {
      return cycle;
    }

    // Remove the last element if it's the same as the first (completing the cycle)
    const cleanCycle = cycle[cycle.length - 1] === cycle[0] 
      ? cycle.slice(0, -1) 
      : cycle;

    // Find the lexicographically smallest element
    let minIndex = 0;
    for (let i = 1; i < cleanCycle.length; i++) {
      if (cleanCycle[i] < cleanCycle[minIndex]) {
        minIndex = i;
      }
    }

    // Rotate the cycle to start from the smallest element
    return [
      ...cleanCycle.slice(minIndex),
      ...cleanCycle.slice(0, minIndex),
      cleanCycle[minIndex], // Complete the cycle
    ];
  }

  /**
   * Get display name for a file path
   */
  private getDisplayName(filePath: string): string {
    // Extract just the filename for display
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Detect strongly connected components using Tarjan's algorithm
   * This is an alternative approach for finding all cycles
   */
  detectStronglyConnectedComponents(graph: DependencyGraph): string[][] {
    const index = new Map<string, number>();
    const lowLink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const components: string[][] = [];
    let currentIndex = 0;

    const strongConnect = (nodeId: string) => {
      index.set(nodeId, currentIndex);
      lowLink.set(nodeId, currentIndex);
      currentIndex++;
      stack.push(nodeId);
      onStack.add(nodeId);

      const dependencies = graph.edges.get(nodeId) || new Set();
      for (const depId of dependencies) {
        if (!index.has(depId)) {
          strongConnect(depId);
          lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, lowLink.get(depId)!));
        } else if (onStack.has(depId)) {
          lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, index.get(depId)!));
        }
      }

      if (lowLink.get(nodeId) === index.get(nodeId)) {
        const component: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== nodeId);

        if (component.length > 1) {
          components.push(component);
        }
      }
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!index.has(nodeId)) {
        strongConnect(nodeId);
      }
    }

    return components;
  }
}

