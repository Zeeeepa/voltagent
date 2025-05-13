"""Symbol module."""

from typing import Any, List, Optional, Set

class Symbol:
    """Base class for symbols in the code."""
    
    def __init__(self, name: str):
        """Initialize a symbol.
        
        Args:
            name: The name of the symbol
        """
        self.name = name
        self.symbol_usages: List[Any] = []
        self.dependencies: List[Any] = []
        
    def __str__(self) -> str:
        return self.name
        
    def __repr__(self) -> str:
        return f"Symbol({self.name})"

