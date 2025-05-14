from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from codegen_on_oss.analyzers.issues import IssueCollection


class AnalysisType(str, Enum):
    """Types of analysis that can be performed."""
    CODE_QUALITY = "code_quality"
    SECURITY = "security"
    PERFORMANCE = "performance"
    MAINTAINABILITY = "maintainability"
    CUSTOM = "custom"


class AnalysisResult:
    """Result of a code analysis."""

    def __init__(
        self,
        analysis_type: AnalysisType,
        issues: IssueCollection,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Initialize an analysis result.
        
        Args:
            analysis_type: Type of analysis performed
            issues: Collection of issues found during analysis
            metadata: Additional metadata about the analysis
        """
        self.analysis_type = analysis_type
        self.issues = issues
        self.metadata = metadata or {}
        self.timestamp = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """Convert the analysis result to a dictionary.
        
        Returns:
            Dictionary representation of the analysis result
        """
        return {
            "analysis_type": self.analysis_type,
            "issues": self.issues.to_dict(),
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AnalysisResult":
        """Create an analysis result from a dictionary.
        
        Args:
            data: Dictionary representation of an analysis result
            
        Returns:
            An AnalysisResult instance
        """
        analysis_type = AnalysisType(data["analysis_type"])
        issues = IssueCollection.from_dict(data["issues"])
        metadata = data.get("metadata", {})
        result = cls(analysis_type, issues, metadata)
        if "timestamp" in data:
            result.timestamp = datetime.fromisoformat(data["timestamp"])
        return result

