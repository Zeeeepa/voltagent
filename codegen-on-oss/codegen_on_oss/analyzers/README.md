# Analyzers

This directory contains code analyzers for analyzing codebases. It provides functionality for code quality analysis, dependency analysis, and more.

## Structure

The analyzers are organized into two structures:

1. **Original Structure**: Multiple files with specific functionality
2. **Consolidated Structure**: A more maintainable structure with fewer files

### Original Structure

- `base_analyzer.py`: Base class for all analyzers
- `issues.py`: Issue models and collections
- `analysis_result.py`: Analysis result container
- `codebase_analysis.py`: Codebase analysis functionality
- `code_quality.py`: Code quality analysis
- `api.py`: API interface for frontend interaction
- `snapshot_manager.py`: Snapshot management
- `transaction_manager.py`: Transaction management
- `transactions.py`: Transaction models
- `utils.py`: Utility functions
- `visualization/`: Visualization components

### Consolidated Structure

The consolidated structure is available in the `consolidated/` directory:

- `core.py`: Core analyzer infrastructure (base classes, issue models, analysis results)
- `analysis.py`: Analysis functionality (codebase analysis, code quality analysis)
- `api.py`: API interface for frontend interaction
- `management.py`: Management functionality (snapshots, transactions)
- `utils.py`: Utility functions
- `visualization/__init__.py`: Visualization interface

## Usage

### Using the Original Structure

```python
from codegen_on_oss.analyzers.base_analyzer import BaseCodeAnalyzer
from codegen_on_oss.analyzers.issues import Issue, IssueCategory, IssueSeverity
from codegen_on_oss.analyzers.api import CodegenAnalyzerAPI

# Create an analyzer API
api = CodegenAnalyzerAPI(repo_path="/path/to/repo")

# Analyze the codebase
results = api.analyze_codebase()
```

### Using the Consolidated Structure

```python
from codegen_on_oss.analyzers.consolidated import (
    BaseCodeAnalyzer,
    Issue,
    IssueCategory,
    IssueSeverity,
    CodegenAnalyzerAPI,
)

# Create an analyzer API
api = CodegenAnalyzerAPI(repo_path="/path/to/repo")

# Analyze the codebase
results = api.analyze_codebase()
```

## Migration

See the [Migration Guide](consolidated/MIGRATION.md) for details on migrating from the original structure to the consolidated structure.
