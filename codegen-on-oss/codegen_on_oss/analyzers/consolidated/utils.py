#!/usr/bin/env python3
"""
Utilities Module

This module provides utility functions for the analyzers package.
"""

import logging
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def get_file_extension(file_path: str) -> str:
    """
    Get the extension of a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        File extension (including the dot)
    """
    _, ext = os.path.splitext(file_path)
    return ext


def is_binary_file(file_path: str) -> bool:
    """
    Check if a file is binary.
    
    Args:
        file_path: Path to the file
        
    Returns:
        True if the file is binary, False otherwise
    """
    # Common binary file extensions
    binary_extensions = {
        ".pyc", ".pyo", ".so", ".dll", ".exe", ".bin", ".dat", ".db",
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".ico", ".svg",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
        ".mp3", ".mp4", ".avi", ".mov", ".flv", ".wav",
    }
    
    # Check extension
    ext = get_file_extension(file_path)
    if ext.lower() in binary_extensions:
        return True
    
    # Check file content
    try:
        with open(file_path, "rb") as f:
            chunk = f.read(1024)
            return b"\0" in chunk
    except Exception:
        # If we can't read the file, assume it's not binary
        return False


def is_test_file(file_path: str) -> bool:
    """
    Check if a file is a test file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        True if the file is a test file, False otherwise
    """
    # Check if the file is in a test directory
    if "test" in file_path.lower().split(os.path.sep):
        return True
    
    # Check if the file name contains "test"
    file_name = os.path.basename(file_path)
    if "test" in file_name.lower():
        return True
    
    return False


def is_generated_file(file_path: str) -> bool:
    """
    Check if a file is generated.
    
    Args:
        file_path: Path to the file
        
    Returns:
        True if the file is generated, False otherwise
    """
    # Check if the file is in a generated directory
    if "generated" in file_path.lower().split(os.path.sep):
        return True
    
    # Check if the file name contains "generated"
    file_name = os.path.basename(file_path)
    if "generated" in file_name.lower():
        return True
    
    # Check file content for generated markers
    try:
        with open(file_path, "r") as f:
            first_lines = "".join(f.readline() for _ in range(10))
            if "generated" in first_lines.lower() or "auto-generated" in first_lines.lower():
                return True
    except Exception:
        # If we can't read the file, assume it's not generated
        pass
    
    return False


def count_lines_of_code(file_path: str) -> int:
    """
    Count the number of lines of code in a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Number of lines of code
    """
    # Check if the file is binary
    if is_binary_file(file_path):
        return 0
    
    # Count lines
    try:
        with open(file_path, "r") as f:
            return sum(1 for _ in f)
    except Exception:
        # If we can't read the file, return 0
        return 0


def count_non_empty_lines(file_path: str) -> int:
    """
    Count the number of non-empty lines in a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Number of non-empty lines
    """
    # Check if the file is binary
    if is_binary_file(file_path):
        return 0
    
    # Count non-empty lines
    try:
        with open(file_path, "r") as f:
            return sum(1 for line in f if line.strip())
    except Exception:
        # If we can't read the file, return 0
        return 0


def count_comment_lines(file_path: str) -> int:
    """
    Count the number of comment lines in a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Number of comment lines
    """
    # Check if the file is binary
    if is_binary_file(file_path):
        return 0
    
    # Get file extension
    ext = get_file_extension(file_path)
    
    # Define comment patterns based on file extension
    comment_patterns = {
        ".py": r"^\s*#",
        ".js": r"^\s*(//|/\*)",
        ".ts": r"^\s*(//|/\*)",
        ".jsx": r"^\s*(//|/\*)",
        ".tsx": r"^\s*(//|/\*)",
        ".java": r"^\s*(//|/\*)",
        ".c": r"^\s*(//|/\*)",
        ".cpp": r"^\s*(//|/\*)",
        ".h": r"^\s*(//|/\*)",
        ".hpp": r"^\s*(//|/\*)",
        ".cs": r"^\s*(//|/\*)",
        ".go": r"^\s*(//|/\*)",
        ".rb": r"^\s*#",
        ".php": r"^\s*(//|#|/\*)",
        ".swift": r"^\s*(//|/\*)",
        ".kt": r"^\s*(//|/\*)",
        ".rs": r"^\s*(//|/\*)",
        ".sh": r"^\s*#",
        ".bash": r"^\s*#",
        ".zsh": r"^\s*#",
        ".fish": r"^\s*#",
        ".html": r"^\s*<!--",
        ".xml": r"^\s*<!--",
        ".css": r"^\s*/\*",
        ".scss": r"^\s*(//|/\*)",
        ".less": r"^\s*(//|/\*)",
        ".sql": r"^\s*--",
        ".r": r"^\s*#",
        ".m": r"^\s*%",
        ".yaml": r"^\s*#",
        ".yml": r"^\s*#",
        ".toml": r"^\s*#",
        ".ini": r"^\s*;",
        ".cfg": r"^\s*[;#]",
        ".conf": r"^\s*[;#]",
        ".md": r"^\s*<!--",
        ".rst": r"^\s*\.\.",
    }
    
    # Get comment pattern for this file extension
    pattern = comment_patterns.get(ext.lower())
    if not pattern:
        return 0
    
    # Count comment lines
    try:
        with open(file_path, "r") as f:
            return sum(1 for line in f if re.match(pattern, line))
    except Exception:
        # If we can't read the file, return 0
        return 0


