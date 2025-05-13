"""Function module."""

from typing import Any, List, Optional

class Function:
    """Represents a function definition in the code."""
    
    def __init__(self, name: str, file: Any = None):
        """Initialize a function definition.
        
        Args:
            name: The name of the function
            file: The file containing the function
        """
        self.name = name
        self.file = file
        self.decorators: List[Any] = []
        self.dependencies: List[Any] = []
        
    def __str__(self) -> str:
        return self.name
        
    def __repr__(self) -> str:
        return f"Function({self.name})"

