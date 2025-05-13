"""Class definition module."""

from typing import Any, List, Optional

class Class:
    """Represents a class definition in the code."""
    
    def __init__(self, name: str, file: Any = None):
        """Initialize a class definition.
        
        Args:
            name: The name of the class
            file: The file containing the class
        """
        self.name = name
        self.file = file
        self.methods: List[Any] = []
        self.decorators: List[Any] = []
        
    def __str__(self) -> str:
        return self.name
        
    def __repr__(self) -> str:
        return f"Class({self.name})"

