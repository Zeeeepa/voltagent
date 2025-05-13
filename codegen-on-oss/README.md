# Voltagent Code Analysis and Visualization

This package provides powerful code analysis and visualization capabilities for Python codebases. It includes tools for analyzing call graphs, identifying dead code, and visualizing code relationships.

## Features

### Code Analysis

- **Context Graph Utilities**: Build dependency graphs, find hubs, and detect cycles in your code
- **DiffLite**: Lightweight git diff parsing for code change analysis
- **Issue Tracking**: Track and manage code issues with severity, categories, and locations

### Visualization

- **Call Graph Visualization**: Create directed call graphs starting from a specific function
- **Filtered Call Graphs**: Filter call graphs to include only specific class methods
- **Call Path Visualization**: Show all possible paths between two functions
- **Dead Code Detection**: Identify unused code in your codebase

## Installation

```bash
pip install voltagent
```

## Usage Examples

### Call Graph Visualization

```python
from voltagent.analyzers.context.codebase import Codebase
from voltagent.visualizers.call_graph_from_node import CallGraphFromNode
import networkx as nx
import matplotlib.pyplot as plt

# Initialize your codebase
codebase = Codebase()
# ... load your codebase ...

# Create a call graph visualizer
visualizer = CallGraphFromNode(
    function_name="main",  # Start from the main function
    max_depth=3,           # Limit depth to 3 levels
)

# Generate the call graph
graph = visualizer.visualize(codebase)

# Visualize the graph
plt.figure(figsize=(12, 8))
pos = nx.spring_layout(graph)
nx.draw(graph, pos, with_labels=True, node_color="lightblue", arrows=True)
plt.title("Call Graph for main()")
plt.show()
```

### Dead Code Detection

```python
from voltagent.analyzers.context.codebase import Codebase
from voltagent.visualizers.dead_code import DeadCodeVisualizer
import networkx as nx
import matplotlib.pyplot as plt

# Initialize your codebase
codebase = Codebase()
# ... load your codebase ...

# Create a dead code visualizer
visualizer = DeadCodeVisualizer(
    exclude_test_files=True,  # Skip test files
    exclude_decorated=True,   # Skip decorated functions
)

# Generate the dead code graph
graph = visualizer.visualize(codebase)

# Visualize the graph
plt.figure(figsize=(12, 8))
pos = nx.spring_layout(graph)
nx.draw(graph, pos, with_labels=True, node_color="red", arrows=True)
plt.title("Dead Code Visualization")
plt.show()
```

### Call Paths Between Functions

```python
from voltagent.analyzers.context.codebase import Codebase
from voltagent.visualizers.call_graph_from_node import CallPathsBetweenNodes
import networkx as nx
import matplotlib.pyplot as plt

# Initialize your codebase
codebase = Codebase()
# ... load your codebase ...

# Create a call paths visualizer
visualizer = CallPathsBetweenNodes(
    start_function_name="process_data",
    end_function_name="save_results",
    max_depth=5,
)

# Generate the call paths graph
graph = visualizer.visualize(codebase)

# Visualize the graph
plt.figure(figsize=(12, 8))
pos = nx.spring_layout(graph)
nx.draw(graph, pos, with_labels=True, arrows=True)
plt.title("Call Paths from process_data() to save_results()")
plt.show()
```

## Issue Tracking

```python
from voltagent.analyzers.issues import (
    create_issue,
    IssueCollection,
    IssueSeverity,
    IssueCategory,
)

# Create issues
issue1 = create_issue(
    message="Potential memory leak in resource handling",
    file="src/resources.py",
    line_start=45,
    line_end=52,
    severity=IssueSeverity.HIGH,
    category=IssueCategory.PERFORMANCE,
    suggestion="Use context manager to ensure proper cleanup",
)

issue2 = create_issue(
    message="Missing input validation",
    file="src/api.py",
    line_start=23,
    line_end=23,
    severity=IssueSeverity.MEDIUM,
    category=IssueCategory.SECURITY,
    suggestion="Add type checking and bounds validation",
)

# Create a collection and add issues
collection = IssueCollection()
collection.add_issues([issue1, issue2])

# Filter issues by severity
collection.filter_by_severity(IssueSeverity.HIGH)
high_severity_issues = collection.get_filtered_issues()

# Group issues by category
issues_by_category = collection.group_by_category()
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
