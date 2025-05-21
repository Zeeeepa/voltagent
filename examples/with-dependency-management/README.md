# VoltAgent Dependency Management Example

This example demonstrates how to use the Dependency Management System in VoltAgent to model, visualize, and optimize dependencies between workflow tasks.

## Features Demonstrated

- Creating tasks and dependencies
- Validating dependency graphs
- Analyzing critical paths
- Visualizing dependency graphs
- Monitoring task status changes
- Calculating dependency health metrics
- Integrating dependency management with agents

## Running the Example

1. Clone the repository and navigate to the example directory:

```bash
git clone https://github.com/VoltAgent/voltagent.git
cd voltagent
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the packages:

```bash
pnpm build
```

4. Run the example:

```bash
# Optional: Set your Anthropic API key to enable the agent example
export ANTHROPIC_API_KEY=your_api_key_here

# Run the example
cd examples/with-dependency-management
pnpm start
```

## Visualizations

The example generates several visualizations of the dependency graph:

- `dependency_graph.mermaid`: A Mermaid flowchart visualization
- `dependency_graph.html`: An HTML visualization with interactive elements
- `dependency_graph.dot`: A DOT (Graphviz) visualization

You can view the HTML visualization by opening `dependency_graph.html` in a web browser.

To render the DOT visualization, you can use Graphviz:

```bash
dot -Tpng dependency_graph.dot -o dependency_graph.png
```

## Key Concepts

### Tasks

Tasks represent units of work in a workflow. Each task has properties like:

- ID
- Name
- Description
- Status (PENDING, READY, IN_PROGRESS, COMPLETED, FAILED, BLOCKED)
- Estimated and actual duration
- Start and end times

### Dependencies

Dependencies define relationships between tasks. The system supports different dependency types:

- **Finish-to-Start**: The dependent task can start only after the predecessor task finishes
- **Start-to-Start**: The dependent task can start only after the predecessor task starts
- **Finish-to-Finish**: The dependent task can finish only after the predecessor task finishes
- **Start-to-Finish**: The dependent task can finish only after the predecessor task starts

### Critical Path Analysis

The critical path is the sequence of tasks that determines the minimum time needed to complete the project. The system can:

- Identify the critical path
- Calculate earliest and latest start/finish times
- Determine slack time for each task

### Dependency Validation

The system can validate dependency graphs to detect issues like:

- Cycles (circular dependencies)
- Missing tasks
- Self-dependencies
- Invalid dependency types

### Health Metrics

The system can calculate health metrics for dependency graphs:

- Task and dependency counts
- Average dependencies per task
- Complexity score
- Health score
- Recommendations for improvement

## Integration with Agents

The example shows how to create tools that allow agents to interact with the dependency management system:

- Getting all tasks
- Getting ready tasks
- Analyzing the critical path

## Further Reading

For more information, see the [VoltAgent documentation](https://voltagent.ai/docs).

