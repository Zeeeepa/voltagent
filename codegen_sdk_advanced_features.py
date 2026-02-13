"""
Codegen SDK Advanced Features

This module demonstrates advanced features of the Codegen SDK for code manipulation,
focusing on symbol movement, dependency handling, and import management.

The Codegen SDK provides powerful capabilities for:
1. Moving symbols (functions, classes) between files
2. Handling dependencies during symbol movement
3. Managing imports with different strategies
4. Supporting both Python and TypeScript codebases

Author: Codegen
"""

from abc import ABC
from typing import List, Union, Optional, Callable, Any

# Mock imports for demonstration purposes
# In a real implementation, these would be actual imports from the Codegen SDK
class CodebaseType:
    """Represents a codebase that can be manipulated using the Codegen SDK."""
    
    def get_file(self, filepath: str) -> 'FileType':
        """
        Retrieves a file from the codebase.
        
        Args:
            filepath: Path to the file relative to the codebase root
            
        Returns:
            A FileType object representing the file
        """
        print(f"Getting file: {filepath}")
        return FileType(filepath)
    
    def create_file(self, filepath: str) -> 'FileType':
        """
        Creates a new file in the codebase.
        
        Args:
            filepath: Path where the new file should be created
            
        Returns:
            A FileType object representing the newly created file
        """
        print(f"Creating file: {filepath}")
        return FileType(filepath)
    
    def get_symbol(self, symbol_name: str) -> 'SymbolType':
        """
        Retrieves a symbol from the codebase by name.
        
        This is a convenience method that searches for the symbol across all files.
        For more precise control, get the file first and then retrieve the symbol from it.
        
        Args:
            symbol_name: Name of the symbol to retrieve
            
        Returns:
            A SymbolType object representing the symbol
        """
        print(f"Getting symbol: {symbol_name} from codebase")
        return SymbolType(symbol_name)


class TSCodebaseType(CodebaseType):
    """Represents a TypeScript codebase with TypeScript-specific functionality."""
    pass


class FileType:
    """Represents a file in the codebase that can be manipulated."""
    
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.functions = []  # In a real implementation, this would be populated with actual functions
        
    def get_symbol(self, symbol_name: str) -> 'SymbolType':
        """
        Retrieves a symbol from the file by name.
        
        Args:
            symbol_name: Name of the symbol to retrieve
            
        Returns:
            A SymbolType object representing the symbol
        """
        print(f"Getting symbol: {symbol_name} from file: {self.filepath}")
        return SymbolType(symbol_name)
    
    def get_function(self, function_name: str) -> 'SymbolType':
        """
        Retrieves a function from the file by name.
        
        Args:
            function_name: Name of the function to retrieve
            
        Returns:
            A SymbolType object representing the function
        """
        print(f"Getting function: {function_name} from file: {self.filepath}")
        return SymbolType(function_name, symbol_type="function")
    
    def get_class(self, class_name: str) -> 'SymbolType':
        """
        Retrieves a class from the file by name.
        
        Args:
            class_name: Name of the class to retrieve
            
        Returns:
            A SymbolType object representing the class
        """
        print(f"Getting class: {class_name} from file: {self.filepath}")
        return SymbolType(class_name, symbol_type="class")


class SymbolType:
    """Represents a symbol (function, class, variable) that can be manipulated."""
    
    def __init__(self, name: str, symbol_type: str = "generic"):
        self.name = name
        self.symbol_type = symbol_type
    
    def move_to_file(self, dest_file: FileType, include_dependencies: bool = False, strategy: str = None) -> None:
        """
        Moves the symbol to another file.
        
        This is a powerful operation that can:
        1. Move the symbol's definition to the destination file
        2. Optionally move dependencies along with the symbol
        3. Update imports in the original file and other affected files
        
        Args:
            dest_file: The destination file where the symbol should be moved
            include_dependencies: Whether to also move dependencies of this symbol
            strategy: The strategy to use for handling imports. Options include:
                - "add_back_edge": Adds an import in the original file to import the symbol from its new location
                - "update_all_imports": Updates all imports of this symbol across the codebase
                
        Returns:
            None
        """
        dependency_str = "with dependencies" if include_dependencies else "without dependencies"
        strategy_str = f"using strategy '{strategy}'" if strategy else "using default strategy"
        
        print(f"Moving {self.symbol_type} '{self.name}' to {dest_file.filepath} {dependency_str} {strategy_str}")


# Enums for demonstration purposes
class ProgrammingLanguage:
    """Enum for supported programming languages."""
    PYTHON = "python"
    TYPESCRIPT = "typescript"


