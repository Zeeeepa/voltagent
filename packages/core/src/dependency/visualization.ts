import { DependencyGraph } from "./graph";
import { DependencyType, Task, TaskStatus, VisualizationOptions } from "./types";

/**
 * DependencyVisualizer - Utilities for visualizing dependency graphs
 */
export class DependencyVisualizer {
  /**
   * Generate a visualization of a dependency graph
   * @param graph - The dependency graph to visualize
   * @param options - Visualization options
   * @returns Visualization string in the specified format
   */
  public static visualize(graph: DependencyGraph, options: VisualizationOptions): string {
    switch (options.format) {
      case "json":
        return DependencyVisualizer.generateJsonVisualization(graph, options);
      case "mermaid":
        return DependencyVisualizer.generateMermaidVisualization(graph, options);
      case "dot":
        return DependencyVisualizer.generateDotVisualization(graph, options);
      case "html":
        return DependencyVisualizer.generateHtmlVisualization(graph, options);
      default:
        throw new Error(`Unsupported visualization format: ${options.format}`);
    }
  }

  /**
   * Generate a JSON visualization of a dependency graph
   * @param graph - The dependency graph to visualize
   * @param options - Visualization options
   * @returns JSON string representation of the graph
   */
  private static generateJsonVisualization(graph: DependencyGraph, options: VisualizationOptions): string {
    const tasks = graph.getAllTasks();
    const nodes: Record<string, any>[] = [];
    const edges: Record<string, any>[] = [];
    const criticalPath = options.highlightCriticalPath ? graph.analyzeCriticalPath().path : [];

    // Create nodes
    for (const task of tasks) {
      const node: Record<string, any> = {
        id: task.id,
        name: task.name,
        status: task.status,
      };

      if (options.includeTaskDetails) {
        node.description = task.description;
        node.estimatedDuration = task.estimatedDuration;
        node.actualDuration = task.actualDuration;
        node.startTime = task.startTime;
        node.endTime = task.endTime;
        node.agentId = task.agentId;
        node.metadata = task.metadata;
      }

      if (options.highlightCriticalPath && criticalPath.includes(task.id)) {
        node.isCritical = true;
      }

      nodes.push(node);
    }

    // Create edges
    for (const task of tasks) {
      const dependencies = graph.getDependenciesForTask(task.id);
      for (const dependency of dependencies) {
        const edge: Record<string, any> = {
          source: dependency.predecessorId,
          target: dependency.dependentId,
          type: dependency.type,
        };

        if (dependency.lag) {
          edge.lag = dependency.lag;
        }

        if (dependency.metadata) {
          edge.metadata = dependency.metadata;
        }

        edges.push(edge);
      }
    }

    return JSON.stringify({ nodes, edges }, null, 2);
  }

  /**
   * Generate a Mermaid flowchart visualization of a dependency graph
   * @param graph - The dependency graph to visualize
   * @param options - Visualization options
   * @returns Mermaid flowchart string
   */
  private static generateMermaidVisualization(graph: DependencyGraph, options: VisualizationOptions): string {
    const tasks = graph.getAllTasks();
    const criticalPath = options.highlightCriticalPath ? graph.analyzeCriticalPath().path : [];
    let mermaid = "flowchart TD\\n";

    // Create nodes
    for (const task of tasks) {
      const isCritical = options.highlightCriticalPath && criticalPath.includes(task.id);
      const nodeStyle = DependencyVisualizer.getMermaidNodeStyle(task, isCritical);
      
      let nodeLabel = task.name;
      if (options.includeTaskDetails && task.description) {
        nodeLabel += `\\n${task.description.substring(0, 20)}${task.description.length > 20 ? '...' : ''}`;
      }
      
      mermaid += `    ${task.id}${nodeStyle}["${nodeLabel}"]\\n`;
    }

    // Create edges
    for (const task of tasks) {
      const dependencies = graph.getDependenciesForTask(task.id);
      for (const dependency of dependencies) {
        const edgeStyle = DependencyVisualizer.getMermaidEdgeStyle(dependency.type);
        mermaid += `    ${dependency.predecessorId} ${edgeStyle} ${dependency.dependentId}\\n`;
      }
    }

    return mermaid;
  }