def get_file_language(file_path: str) -> str:
    """
    Get the programming language of a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Programming language
    """
    # Get file extension
    ext = get_file_extension(file_path)
    
    # Map extensions to languages
    language_map = {
        ".py": "Python",
        ".js": "JavaScript",
        ".ts": "TypeScript",
        ".jsx": "JavaScript",
        ".tsx": "TypeScript",
        ".java": "Java",
        ".c": "C",
        ".cpp": "C++",
        ".h": "C",
        ".hpp": "C++",
        ".cs": "C#",
        ".go": "Go",
        ".rb": "Ruby",
        ".php": "PHP",
        ".swift": "Swift",
        ".kt": "Kotlin",
        ".rs": "Rust",
        ".sh": "Shell",
        ".bash": "Shell",
        ".zsh": "Shell",
        ".fish": "Shell",
        ".html": "HTML",
        ".xml": "XML",
        ".css": "CSS",
        ".scss": "SCSS",
        ".less": "Less",
        ".sql": "SQL",
        ".r": "R",
        ".m": "Matlab",
        ".yaml": "YAML",
        ".yml": "YAML",
        ".toml": "TOML",
        ".ini": "INI",
        ".cfg": "INI",
        ".conf": "INI",
        ".md": "Markdown",
        ".rst": "reStructuredText",
        ".json": "JSON",
    }
    
    # Get language for this file extension
    return language_map.get(ext.lower(), "Unknown")


def get_directory_size(directory_path: str) -> int:
    """
    Get the size of a directory in bytes.
    
    Args:
        directory_path: Path to the directory
        
    Returns:
        Size of the directory in bytes
    """
    total_size = 0
    
    # Walk through the directory
    for dirpath, _, filenames in os.walk(directory_path):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            try:
                total_size += os.path.getsize(file_path)
            except Exception:
                # If we can't get the file size, ignore it
                pass
    
    return total_size


def get_file_stats(file_path: str) -> Dict[str, Any]:
    """
    Get statistics for a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Dictionary containing file statistics
    """
    stats = {
        "file_path": file_path,
        "file_name": os.path.basename(file_path),
        "extension": get_file_extension(file_path),
        "language": get_file_language(file_path),
        "is_binary": is_binary_file(file_path),
        "is_test": is_test_file(file_path),
        "is_generated": is_generated_file(file_path),
    }
    
    # Add size
    try:
        stats["size"] = os.path.getsize(file_path)
    except Exception:
        stats["size"] = 0
    
    # Add line counts
    if not stats["is_binary"]:
        stats["lines"] = count_lines_of_code(file_path)
        stats["non_empty_lines"] = count_non_empty_lines(file_path)
        stats["comment_lines"] = count_comment_lines(file_path)
        stats["code_lines"] = stats["non_empty_lines"] - stats["comment_lines"]
    else:
        stats["lines"] = 0
        stats["non_empty_lines"] = 0
        stats["comment_lines"] = 0
        stats["code_lines"] = 0
    
    return stats


def get_directory_stats(directory_path: str) -> Dict[str, Any]:
    """
    Get statistics for a directory.
    
    Args:
        directory_path: Path to the directory
        
    Returns:
        Dictionary containing directory statistics
    """
    stats = {
        "directory_path": directory_path,
        "directory_name": os.path.basename(directory_path),
        "size": get_directory_size(directory_path),
        "file_count": 0,
        "directory_count": 0,
        "languages": {},
        "extensions": {},
        "lines": 0,
        "non_empty_lines": 0,
        "comment_lines": 0,
        "code_lines": 0,
    }
    
    # Walk through the directory
    for dirpath, dirnames, filenames in os.walk(directory_path):
        # Update directory count
        stats["directory_count"] += len(dirnames)
        
        # Process files
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            
            # Update file count
            stats["file_count"] += 1
            
            # Get file stats
            file_stats = get_file_stats(file_path)
            
            # Update language stats
            language = file_stats["language"]
            if language not in stats["languages"]:
                stats["languages"][language] = 0
            stats["languages"][language] += 1
            
            # Update extension stats
            extension = file_stats["extension"]
            if extension not in stats["extensions"]:
                stats["extensions"][extension] = 0
            stats["extensions"][extension] += 1
            
            # Update line counts
            stats["lines"] += file_stats["lines"]
            stats["non_empty_lines"] += file_stats["non_empty_lines"]
            stats["comment_lines"] += file_stats["comment_lines"]
            stats["code_lines"] += file_stats["code_lines"]
    
    return stats