# Demonstration classes
class CodegenSDKDemonstrator:
    """
    Demonstrates advanced features of the Codegen SDK.
    
    This class provides methods that showcase different capabilities of the SDK,
    particularly around symbol manipulation and code movement.
    """
    
    @staticmethod
    def demonstrate_split_functions_into_separate_files(codebase: CodebaseType) -> None:
        """
        Demonstrates how to split functions from a file into separate files.
        
        This method:
        1. Retrieves a Python file from the codebase
        2. Iterates through its functions
        3. Creates a new file for each function
        4. Moves the function to the newly created file
        
        Args:
            codebase: The codebase to operate on
            
        Returns:
            None
        """
        print("\n=== Demonstrating: Split Functions Into Separate Files ===")
        
        # Retrieve the Python file from the codebase
        file = codebase.get_file("path/to/file.py")
        
        # Iterate through the functions in the file
        # For demonstration, we'll create some mock functions
        mock_functions = [
            SymbolType("function1", "function"),
            SymbolType("function2", "function"),
            SymbolType("function3", "function")
        ]
        
        for function in mock_functions:
            # Create a new file for each function using the function's name
            new_file = codebase.create_file(function.name + ".py")
            # Move the function to the newly created file
            function.move_to_file(new_file)
    
    @staticmethod
    def demonstrate_move_symbol_between_files(codebase: CodebaseType) -> None:
        """
        Demonstrates how to move a symbol from one file to another.
        
        This method:
        1. Gets a source file and a symbol from it
        2. Gets or creates a destination file
        3. Moves the symbol to the destination file with dependencies
        4. Uses the "add_back_edge" strategy to add an import in the original file
        
        Args:
            codebase: The codebase to operate on
            
        Returns:
            None
        """
        print("\n=== Demonstrating: Move Symbol Between Files ===")
        
        # Get the source file
        source_file = codebase.get_file("path/to/source_file.py")
        
        # Get the symbol to move
        symbol_to_move = source_file.get_symbol("my_function")
        
        # Get the destination file
        dst_file = codebase.get_file("path/to/dst/location.py")
        
        # Move the symbol with dependencies and add an import back to the original file
        symbol_to_move.move_to_file(
            dst_file, 
            include_dependencies=True, 
            strategy="add_back_edge"
        )
    
    @staticmethod
    def demonstrate_move_symbol_with_updated_imports(codebase: CodebaseType) -> None:
        """
        Demonstrates how to move a symbol and update all imports.
        
        This method:
        1. Gets a symbol from the codebase
        2. Creates a new destination file
        3. Moves the symbol to the destination file
        4. Uses the "update_all_imports" strategy to update all imports across the codebase
        
        Args:
            codebase: The codebase to operate on
            
        Returns:
            None
        """
        print("\n=== Demonstrating: Move Symbol With Updated Imports ===")
        
        # Get the symbol to move
        symbol_to_move = codebase.get_symbol("symbol_to_move")
        
        # Create a new destination file
        dst_file = codebase.create_file("new_file.py")
        
        # Move the symbol and update all imports across the codebase
        symbol_to_move.move_to_file(dst_file, strategy="update_all_imports")
    
    @staticmethod
    def demonstrate_move_symbol_with_dependencies(codebase: CodebaseType) -> None:
        """
        Demonstrates how to move a symbol along with its dependencies.
        
        This method:
        1. Gets a symbol from the codebase
        2. Creates a new destination file
        3. Moves the symbol and its dependencies to the destination file
        
        Args:
            codebase: The codebase to operate on
            
        Returns:
            None
        """
        print("\n=== Demonstrating: Move Symbol With Dependencies ===")
        
        # Get the symbol to move
        my_symbol = codebase.get_symbol("my_symbol")
        
        # Create a new destination file
        dst_file = codebase.create_file("new_file.py")
        
        # Move the symbol along with its dependencies
        my_symbol.move_to_file(dst_file, include_dependencies=True)
    
    @staticmethod
    def demonstrate_move_multiple_symbols(codebase: CodebaseType) -> None:
        """
        Demonstrates how to move multiple symbols at once.
        
        This method:
        1. Gets a source file
        2. Gets a destination file
        3. Creates a list of symbols to move
        4. Iterates through the list and moves each symbol
        
        Args:
            codebase: The codebase to operate on
            
        Returns:
            None
        """
        print("\n=== Demonstrating: Move Multiple Symbols ===")
        
        # Retrieve the source and destination files
        source_file = codebase.get_file("path/to/source_file.py")
        dest_file = codebase.get_file("path/to/destination_file.py")
        
        # Create a list of symbols to move
        symbols_to_move = [
            source_file.get_function("my_function"), 
            source_file.get_class("MyClass")
        ]
        
        # Move each symbol to the destination file
        for symbol in symbols_to_move:
            symbol.move_to_file(
                dest_file, 
                include_dependencies=True, 
                strategy="update_all_imports"
            )
    
    @staticmethod
    def demonstrate_typescript_symbol_movement(codebase: TSCodebaseType) -> None:
        """
        Demonstrates how to move symbols in a TypeScript codebase.
        
        This method:
        1. Gets a source file from a TypeScript codebase
        2. Gets a symbol from the file
        3. Gets a destination file
        4. Moves the symbol to the destination file
        
        Args:
            codebase: The TypeScript codebase to operate on
            
        Returns:
            None
        """
        print("\n=== Demonstrating: TypeScript Symbol Movement ===")
        
        # Get the source file
        source_file = codebase.get_file("path/to/source_file.ts")
        
        # Get the symbol to move
        symbol_to_move = source_file.get_symbol("myFunction")
        
        # Get the destination file
        dst_file = codebase.get_file("path/to/dst/location.ts")
        
        # Move the symbol with dependencies and add an import back to the original file
        symbol_to_move.move_to_file(
            dst_file, 
            include_dependencies=True, 
            strategy="add_back_edge"
        )