  /**
   * Get Mermaid node style based on task status and criticality
   * @param task - The task
   * @param isCritical - Whether the task is on the critical path
   * @returns Mermaid node style string
   */
  private static getMermaidNodeStyle(task: Task, isCritical: boolean): string {
    let style = "";
    
    // Status-based styling
    switch (task.status) {
      case TaskStatus.COMPLETED:
        style = ":::done";
        break;
      case TaskStatus.IN_PROGRESS:
        style = ":::active";
        break;
      case TaskStatus.FAILED:
        style = ":::failed";
        break;
      case TaskStatus.BLOCKED:
        style = ":::blocked";
        break;
      case TaskStatus.READY:
        style = ":::ready";
        break;
      default:
        style = ":::pending";
    }
    
    // Critical path styling
    if (isCritical) {
      style = ":::critical";
    }
    
    return style;
  }

  /**
   * Get Mermaid edge style based on dependency type
   * @param type - Dependency type
   * @returns Mermaid edge style string
   */
  private static getMermaidEdgeStyle(type: DependencyType): string {
    switch (type) {
      case DependencyType.FINISH_TO_START:
        return "-->";
      case DependencyType.START_TO_START:
        return "-.->|SS|";
      case DependencyType.FINISH_TO_FINISH:
        return "-.->|FF|";
      case DependencyType.START_TO_FINISH:
        return "-.->|SF|";
      default:
        return "-->";
    }
  }

