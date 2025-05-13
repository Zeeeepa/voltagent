"""Codebase module for code analysis."""

from typing import Any, Dict, List, Optional, Union

from codegen_on_oss.analyzers.context.graph.class_definition import Class
from codegen_on_oss.analyzers.context.graph.function import Function


class Codebase:
    """Represents a codebase for analysis.
    
    This class provides methods for accessing and analyzing the structure of a codebase,
    including functions, classes, and their relationships.
    """
    
    def __init__(self):
        """Initialize a codebase."""
        self.functions: List[Function] = []
        self.classes: List[Class] = []
        self.files: List[Any] = []
        
    def get_function(self, function_name: str) -> Optional[Function]:
        """Get a function by name.
        
        Args:
            function_name: The name of the function to get
            
        Returns:
            The function if found, None otherwise
        """
        for function in self.functions:
            if function.name == function_name:
                return function
        return None
        
    def get_class(self, class_name: str) -> Optional[Class]:
        """Get a class by name.
        
        Args:
            class_name: The name of the class to get
            
        Returns:
            The class if found, None otherwise
        """
        for cls in self.classes:
            if cls.name == class_name:
                return cls
        return None
        
    def get_file(self, file_path: str) -> Optional[Any]:
        """Get a file by path.
        
        Args:
            file_path: The path of the file to get
            
        Returns:
            The file if found, None otherwise
        """
        for file in self.files:
            if file.filepath == file_path:
                return file
        return None

