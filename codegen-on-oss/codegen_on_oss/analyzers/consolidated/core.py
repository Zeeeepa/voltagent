#!/usr/bin/env python3
"""
Core Analyzer Module

This module provides the foundation for all code analyzers in the system.
It defines common interfaces, issue models, and shared functionality for codebase analysis.
"""

import json
import logging
import sys
import tempfile
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

try:
    from codegen.configs.models.codebase import CodebaseConfig
    from codegen.configs.models.secrets import SecretsConfig
    from codegen.git.repo_operator.repo_operator import RepoOperator
    from codegen.git.schemas.repo_config import RepoConfig
    from codegen.sdk.codebase.config import ProjectConfig
    from codegen.sdk.core.codebase import Codebase
    from codegen.shared.enums.programming_language import ProgrammingLanguage

    # Import from our own modules
    from codegen_on_oss.context_codebase import (
        GLOBAL_FILE_IGNORE_LIST,
        CodebaseContext,
        get_node_classes,
    )
    from codegen_on_oss.current_code_codebase import get_selected_codebase
except ImportError:
    print("Codegen SDK or required modules not found.")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

#
# Analysis Types and Issue Models
#

class AnalysisType(str, Enum):
    """Types of analysis that can be performed."""

    CODEBASE = "codebase"
    PR = "pr"
    COMPARISON = "comparison"
    CODE_QUALITY = "code_quality"
    DEPENDENCY = "dependency"
    SECURITY = "security"
    PERFORMANCE = "performance"
    TYPE_CHECKING = "type_checking"


class IssueSeverity(str, Enum):
    """Severity levels for issues."""

    CRITICAL = "critical"  # Must be fixed immediately, blocks functionality
    ERROR = "error"  # Must be fixed, causes errors or undefined behavior
    WARNING = "warning"  # Should be fixed, may cause problems in future
    INFO = "info"  # Informational, could be improved but not critical


class IssueCategory(str, Enum):
    """Categories of issues that can be detected."""

    # Code Quality Issues
    DEAD_CODE = "dead_code"  # Unused variables, functions, etc.
    COMPLEXITY = "complexity"  # Code too complex, needs refactoring
    STYLE_ISSUE = "style_issue"  # Code style issues (line length, etc.)
    DOCUMENTATION = "documentation"  # Missing or incomplete documentation

    # Type and Parameter Issues
    TYPE_ERROR = "type_error"  # Type errors or inconsistencies
    PARAMETER_MISMATCH = "parameter_mismatch"  # Parameter type or count mismatch
    RETURN_TYPE_ERROR = "return_type_error"  # Return type error or mismatch

    # Implementation Issues
    IMPLEMENTATION_ERROR = "implementation_error"  # Incorrect implementation
    MISSING_IMPLEMENTATION = "missing_implementation"  # Missing implementation

    # Dependency Issues
    IMPORT_ERROR = "import_error"  # Import errors or issues
    DEPENDENCY_CYCLE = "dependency_cycle"  # Circular dependency
    MODULE_COUPLING = "module_coupling"  # High coupling between modules

    # API Issues
    API_CHANGE = "api_change"  # API has changed in a breaking way
    API_USAGE_ERROR = "api_usage_error"  # Incorrect API usage

    # Security Issues
    SECURITY_VULNERABILITY = "security_vulnerability"  # Security vulnerability

    # Performance Issues
    PERFORMANCE_ISSUE = "performance_issue"  # Performance issue


class IssueStatus(str, Enum):
    """Status of an issue."""

    OPEN = "open"  # Issue is open and needs to be fixed
    FIXED = "fixed"  # Issue has been fixed
    WONTFIX = "wontfix"  # Issue will not be fixed
    INVALID = "invalid"  # Issue is invalid or not applicable
    DUPLICATE = "duplicate"  # Issue is a duplicate of another


