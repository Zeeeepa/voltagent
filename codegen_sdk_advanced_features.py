"""
Codegen SDK Advanced Features

This module demonstrates advanced features of the Codegen SDK, focusing on code manipulation,
symbol movement, and dependency management capabilities.

The module provides utility functions for:
1. Splitting functions into separate files
2. Moving symbols between files with different strategies
3. Managing dependencies during symbol movement
4. Batch processing multiple symbols
"""

from typing import List, Optional, Union, Callable, Dict, Any, Tuple

class CodegenSDK:
    """
    A utility class that provides advanced code manipulation features using the Codegen SDK.
    
    This class offers methods for refactoring code, moving symbols between files, and managing
    dependencies during code transformations.
    """
    
    @staticmethod
    def split_functions_into_files(
        codebase: Any, 
        source_filepath: str, 
        output_dir: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Splits all functions from a source file into separate files, one per function.
        
        Args:
            codebase: The codebase object from Codegen SDK
            source_filepath: Path to the source file containing functions
            output_dir: Optional directory for output files (defaults to same directory as source)
            
        Returns:
            Dictionary mapping function names to their new file paths
        
        Example:
            ```python
            result = CodegenSDK.split_functions_into_files(
                codebase, 
                "path/to/source.py"
            )
            # Result: {'function1': 'function1.py', 'function2': 'function2.py'}
            ```
        """
        # Get the source file from the codebase
        source_file = codebase.get_file(source_filepath)
        
        # Prepare output directory
        if output_dir is None:
            # Extract directory from source filepath
            parts = source_filepath.split('/')
            if len(parts) > 1:
                output_dir = '/'.join(parts[:-1])
            else:
                output_dir = ""
        
        # Track created files
        created_files = {}
        
        # Iterate through functions in the source file
        for function in source_file.functions:
            # Create filename from function name
            function_filename = f"{function.name}.py"
            if output_dir:
                function_filepath = f"{output_dir}/{function_filename}"
            else:
                function_filepath = function_filename
                
            # Create new file for the function
            new_file = codebase.create_file(function_filepath)
            
            # Move the function to the new file
            function.move_to_file(new_file)
            
            # Track the created file
            created_files[function.name] = function_filepath
            
        return created_files
    
    @staticmethod
    def move_symbol(
        codebase: Any,
        symbol_name: str,
        source_filepath: str,
        destination_filepath: str,
        strategy: str = "add_back_edge",
        include_dependencies: bool = True,
        create_destination: bool = True
    ) -> bool:
        """
        Moves a symbol from a source file to a destination file.
        
        Args:
            codebase: The codebase object from Codegen SDK
            symbol_name: Name of the symbol to move
            source_filepath: Path to the source file containing the symbol
            destination_filepath: Path to the destination file
            strategy: Strategy for handling imports ("add_back_edge" or "update_all_imports")
            include_dependencies: Whether to include dependencies in the move
            create_destination: Whether to create the destination file if it doesn't exist
            
        Returns:
            True if the move was successful, False otherwise
            
        Example:
            ```python
            success = CodegenSDK.move_symbol(
                codebase,
                "my_function", 
                "source.py", 
                "destination.py",
                strategy="update_all_imports"
            )
            ```
        """
        # Get the source file
        source_file = codebase.get_file(source_filepath)
        
        # Get the symbol to move
        symbol = source_file.get_symbol(symbol_name)
        if not symbol:
            return False
        
        # Get or create the destination file
        try:
            destination_file = codebase.get_file(destination_filepath)
        except Exception:
            if create_destination:
                destination_file = codebase.create_file(destination_filepath)
            else:
                return False
        
        # Move the symbol to the destination file
        symbol.move_to_file(
            destination_file, 
            include_dependencies=include_dependencies, 
            strategy=strategy
        )
        
        return True
    
    @staticmethod
    def move_symbols_with_dependencies(
        codebase: Any,
        symbol_names: List[str],
        source_filepath: str,
        destination_filepath: str,
        strategy: str = "update_all_imports"
    ) -> Dict[str, bool]:
        """
        Moves multiple symbols from a source file to a destination file.
        
        Args:
            codebase: The codebase object from Codegen SDK
            symbol_names: List of symbol names to move
            source_filepath: Path to the source file containing the symbols
            destination_filepath: Path to the destination file
            strategy: Strategy for handling imports
            
        Returns:
            Dictionary mapping symbol names to success status
            
        Example:
            ```python
            results = CodegenSDK.move_symbols_with_dependencies(
                codebase,
                ["my_function", "MyClass"],
                "source.py",
                "destination.py"
            )
            # Results: {"my_function": True, "MyClass": True}
            ```
        """
        # Get the source file
        source_file = codebase.get_file(source_filepath)
        
        # Get or create the destination file
        try:
            destination_file = codebase.get_file(destination_filepath)
        except Exception:
            destination_file = codebase.create_file(destination_filepath)
        
        # Track results
        results = {}
        
        # Move each symbol
        for symbol_name in symbol_names:
            try:
                # Get the symbol
                symbol = source_file.get_symbol(symbol_name)
                if not symbol:
                    results[symbol_name] = False
                    continue
                
                # Move the symbol
                symbol.move_to_file(
                    destination_file,
                    include_dependencies=True,
                    strategy=strategy
                )
                
                results[symbol_name] = True
            except Exception as e:
                results[symbol_name] = False
        
        return results
    
    @staticmethod
    def move_symbols_by_type(
        codebase: Any,
        source_filepath: str,
        destination_filepath: str,
        move_functions: bool = True,
        move_classes: bool = True,
        strategy: str = "update_all_imports"
    ) -> Dict[str, Dict[str, bool]]:
        """
        Moves symbols of specified types from a source file to a destination file.
        
        Args:
            codebase: The codebase object from Codegen SDK
            source_filepath: Path to the source file containing the symbols
            destination_filepath: Path to the destination file
            move_functions: Whether to move functions
            move_classes: Whether to move classes
            strategy: Strategy for handling imports
            
        Returns:
            Dictionary with 'functions' and 'classes' keys, each mapping to success results
            
        Example:
            ```python
            results = CodegenSDK.move_symbols_by_type(
                codebase,
                "source.py",
                "destination.py",
                move_functions=True,
                move_classes=True
            )
            ```
        """
        # Get the source file
        source_file = codebase.get_file(source_filepath)
        
        # Get or create the destination file
        try:
            destination_file = codebase.get_file(destination_filepath)
        except Exception:
            destination_file = codebase.create_file(destination_filepath)
        
        # Track results
        results = {
            "functions": {},
            "classes": {}
        }
        
        # Move functions if requested
        if move_functions:
            for function in source_file.functions:
                try:
                    function.move_to_file(
                        destination_file,
                        include_dependencies=True,
                        strategy=strategy
                    )
                    results["functions"][function.name] = True
                except Exception:
                    results["functions"][function.name] = False
        
        # Move classes if requested
        if move_classes:
            for cls in source_file.classes:
                try:
                    cls.move_to_file(
                        destination_file,
                        include_dependencies=True,
                        strategy=strategy
                    )
                    results["classes"][cls.name] = True
                except Exception:
                    results["classes"][cls.name] = False
        
        return results
    
    @staticmethod
    def extract_function_to_file(
        codebase: Any,
        function_name: str,
        source_filepath: str,
        destination_filepath: Optional[str] = None,
        strategy: str = "add_back_edge"
    ) -> str:
        """
        Extracts a function from a source file to its own file.
        
        Args:
            codebase: The codebase object from Codegen SDK
            function_name: Name of the function to extract
            source_filepath: Path to the source file containing the function
            destination_filepath: Optional path for the destination file
                                 (defaults to function_name.py)
            strategy: Strategy for handling imports
            
        Returns:
            Path to the created file
            
        Example:
            ```python
            new_file = CodegenSDK.extract_function_to_file(
                codebase,
                "process_data",
                "utils.py"
            )
            # Result: "process_data.py"
            ```
        """
        # Get the source file
        source_file = codebase.get_file(source_filepath)
        
        # Get the function
        function = source_file.get_function(function_name)
        if not function:
            raise ValueError(f"Function '{function_name}' not found in {source_filepath}")
        
        # Determine destination filepath if not provided
        if destination_filepath is None:
            destination_filepath = f"{function_name}.py"
        
        # Create the destination file
        destination_file = codebase.create_file(destination_filepath)
        
        # Move the function
        function.move_to_file(
            destination_file,
            include_dependencies=True,
            strategy=strategy
        )
        
        return destination_filepath
    
    @staticmethod
    def extract_class_to_file(
        codebase: Any,
        class_name: str,
        source_filepath: str,
        destination_filepath: Optional[str] = None,
        strategy: str = "add_back_edge"
    ) -> str:
        """
        Extracts a class from a source file to its own file.
        
        Args:
            codebase: The codebase object from Codegen SDK
            class_name: Name of the class to extract
            source_filepath: Path to the source file containing the class
            destination_filepath: Optional path for the destination file
                                 (defaults to class_name.py)
            strategy: Strategy for handling imports
            
        Returns:
            Path to the created file
            
        Example:
            ```python
            new_file = CodegenSDK.extract_class_to_file(
                codebase,
                "UserManager",
                "models.py"
            )
            # Result: "UserManager.py"
            ```
        """
        # Get the source file
        source_file = codebase.get_file(source_filepath)
        
        # Get the class
        cls = source_file.get_class(class_name)
        if not cls:
            raise ValueError(f"Class '{class_name}' not found in {source_filepath}")
        
        # Determine destination filepath if not provided
        if destination_filepath is None:
            destination_filepath = f"{class_name}.py"
        
        # Create the destination file
        destination_file = codebase.create_file(destination_filepath)
        
        # Move the class
        cls.move_to_file(
            destination_file,
            include_dependencies=True,
            strategy=strategy
        )
        
        return destination_filepath

    @staticmethod
    def move_typescript_symbol(
        codebase: Any,
        symbol_name: str,
        source_filepath: str,
        destination_filepath: str,
        strategy: str = "add_back_edge",
        include_dependencies: bool = True
    ) -> bool:
        """
        Moves a TypeScript symbol from a source file to a destination file.
        
        Args:
            codebase: The codebase object from Codegen SDK (TSCodebaseType)
            symbol_name: Name of the symbol to move
            source_filepath: Path to the source file containing the symbol
            destination_filepath: Path to the destination file
            strategy: Strategy for handling imports
            include_dependencies: Whether to include dependencies in the move
            
        Returns:
            True if the move was successful, False otherwise
            
        Example:
            ```python
            success = CodegenSDK.move_typescript_symbol(
                codebase,
                "processData", 
                "utils.ts", 
                "helpers.ts"
            )
            ```
        """
        # Get the source file
        source_file = codebase.get_file(source_filepath)
        
        # Get the symbol to move
        symbol = source_file.get_symbol(symbol_name)
        if not symbol:
            return False
        
        # Get or create the destination file
        try:
            destination_file = codebase.get_file(destination_filepath)
        except Exception:
            destination_file = codebase.create_file(destination_filepath)
        
        # Move the symbol to the destination file
        symbol.move_to_file(
            destination_file, 
            include_dependencies=include_dependencies, 
            strategy=strategy
        )
        
        return True

# Example usage (commented out as this is a library file)
"""
def example_usage(codebase):
    # Example 1: Split functions into separate files
    CodegenSDK.split_functions_into_files(
        codebase, 
        "path/to/file.py"
    )
    
    # Example 2: Move a symbol with dependencies
    CodegenSDK.move_symbol(
        codebase,
        "my_function", 
        "path/to/source_file.py", 
        "path/to/dst/location.py",
        strategy="add_back_edge",
        include_dependencies=True
    )
    
    # Example 3: Move multiple symbols
    CodegenSDK.move_symbols_with_dependencies(
        codebase,
        ["my_function", "MyClass"],
        "path/to/source_file.py",
        "path/to/destination_file.py"
    )
    
    # Example 4: Extract a function to its own file
    CodegenSDK.extract_function_to_file(
        codebase,
        "process_data",
        "utils.py"
    )
    
    # Example 5: Move TypeScript symbol
    CodegenSDK.move_typescript_symbol(
        codebase,
        "processData", 
        "utils.ts", 
        "helpers.ts"
    )
"""

