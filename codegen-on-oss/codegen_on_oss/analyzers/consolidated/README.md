# Consolidated Analyzers

This directory contains a consolidated version of the analyzers module, organized into a more maintainable structure.

## Structure

The consolidated analyzers are organized into the following files:

- `core.py`: Core analyzer infrastructure (base classes, issue models, analysis results)
- `analysis.py`: Analysis functionality (codebase analysis, code quality analysis)
- `api.py`: API interface for frontend interaction
- `management.py`: Management functionality (snapshots, transactions)
- `utils.py`: Utility functions
- `visualization/__init__.py`: Visualization interface

## Usage

```python
from codegen_on_oss.analyzers.consolidated import (
    AnalysisType,
    BaseCodeAnalyzer,
    CodeQualityAnalyzer,
    CodegenAnalyzerAPI,
)

# Create an analyzer API
api = CodegenAnalyzerAPI(repo_path="/path/to/repo")

# Analyze the codebase
results = api.analyze_codebase(analysis_types=[AnalysisType.CODE_QUALITY])

# Get issues
issues = api.get_issues(severity="error")

# Generate visualizations
dependency_graph = api.generate_dependency_graph()
```

## Benefits of Consolidation

1. **Reduced File Count**: Fewer files to navigate and maintain
2. **Logical Organization**: Related functionality grouped together
3. **Simplified Imports**: Cleaner import statements
4. **Better Discoverability**: Easier to find related functionality
5. **Reduced Duplication**: Consolidated common code

## Implementation Notes

The consolidation preserves all existing functionality while reorganizing the code into a more maintainable structure. The original files are still available in the parent directory for backward compatibility.