@dataclass
class CodeLocation:
    """Location of an issue in code."""

    file: str
    line: int | None = None
    column: int | None = None
    end_line: int | None = None
    end_column: int | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary representation."""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CodeLocation":
        """Create from dictionary representation."""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def __str__(self) -> str:
        """Convert to string representation."""
        if self.line is not None:
            if self.column is not None:
                return f"{self.file}:{self.line}:{self.column}"
            return f"{self.file}:{self.line}"
        return self.file


@dataclass
class Issue:
    """Represents an issue found during analysis."""

    # Core fields
    message: str
    severity: IssueSeverity
    location: CodeLocation

    # Classification fields
    category: IssueCategory | None = None
    analysis_type: AnalysisType | None = None
    status: IssueStatus = IssueStatus.OPEN

    # Context fields
    symbol: str | None = None
    code: str | None = None
    suggestion: str | None = None
    related_symbols: list[str] = field(default_factory=list)
    related_locations: list[CodeLocation] = field(default_factory=list)

    # Metadata fields
    id: str | None = None
    hash: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Initialize derived fields."""
        # Generate an ID if not provided
        if self.id is None:
            import hashlib

            # Create a hash based on location and message
            hash_input = f"{self.location.file}:{self.location.line}:{self.message}"
            self.id = hashlib.md5(hash_input.encode()).hexdigest()[:12]

    @property
    def file(self) -> str:
        """Get the file path."""
        return self.location.file

    @property
    def line(self) -> int | None:
        """Get the line number."""
        return self.location.line

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary representation."""
        result = {
            "id": self.id,
            "message": self.message,
            "severity": self.severity.value,
            "location": self.location.to_dict(),
            "status": self.status.value,
        }

        # Add optional fields if present
        if self.category:
            result["category"] = self.category.value

        if self.analysis_type:
            result["analysis_type"] = self.analysis_type.value

        if self.symbol:
            result["symbol"] = self.symbol

        if self.code:
            result["code"] = self.code

        if self.suggestion:
            result["suggestion"] = self.suggestion

        if self.related_symbols:
            result["related_symbols"] = self.related_symbols

        if self.related_locations:
            result["related_locations"] = [
                loc.to_dict() for loc in self.related_locations
            ]

        if self.metadata:
            result["metadata"] = self.metadata

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Issue":
        """Create from dictionary representation."""
        # Convert string enums to actual enum values
        if "severity" in data and isinstance(data["severity"], str):
            data["severity"] = IssueSeverity(data["severity"])

        if "category" in data and isinstance(data["category"], str):
            data["category"] = IssueCategory(data["category"])

        if "analysis_type" in data and isinstance(data["analysis_type"], str):
            data["analysis_type"] = AnalysisType(data["analysis_type"])

        if "status" in data and isinstance(data["status"], str):
            data["status"] = IssueStatus(data["status"])

        # Convert location dict to CodeLocation
        if "location" in data and isinstance(data["location"], dict):
            data["location"] = CodeLocation.from_dict(data["location"])

        # Convert related_locations dicts to CodeLocation objects
        if "related_locations" in data and isinstance(data["related_locations"], list):
            data["related_locations"] = [
                CodeLocation.from_dict(loc) if isinstance(loc, dict) else loc
                for loc in data["related_locations"]
            ]

        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})


class IssueCollection:
    """Collection of issues with filtering and grouping capabilities."""

    def __init__(self, issues: list[Issue] | None = None):
        """
        Initialize the issue collection.

        Args:
            issues: Initial list of issues
        """
        self.issues = issues or []
        self._filters = []

    def add_issue(self, issue: Issue):
        """
        Add an issue to the collection.

        Args:
            issue: Issue to add
        """
        self.issues.append(issue)

    def add_issues(self, issues: list[Issue]):
        """
        Add multiple issues to the collection.

        Args:
            issues: Issues to add
        """
        self.issues.extend(issues)

    def add_filter(self, filter_func: Callable[[Issue], bool], description: str = ""):
        """
        Add a filter function.

        Args:
            filter_func: Function that returns True if issue should be included
            description: Description of the filter
        """
        self._filters.append((filter_func, description))

    def get_issues(
        self,
        severity: IssueSeverity | None = None,
        category: IssueCategory | None = None,
        status: IssueStatus | None = None,
        file_path: str | None = None,
        symbol: str | None = None,
    ) -> list[Issue]:
        """
        Get issues matching the specified criteria.

        Args:
            severity: Severity to filter by
            category: Category to filter by
            status: Status to filter by
            file_path: File path to filter by
            symbol: Symbol name to filter by

        Returns:
            List of matching issues
        """
        filtered_issues = self.issues

        # Apply custom filters
        for filter_func, _ in self._filters:
            filtered_issues = [i for i in filtered_issues if filter_func(i)]

        # Apply standard filters
        if severity:
            filtered_issues = [i for i in filtered_issues if i.severity == severity]

        if category:
            filtered_issues = [i for i in filtered_issues if i.category == category]

        if status:
            filtered_issues = [i for i in filtered_issues if i.status == status]

        if file_path:
            filtered_issues = [
                i for i in filtered_issues if i.location.file == file_path
            ]

        if symbol:
            filtered_issues = [
                i
                for i in filtered_issues
                if (
                    i.symbol == symbol
                    or (i.related_symbols and symbol in i.related_symbols)
                )
            ]

        return filtered_issues

    def group_by_severity(self) -> dict[IssueSeverity, list[Issue]]:
        """
        Group issues by severity.

        Returns:
            Dictionary mapping severities to lists of issues
        """
        result = {severity: [] for severity in IssueSeverity}

        for issue in self.issues:
            result[issue.severity].append(issue)

        return result

    def group_by_category(self) -> dict[IssueCategory, list[Issue]]:
        """
        Group issues by category.

        Returns:
            Dictionary mapping categories to lists of issues
        """
        result = {category: [] for category in IssueCategory}

        for issue in self.issues:
            if issue.category:
                result[issue.category].append(issue)

        return result

    def group_by_file(self) -> dict[str, list[Issue]]:
        """
        Group issues by file.

        Returns:
            Dictionary mapping file paths to lists of issues
        """
        result = {}

        for issue in self.issues:
            if issue.location.file not in result:
                result[issue.location.file] = []

            result[issue.location.file].append(issue)

        return result

    def statistics(self) -> dict[str, Any]:
        """
        Get statistics about the issues.

        Returns:
            Dictionary with issue statistics
        """
        by_severity = self.group_by_severity()
        by_category = self.group_by_category()
        by_status = {status: [] for status in IssueStatus}
        for issue in self.issues:
            by_status[issue.status].append(issue)

        return {
            "total": len(self.issues),
            "by_severity": {
                severity.value: len(issues) for severity, issues in by_severity.items()
            },
            "by_category": {
                category.value: len(issues)
                for category, issues in by_category.items()
                if len(issues) > 0  # Only include non-empty categories
            },
            "by_status": {
                status.value: len(issues) for status, issues in by_status.items()
            },
            "file_count": len(self.group_by_file()),
        }

    def to_dict(self) -> dict[str, Any]:
        """
        Convert to dictionary representation.

        Returns:
            Dictionary representation of the issue collection
        """
        return {
            "issues": [issue.to_dict() for issue in self.issues],
            "statistics": self.statistics(),
            "filters": [desc for _, desc in self._filters if desc],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "IssueCollection":
        """
        Create from dictionary representation.

        Args:
            data: Dictionary representation

        Returns:
            Issue collection
        """
        collection = cls()

        if "issues" in data and isinstance(data["issues"], list):
            collection.add_issues([
                Issue.from_dict(issue) if isinstance(issue, dict) else issue
                for issue in data["issues"]
            ])

        return collection

    def save_to_file(self, file_path: str, format: str = "json"):
        """
        Save to file.

        Args:
            file_path: Path to save to
            format: Format to save in
        """
        if format == "json":
            with open(file_path, "w") as f:
                json.dump(self.to_dict(), f, indent=2)
        else:
            raise ValueError(f"Unsupported format: {format}")

    @classmethod
    def load_from_file(cls, file_path: str) -> "IssueCollection":
        """
        Load from file.

        Args:
            file_path: Path to load from

        Returns:
            Issue collection
        """
        with open(file_path) as f:
            data = json.load(f)

        return cls.from_dict(data)


def create_issue(
    message: str,
    severity: str | IssueSeverity,
    file: str,
    line: int | None = None,
    category: str | IssueCategory | None = None,
    symbol: str | None = None,
    suggestion: str | None = None,
) -> Issue:
    """
    Create an issue with simplified parameters.

    Args:
        message: Issue message
        severity: Issue severity
        file: File path
        line: Line number
        category: Issue category
        symbol: Symbol name
        suggestion: Suggested fix

    Returns:
        Issue object
    """
    # Convert string severity to enum
    if isinstance(severity, str):
        severity = IssueSeverity(severity)

    # Convert string category to enum
    if isinstance(category, str) and category:
        category = IssueCategory(category)

    # Create location
    location = CodeLocation(file=file, line=line)

    # Create issue
    return Issue(
        message=message,
        severity=severity,
        location=location,
        category=category,
        symbol=symbol,
        suggestion=suggestion,
    )


#
# Analysis Result
#

class AnalysisResult:
    """
    Container for analysis results.
    
    This class provides a standardized way to store and access analysis results
    from different analyzers.
    """
    
    def __init__(self, analyzer_name: str, analysis_type: AnalysisType):
        """
        Initialize the analysis result.
        
        Args:
            analyzer_name: Name of the analyzer that produced the result
            analysis_type: Type of analysis performed
        """
        self.analyzer_name = analyzer_name
        self.analysis_type = analysis_type
        self.timestamp = None
        self.data = {}
        self.issues = IssueCollection()
        self.metadata = {}
        
        # Set timestamp
        from datetime import datetime
        self.timestamp = datetime.now().isoformat()
    
    def add_data(self, key: str, value: Any):
        """
        Add data to the result.
        
        Args:
            key: Data key
            value: Data value
        """
        self.data[key] = value
    
    def add_issue(self, issue: Issue):
        """
        Add an issue to the result.
        
        Args:
            issue: Issue to add
        """
        self.issues.add_issue(issue)
    
    def add_issues(self, issues: list[Issue]):
        """
        Add multiple issues to the result.
        
        Args:
            issues: Issues to add
        """
        self.issues.add_issues(issues)
    
    def add_metadata(self, key: str, value: Any):
        """
        Add metadata to the result.
        
        Args:
            key: Metadata key
            value: Metadata value
        """
        self.metadata[key] = value
    
    def to_dict(self) -> dict[str, Any]:
        """
        Convert to dictionary representation.
        
        Returns:
            Dictionary representation of the analysis result
        """
        return {
            "analyzer_name": self.analyzer_name,
            "analysis_type": self.analysis_type.value,
            "timestamp": self.timestamp,
            "data": self.data,
            "issues": self.issues.to_dict(),
            "metadata": self.metadata,
        }
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AnalysisResult":
        """
        Create from dictionary representation.
        
        Args:
            data: Dictionary representation
            
        Returns:
            Analysis result
        """
        # Create result
        result = cls(
            analyzer_name=data["analyzer_name"],
            analysis_type=AnalysisType(data["analysis_type"]),
        )
        
        # Set timestamp
        result.timestamp = data["timestamp"]
        
        # Set data
        result.data = data["data"]
        
        # Set issues
        if "issues" in data:
            result.issues = IssueCollection.from_dict(data["issues"])
        
        # Set metadata
        result.metadata = data["metadata"]
        
        return result
    
    def save_to_file(self, file_path: str):
        """
        Save to file.
        
        Args:
            file_path: Path to save to
        """
        with open(file_path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load_from_file(cls, file_path: str) -> "AnalysisResult":
        """
        Load from file.
        
        Args:
            file_path: Path to load from
            
        Returns:
            Analysis result
        """
        with open(file_path) as f:
            data = json.load(f)
        
        return cls.from_dict(data)


#
# Base Analyzer
#

class BaseCodeAnalyzer(ABC):
    """
    Base class for all code analyzers.

    This abstract class defines the common interface and shared functionality
    for all code analyzers in the system. Specific analyzers should inherit
    from this class and implement the abstract methods.
    """

    def __init__(
        self,
        repo_url: str | None = None,
        repo_path: str | None = None,
        base_branch: str = "main",
        pr_number: int | None = None,
        language: str | None = None,
        file_ignore_list: list[str] | None = None,
        config: dict[str, Any] | None = None,
    ):
        """
        Initialize the base analyzer.

        Args:
            repo_url: URL of the repository to analyze
            repo_path: Local path to the repository to analyze
            base_branch: Base branch for comparison
            pr_number: PR number to analyze
            language: Programming language of the codebase
            file_ignore_list: List of file patterns to ignore
            config: Additional configuration options
        """
        self.repo_url = repo_url
        self.repo_path = repo_path
        self.base_branch = base_branch
        self.pr_number = pr_number
        self.language = language

        # Use custom ignore list or default global list
        self.file_ignore_list = file_ignore_list or GLOBAL_FILE_IGNORE_LIST

        # Configuration options
        self.config = config or {}

        # Codebase and context objects
        self.base_codebase = None
        self.pr_codebase = None
        self.base_context = None
        self.pr_context = None

        # Analysis results
        self.issues: list[Issue] = []
        self.results: dict[str, Any] = {}

        # PR comparison data
        self.pr_diff = None
        self.commit_shas = None
        self.modified_symbols = None
        self.pr_branch = None

        # Initialize codebase(s) based on provided parameters
        if repo_url:
            self._init_from_url(repo_url, language)
        elif repo_path:
            self._init_from_path(repo_path, language)

        # If PR number is provided, initialize PR-specific data
        if self.pr_number is not None and self.base_codebase is not None:
            self._init_pr_data(self.pr_number)

        # Initialize contexts
        self._init_contexts()

    def _init_from_url(self, repo_url: str, language: str | None = None):
        """
        Initialize codebase from a repository URL.

        Args:
            repo_url: URL of the repository
            language: Programming language of the codebase
        """
        try:
            # Extract repository information
            if repo_url.endswith(".git"):
                repo_url = repo_url[:-4]

            parts = repo_url.rstrip("/").split("/")
            repo_name = parts[-1]
            owner = parts[-2]
            repo_full_name = f"{owner}/{repo_name}"

            # Create temporary directory for cloning
            tmp_dir = tempfile.mkdtemp(prefix="analyzer_")

            # Set up configuration
            config = CodebaseConfig(
                debug=False,
                allow_external=True,
                py_resolve_syspath=True,
            )

            secrets = SecretsConfig()

            # Determine programming language
            prog_lang = None
            if language:
                prog_lang = ProgrammingLanguage(language.upper())

            # Initialize the codebase
            logger.info(f"Initializing codebase from {repo_url}")

            self.base_codebase = Codebase.from_github(
                repo_full_name=repo_full_name,
                tmp_dir=tmp_dir,
                language=prog_lang,
                config=config,
                secrets=secrets,
            )

            logger.info(f"Successfully initialized codebase from {repo_url}")

        except Exception as e:
            logger.exception(f"Error initializing codebase from URL: {e}")
            raise

    def _init_from_path(self, repo_path: str, language: str | None = None):
        """
        Initialize codebase from a local repository path.

        Args:
            repo_path: Path to the repository
            language: Programming language of the codebase
        """
        try:
            # Set up configuration
            config = CodebaseConfig(
                debug=False,
                allow_external=True,
                py_resolve_syspath=True,
            )

            secrets = SecretsConfig()

            # Initialize the codebase
            logger.info(f"Initializing codebase from {repo_path}")

            # Determine programming language
            prog_lang = None
            if language:
                prog_lang = ProgrammingLanguage(language.upper())

            # Set up repository configuration
            repo_config = RepoConfig.from_repo_path(repo_path)
            repo_config.respect_gitignore = False
            repo_operator = RepoOperator(repo_config=repo_config, bot_commit=False)

            # Create project configuration
            project_config = ProjectConfig(
                repo_operator=repo_operator,
                programming_language=prog_lang if prog_lang else None,
            )

            # Initialize codebase
            self.base_codebase = Codebase(
                projects=[project_config], config=config, secrets=secrets
            )

            logger.info(f"Successfully initialized codebase from {repo_path}")

        except Exception as e:
            logger.exception(f"Error initializing codebase from path: {e}")
            raise

    def _init_pr_data(self, pr_number: int):
        """
        Initialize PR-specific data.

        Args:
            pr_number: PR number to analyze
        """
        try:
            logger.info(f"Fetching PR #{pr_number} data")
            result = self.base_codebase.get_modified_symbols_in_pr(pr_number)

            # Unpack the result tuple
            if len(result) >= 3:
                self.pr_diff, self.commit_shas, self.modified_symbols = result[:3]
                if len(result) >= 4:
                    self.pr_branch = result[3]

            logger.info(f"Found {len(self.modified_symbols)} modified symbols in PR")

            # Initialize PR codebase
            self._init_pr_codebase()

        except Exception as e:
            logger.exception(f"Error initializing PR data: {e}")
            raise

    def _init_pr_codebase(self):
        """Initialize PR codebase by checking out the PR branch."""
        if not self.base_codebase or not self.pr_number:
            logger.error("Base codebase or PR number not initialized")
            return

        try:
            # Get PR data if not already fetched
            if not self.pr_branch:
                self._init_pr_data(self.pr_number)

            if not self.pr_branch:
                logger.error("Failed to get PR branch")
                return

            # Clone the base codebase
            self.pr_codebase = self.base_codebase

            # Checkout PR branch
            logger.info(f"Checking out PR branch: {self.pr_branch}")
            self.pr_codebase.checkout(self.pr_branch)

            logger.info("Successfully initialized PR codebase")

        except Exception as e:
            logger.exception(f"Error initializing PR codebase: {e}")
            raise

    def _init_contexts(self):
        """Initialize CodebaseContext objects for both base and PR codebases."""
        if self.base_codebase:
            try:
                self.base_context = CodebaseContext(
                    codebase=self.base_codebase,
                    base_path=self.repo_path,
                    pr_branch=None,
                    base_branch=self.base_branch,
                )
                logger.info("Successfully initialized base context")
            except Exception as e:
                logger.exception(f"Error initializing base context: {e}")

        if self.pr_codebase:
            try:
                self.pr_context = CodebaseContext(
                    codebase=self.pr_codebase,
                    base_path=self.repo_path,
                    pr_branch=self.pr_branch,
                    base_branch=self.base_branch,
                )
                logger.info("Successfully initialized PR context")
            except Exception as e:
                logger.exception(f"Error initializing PR context: {e}")

    def add_issue(self, issue: Issue):
        """
        Add an issue to the list of detected issues.

        Args:
            issue: Issue to add
        """
        self.issues.append(issue)

    def get_issues(
        self,
        severity: IssueSeverity | None = None,
        category: IssueCategory | None = None,
    ) -> list[Issue]:
        """
        Get all issues matching the specified criteria.

        Args:
            severity: Optional severity level to filter by
            category: Optional category to filter by

        Returns:
            List of matching issues
        """
        filtered_issues = self.issues

        if severity:
            filtered_issues = [i for i in filtered_issues if i.severity == severity]

        if category:
            filtered_issues = [i for i in filtered_issues if i.category == category]

        return filtered_issues

    def save_results(self, output_file: str):
        """
        Save analysis results to a file.

        Args:
            output_file: Path to the output file
        """
        with open(output_file, "w") as f:
            json.dump(self.results, f, indent=2)

        logger.info(f"Results saved to {output_file}")

    @abstractmethod
    def analyze(self, analysis_type: AnalysisType) -> dict[str, Any]:
        """
        Perform analysis on the codebase.

        Args:
            analysis_type: Type of analysis to perform

        Returns:
            Dictionary containing analysis results
        """
        pass

