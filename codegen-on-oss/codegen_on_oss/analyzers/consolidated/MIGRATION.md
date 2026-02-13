# Migration Guide

This guide helps you migrate from the original analyzers structure to the consolidated structure.

## Import Changes

### Before

```python
# Importing from multiple files
from codegen_on_oss.analyzers.base_analyzer import BaseCodeAnalyzer
from codegen_on_oss.analyzers.issues import Issue, IssueCategory, IssueSeverity
from codegen_on_oss.analyzers.codebase_analysis import get_codebase_summary
from codegen_on_oss.analyzers.code_quality import CodeQualityAnalyzer
from codegen_on_oss.analyzers.api import CodegenAnalyzerAPI
from codegen_on_oss.analyzers.visualization.visualizer import Visualizer
```

### After

```python
# Importing from consolidated package
from codegen_on_oss.analyzers.consolidated import (
    BaseCodeAnalyzer,
    Issue,
    IssueCategory,
    IssueSeverity,
    CodeQualityAnalyzer,
    CodegenAnalyzerAPI,
    Visualizer,
    get_codebase_summary,
)
```

## Class and Function Mapping

| Original                                 | Consolidated                    |
| ---------------------------------------- | ------------------------------- |
| `base_analyzer.BaseCodeAnalyzer`         | `core.BaseCodeAnalyzer`         |
| `issues.Issue`                           | `core.Issue`                    |
| `issues.IssueCategory`                   | `core.IssueCategory`            |
| `issues.IssueSeverity`                   | `core.IssueSeverity`            |
| `issues.IssueCollection`                 | `core.IssueCollection`          |
| `issues.create_issue`                    | `core.create_issue`             |
| `analysis_result.AnalysisResult`         | `core.AnalysisResult`           |
| `codebase_analysis.*`                    | `analysis.*`                    |
| `code_quality.CodeQualityAnalyzer`       | `analysis.CodeQualityAnalyzer`  |
| `api.CodegenAnalyzerAPI`                 | `api.CodegenAnalyzerAPI`        |
| `api.create_api`                         | `api.create_api`                |
| `snapshot_manager.SnapshotManager`       | `management.SnapshotManager`    |
| `transaction_manager.TransactionManager` | `management.TransactionManager` |
| `transactions.Transaction`               | `management.Transaction`        |
| `visualization.visualizer.Visualizer`    | `visualization.Visualizer`      |

## Backward Compatibility

The original files are still available in the parent directory for backward compatibility. However, we recommend migrating to the consolidated structure for better maintainability and organization.

## Benefits of Migration

1. **Simplified Imports**: Fewer import statements needed
2. **Better Organization**: Related functionality grouped together
3. **Reduced Duplication**: Common code consolidated
4. **Improved Discoverability**: Easier to find related functionality
5. **Future-Proof**: New features will be added to the consolidated structure

## Step-by-Step Migration

1. Update your imports to use the consolidated package
2. Replace any direct references to the original files with their consolidated equivalents
3. Test your code to ensure it works with the consolidated structure
4. Update any documentation or comments to reflect the new structure