  /**
   * Generate a DOT (Graphviz) visualization of a dependency graph
   * @param graph - The dependency graph to visualize
   * @param options - Visualization options
   * @returns DOT string
   */
  private static generateDotVisualization(graph: DependencyGraph, options: VisualizationOptions): string {
    const tasks = graph.getAllTasks();
    const criticalPath = options.highlightCriticalPath ? graph.analyzeCriticalPath().path : [];
    let dot = "digraph DependencyGraph {\n";
    dot += "  rankdir=LR;\n";
    dot += "  node [shape=box, style=filled, fontname=Arial];\n";
    dot += "  edge [fontname=Arial];\n\n";

    // Create nodes
    for (const task of tasks) {
      const isCritical = options.highlightCriticalPath && criticalPath.includes(task.id);
      const nodeAttrs = DependencyVisualizer.getDotNodeAttributes(task, isCritical);
      
      let nodeLabel = task.name;
      if (options.includeTaskDetails) {
        nodeLabel = nodeLabel.replace(/"/g, '\\"'); // Escape quotes
        if (task.description) {
          const shortDesc = task.description.substring(0, 30).replace(/"/g, '\\"');
          nodeLabel += `\\n${shortDesc}${task.description.length > 30 ? '...' : ''}`;
        }
        if (task.estimatedDuration) {
          nodeLabel += `\\nEst: ${task.estimatedDuration}ms`;
        }
      }
      
      dot += `  "${task.id}" [label="${nodeLabel}" ${nodeAttrs}];\n`;
    }

    dot += "\n";

    // Create edges
    for (const task of tasks) {
      const dependencies = graph.getDependenciesForTask(task.id);
      for (const dependency of dependencies) {
        const edgeAttrs = DependencyVisualizer.getDotEdgeAttributes(dependency.type);
        let edgeLabel = dependency.type;
        if (dependency.lag && dependency.lag > 0) {
          edgeLabel += ` (${dependency.lag}ms)`;
        }
        
        dot += `  "${dependency.predecessorId}" -> "${dependency.dependentId}" [label="${edgeLabel}" ${edgeAttrs}];\n`;
      }
    }

    dot += "}\n";
    return dot;
  }

  /**
   * Get DOT node attributes based on task status and criticality
   * @param task - The task
   * @param isCritical - Whether the task is on the critical path
   * @returns DOT node attributes string
   */
  private static getDotNodeAttributes(task: Task, isCritical: boolean): string {
    let color = "";
    let fontcolor = "black";
    
    // Status-based styling
    switch (task.status) {
      case TaskStatus.COMPLETED:
        color = "darkgreen";
        fontcolor = "white";
        break;
      case TaskStatus.IN_PROGRESS:
        color = "blue";
        fontcolor = "white";
        break;
      case TaskStatus.FAILED:
        color = "red";
        fontcolor = "white";
        break;
      case TaskStatus.BLOCKED:
        color = "orange";
        break;
      case TaskStatus.READY:
        color = "lightgreen";
        break;
      default:
        color = "lightgray";
    }
    
    // Critical path styling
    if (isCritical) {
      color = "purple";
      fontcolor = "white";
    }
    
    return `color="${color}", fillcolor="${color}", fontcolor="${fontcolor}"`;
  }

  /**
   * Get DOT edge attributes based on dependency type
   * @param type - Dependency type
   * @returns DOT edge attributes string
   */
  private static getDotEdgeAttributes(type: DependencyType): string {
    switch (type) {
      case DependencyType.FINISH_TO_START:
        return 'style="solid"';
      case DependencyType.START_TO_START:
        return 'style="dashed", color="blue"';
      case DependencyType.FINISH_TO_FINISH:
        return 'style="dashed", color="green"';
      case DependencyType.START_TO_FINISH:
        return 'style="dashed", color="red"';
      default:
        return 'style="solid"';
    }
  }

  /**
   * Generate an HTML visualization of a dependency graph
   * @param graph - The dependency graph to visualize
   * @param options - Visualization options
   * @returns HTML string
   */
  private static generateHtmlVisualization(graph: DependencyGraph, options: VisualizationOptions): string {
    // Generate a Mermaid diagram and embed it in HTML
    const mermaidDiagram = DependencyVisualizer.generateMermaidVisualization(graph, options);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Graph Visualization</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
    }
    .mermaid {
      margin: 20px 0;
    }
    .legend {
      margin-top: 30px;
      border: 1px solid #ccc;
      padding: 10px;
      border-radius: 5px;
    }
    .legend-item {
      display: inline-block;
      margin-right: 20px;
      margin-bottom: 10px;
    }
    .legend-color {
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 5px;
      vertical-align: middle;
      border-radius: 3px;
    }
    .critical { background-color: purple; }
    .done { background-color: darkgreen; }
    .active { background-color: blue; }
    .failed { background-color: red; }
    .blocked { background-color: orange; }
    .ready { background-color: lightgreen; }
    .pending { background-color: lightgray; }
  </style>
</head>
<body>
  <h1>Dependency Graph Visualization</h1>
  
  <div class="mermaid">
${mermaidDiagram}
  </div>
  
  <div class="legend">
    <h3>Legend</h3>
    <div class="legend-item"><span class="legend-color critical"></span> Critical Path</div>
    <div class="legend-item"><span class="legend-color done"></span> Completed</div>
    <div class="legend-item"><span class="legend-color active"></span> In Progress</div>
    <div class="legend-item"><span class="legend-color failed"></span> Failed</div>
    <div class="legend-item"><span class="legend-color blocked"></span> Blocked</div>
    <div class="legend-item"><span class="legend-color ready"></span> Ready</div>
    <div class="legend-item"><span class="legend-color pending"></span> Pending</div>
  </div>
  
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      securityLevel: 'loose'
    });
    
    // Add custom styling for Mermaid
    document.addEventListener('DOMContentLoaded', function() {
      const style = document.createElement('style');
      style.textContent = \`
        .done > rect { fill: darkgreen !important; }
        .active > rect { fill: blue !important; }
        .failed > rect { fill: red !important; }
        .blocked > rect { fill: orange !important; }
        .ready > rect { fill: lightgreen !important; }
        .pending > rect { fill: lightgray !important; }
        .critical > rect { fill: purple !important; }
        .done > .label, .active > .label, .failed > .label, .critical > .label { fill: white !important; }
      \`;
      document.head.appendChild(style);
    });
  </script>
</body>
</html>`;
  }
}

