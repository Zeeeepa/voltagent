"""Import resolution module."""

from typing import Any, Optional

class Import:
    """Represents an import statement in the code."""
    
    def __init__(self, name: str, imported_symbol: Optional[Any] = None):
        """Initialize an import statement.
        
        Args:
            name: The name of the import
            imported_symbol: The symbol being imported
        """
        self.name = name
        self.imported_symbol = imported_symbol
        
    def __str__(self) -> str:
        return self.name
        
    def __repr__(self) -> str:
        return f"Import({self.name})"

