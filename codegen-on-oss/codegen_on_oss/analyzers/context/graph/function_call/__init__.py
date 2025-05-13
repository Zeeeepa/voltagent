"""Function call module."""

from typing import Any, Optional

class FunctionCall:
    """Represents a function call in the code."""
    
    def __init__(self, name: str, caller: Optional[Any] = None):
        """Initialize a function call.
        
        Args:
            name: The name of the function being called
            caller: The function making the call
        """
        self.name = name
        self.caller = caller
        self.called_function = None
        
    def __str__(self) -> str:
        return self.name
        
    def __repr__(self) -> str:
        return f"FunctionCall({self.name})"