def run_demonstrations():
    """
    Runs all demonstrations of the Codegen SDK advanced features.
    
    This function creates mock codebase objects and runs each demonstration method.
    In a real scenario, you would use actual codebase objects from the Codegen SDK.
    
    Returns:
        None
    """
    print("=== Codegen SDK Advanced Features Demonstration ===\n")
    
    # Create mock codebase objects
    python_codebase = CodebaseType()
    typescript_codebase = TSCodebaseType()
    
    # Run demonstrations
    demonstrator = CodegenSDKDemonstrator()
    
    demonstrator.demonstrate_split_functions_into_separate_files(python_codebase)
    demonstrator.demonstrate_move_symbol_between_files(python_codebase)
    demonstrator.demonstrate_move_symbol_with_updated_imports(python_codebase)
    demonstrator.demonstrate_move_symbol_with_dependencies(python_codebase)
    demonstrator.demonstrate_move_multiple_symbols(python_codebase)
    demonstrator.demonstrate_typescript_symbol_movement(typescript_codebase)
    
    print("\n=== End of Demonstration ===")


# Advanced usage examples
class AdvancedUsageExamples:
    """
    Provides more complex examples of using the Codegen SDK.
    
    These examples demonstrate more advanced usage patterns and combinations
    of features that might be useful in real-world scenarios.
    """
    
    @staticmethod
    def refactor_utility_functions(codebase: CodebaseType, source_file_path: str, dest_file_path: str) -> None:
        """
        Refactors utility functions from a source file to a dedicated utilities file.
        
        This example:
        1. Identifies utility functions in a source file
        2. Creates or gets a destination utilities file
        3. Moves all utility functions to the utilities file
        4. Updates all imports across the codebase
        
        Args:
            codebase: The codebase to operate on
            source_file_path: Path to the source file containing utility functions
            dest_file_path: Path to the destination utilities file
            
        Returns:
            None
        """
        print(f"\n=== Advanced Example: Refactoring Utility Functions ===")
        print(f"Source: {source_file_path}")
        print(f"Destination: {dest_file_path}")
        
        # Get the source file
        source_file = codebase.get_file(source_file_path)
        
        # Get or create the destination file
        try:
            dest_file = codebase.get_file(dest_file_path)
            print(f"Using existing utilities file: {dest_file_path}")
        except:
            dest_file = codebase.create_file(dest_file_path)
            print(f"Created new utilities file: {dest_file_path}")
        
        # For demonstration, we'll assume these are utility functions
        utility_functions = [
            source_file.get_function("format_string"),
            source_file.get_function("validate_input"),
            source_file.get_function("parse_config")
        ]
        
        # Move each utility function to the utilities file
        for function in utility_functions:
            function.move_to_file(
                dest_file,
                include_dependencies=True,
                strategy="update_all_imports"
            )
    
    @staticmethod
    def extract_class_to_separate_file(codebase: CodebaseType, source_file_path: str, class_name: str) -> None:
        """
        Extracts a class from a file into its own dedicated file.
        
        This example:
        1. Gets a class from a source file
        2. Creates a new file named after the class
        3. Moves the class to the new file along with its dependencies
        4. Updates all imports across the codebase
        
        Args:
            codebase: The codebase to operate on
            source_file_path: Path to the source file containing the class
            class_name: Name of the class to extract
            
        Returns:
            None
        """
        print(f"\n=== Advanced Example: Extracting Class to Separate File ===")
        print(f"Source: {source_file_path}")
        print(f"Class: {class_name}")
        
        # Get the source file
        source_file = codebase.get_file(source_file_path)
        
        # Get the class to extract
        class_to_extract = source_file.get_class(class_name)
        
        # Create a new file for the class
        # Convert CamelCase to snake_case for the filename
        import re
        def camel_to_snake(name):
            name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
            return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()
        
        new_file_path = f"{camel_to_snake(class_name)}.py"
        new_file = codebase.create_file(new_file_path)
        
        # Move the class to the new file
        class_to_extract.move_to_file(
            new_file,
            include_dependencies=True,
            strategy="update_all_imports"
        )
        
        print(f"Extracted class {class_name} to {new_file_path}")


def run_advanced_examples():
    """
    Runs the advanced usage examples.
    
    Returns:
        None
    """
    print("\n=== Codegen SDK Advanced Usage Examples ===\n")
    
    # Create a mock codebase
    codebase = CodebaseType()
    
    # Run advanced examples
    examples = AdvancedUsageExamples()
    examples.refactor_utility_functions(
        codebase,
        "src/main.py",
        "src/utils/string_utils.py"
    )
    
    examples.extract_class_to_separate_file(
        codebase,
        "src/models.py",
        "UserProfile"
    )
    
    print("\n=== End of Advanced Examples ===")


if __name__ == "__main__":
    # Run the demonstrations when the script is executed directly
    run_demonstrations()
    run_advanced_examples()

