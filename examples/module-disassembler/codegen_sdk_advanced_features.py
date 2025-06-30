#!/usr/bin/env python3
"""
Advanced Codegen SDK Features Demonstration

This module demonstrates advanced features of the Codegen SDK for code manipulation,
including moving symbols between files, splitting functions into separate files,
and handling dependencies during code transformations.

The Codegen SDK provides powerful capabilities for programmatic code refactoring
and organization, supporting both Python and TypeScript codebases.
"""

import os
import logging
from typing import List, Optional, Union, Dict, Any, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import Codegen SDK components
try:
    from codegen.sdk.core.codebase import Codebase, CodebaseType, TSCodebaseType
    from codegen.shared.enums.programming_language import ProgrammingLanguage
except ImportError:
    logger.error("Codegen SDK not found. Please install it using: pip install codegen-sdk")
    raise


class CodegenSDKDemo:
    """
    Demonstrates advanced features of the Codegen SDK.
    
    This class provides methods to showcase various capabilities of the Codegen SDK,
    including code analysis, symbol manipulation, and file operations.
    """
    
    def __init__(self, codebase_path: str):
        """
        Initialize the demo with a path to a codebase.
        
        Args:
            codebase_path: Path to the codebase directory
        """
        self.codebase_path = codebase_path
        self.python_codebase = None
        self.ts_codebase = None
        logger.info(f"Initializing CodegenSDKDemo with codebase at: {codebase_path}")
    
    def initialize_codebases(self):
        """Initialize both Python and TypeScript codebases if available."""
        try:
            self.python_codebase = Codebase(self.codebase_path, language=ProgrammingLanguage.PYTHON)
            logger.info("Python codebase initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Python codebase: {e}")
        
        try:
            self.ts_codebase = Codebase(self.codebase_path, language=ProgrammingLanguage.TYPESCRIPT)
            logger.info("TypeScript codebase initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize TypeScript codebase: {e}")
    
    def demonstrate_all_features(self):
        """Run all demonstrations sequentially."""
        self.initialize_codebases()
        
        if self.python_codebase:
            self.demonstrate_split_functions()
            self.demonstrate_move_symbol()
            self.demonstrate_move_symbol_with_dependencies()
            self.demonstrate_move_multiple_symbols()
            self.demonstrate_different_import_strategies()
        else:
            logger.warning("Python codebase not available, skipping Python demonstrations")
        
        if self.ts_codebase:
            self.demonstrate_typescript_features()
        else:
            logger.warning("TypeScript codebase not available, skipping TypeScript demonstrations")
    
    def demonstrate_split_functions(self):
        """
        Demonstrate splitting functions from a single file into multiple files.
        
        This feature is useful for breaking down large files into more manageable,
        single-responsibility modules.
        """
        logger.info("Demonstrating function splitting...")
        
        # Create a sample file with multiple functions
        sample_file_path = "sample_multi_function.py"
        sample_file_content = """
# This is a sample file with multiple functions
NON_FUNCTION = 'This is not a function'

def function1():
    \"\"\"This is function 1\"\"\"
    print("This is function 1")

def function2():
    \"\"\"This is function 2\"\"\"
    print("This is function 2")
    return function1()

def function3():
    \"\"\"This is function 3\"\"\"
    print("This is function 3")
    return function2()
"""
        
        try:
            # Create the sample file in the codebase
            sample_file = self.python_codebase.create_file(sample_file_path, content=sample_file_content)
            logger.info(f"Created sample file: {sample_file_path}")
            
            # Get the file from the codebase
            file = self.python_codebase.get_file(sample_file_path)
            
            # Log the functions found in the file
            logger.info(f"Found {len(file.functions)} functions in {sample_file_path}")
            for function in file.functions:
                logger.info(f"  - Function: {function.name}")
            
            # Split each function into its own file
            for function in file.functions:
                # Create a new file for the function
                new_file_path = f"{function.name}.py"
                new_file = self.python_codebase.create_file(new_file_path)
                logger.info(f"Created new file for function: {new_file_path}")
                
                # Move the function to the new file
                function.move_to_file(new_file, strategy="update_all_imports")
                logger.info(f"Moved function {function.name} to {new_file_path}")
            
            # Show the content of the original file after splitting
            updated_file = self.python_codebase.get_file(sample_file_path)
            logger.info(f"Original file after splitting: {updated_file.content}")
            
            # Show the content of each new function file
            for func_name in ["function1", "function2", "function3"]:
                func_file = self.python_codebase.get_file(f"{func_name}.py")
                logger.info(f"Content of {func_name}.py: {func_file.content}")
                
        except Exception as e:
            logger.error(f"Error during function splitting demonstration: {e}")
    
    def demonstrate_move_symbol(self):
        """
        Demonstrate moving a symbol from one file to another.
        
        This feature allows for reorganizing code by moving functions, classes,
        or other symbols between files while maintaining correct imports.
        """
        logger.info("Demonstrating symbol movement...")
        
        # Create source file with a function
        source_file_path = "source_file.py"
        source_file_content = """
def my_function():
    \"\"\"This is a function that will be moved\"\"\"
    print("This is my function")

def another_function():
    \"\"\"This function calls my_function\"\"\"
    my_function()
    print("This is another function")
"""
        
        # Create destination file
        dest_file_path = "destination_file.py"
        dest_file_content = """
# This is the destination file
def existing_function():
    \"\"\"This is an existing function in the destination file\"\"\"
    print("This is an existing function")
"""
        
        try:
            # Create the files in the codebase
            self.python_codebase.create_file(source_file_path, content=source_file_content)
            self.python_codebase.create_file(dest_file_path, content=dest_file_content)
            
            # Get the source file and the symbol to move
            source_file = self.python_codebase.get_file(source_file_path)
            symbol_to_move = source_file.get_symbol("my_function")
            
            # Get the destination file
            dest_file = self.python_codebase.get_file(dest_file_path)
            
            # Move the symbol to the destination file
            symbol_to_move.move_to_file(dest_file, strategy="add_back_edge")
            logger.info(f"Moved symbol {symbol_to_move.name} to {dest_file_path}")
            
            # Show the content of both files after moving
            updated_source = self.python_codebase.get_file(source_file_path)
            updated_dest = self.python_codebase.get_file(dest_file_path)
            
            logger.info(f"Source file after moving: {updated_source.content}")
            logger.info(f"Destination file after moving: {updated_dest.content}")
            
        except Exception as e:
            logger.error(f"Error during symbol movement demonstration: {e}")
    
    def demonstrate_move_symbol_with_dependencies(self):
        """
        Demonstrate moving a symbol along with its dependencies.
        
        This feature ensures that when a symbol is moved, any dependencies
        it relies on are also moved or properly imported.
        """
        logger.info("Demonstrating symbol movement with dependencies...")
        
        # Create source file with functions and dependencies
        source_file_path = "source_with_deps.py"
        source_file_content = """
def dependency_function():
    \"\"\"This is a dependency function\"\"\"
    print("I'm a dependency")
    return "dependency result"

def my_symbol():
    \"\"\"This function depends on dependency_function\"\"\"
    result = dependency_function()
    print(f"This is my symbol, using: {result}")
    return result

def use_symbol():
    \"\"\"This function uses my_symbol\"\"\"
    result = my_symbol()
    print(f"Using symbol result: {result}")
    return result
"""
        
        # Create destination file
        dest_file_path = "destination_for_deps.py"
        dest_file_content = """
# This is the destination file for dependencies demonstration
"""
        
        try:
            # Create the files in the codebase
            self.python_codebase.create_file(source_file_path, content=source_file_content)
            self.python_codebase.create_file(dest_file_path, content=dest_file_content)
            
            # Get the source file and the symbol to move
            source_file = self.python_codebase.get_file(source_file_path)
            symbol_to_move = source_file.get_symbol("my_symbol")
            
            # Get the destination file
            dest_file = self.python_codebase.get_file(dest_file_path)
            
            # Move the symbol to the destination file with dependencies
            symbol_to_move.move_to_file(dest_file, include_dependencies=True, strategy="add_back_edge")
            logger.info(f"Moved symbol {symbol_to_move.name} with dependencies to {dest_file_path}")
            
            # Show the content of both files after moving
            updated_source = self.python_codebase.get_file(source_file_path)
            updated_dest = self.python_codebase.get_file(dest_file_path)
            
            logger.info(f"Source file after moving with dependencies: {updated_source.content}")
            logger.info(f"Destination file after moving with dependencies: {updated_dest.content}")
            
        except Exception as e:
            logger.error(f"Error during symbol movement with dependencies demonstration: {e}")
    
    def demonstrate_move_multiple_symbols(self):
        """
        Demonstrate moving multiple symbols at once.
        
        This feature allows for moving several related symbols together,
        which is useful for larger refactoring operations.
        """
        logger.info("Demonstrating moving multiple symbols...")
        
        # Create source file with multiple symbols
        source_file_path = "multi_symbol_source.py"
        source_file_content = """
def dependency_function():
    \"\"\"A dependency used by other symbols\"\"\"
    print("I'm a dependency")
    return "dependency result"

def my_function():
    \"\"\"A function that uses the dependency\"\"\"
    result = dependency_function()
    print(f"Function result: {result}")
    return result

class MyClass:
    \"\"\"A class that also uses the dependency\"\"\"
    def __init__(self):
        self.value = dependency_function()
    
    def get_value(self):
        return self.value

def use_symbols():
    \"\"\"Function that uses both my_function and MyClass\"\"\"
    func_result = my_function()
    obj = MyClass()
    class_result = obj.get_value()
    print(f"Function result: {func_result}, Class result: {class_result}")
    return func_result, class_result
"""
        
        # Create destination file
        dest_file_path = "multi_symbol_dest.py"
        dest_file_content = """
# Destination file for multiple symbols
"""
        
        try:
            # Create the files in the codebase
            self.python_codebase.create_file(source_file_path, content=source_file_content)
            self.python_codebase.create_file(dest_file_path, content=dest_file_content)
            
            # Get the source file
            source_file = self.python_codebase.get_file(source_file_path)
            
            # Get the symbols to move
            function_to_move = source_file.get_function("my_function")
            class_to_move = source_file.get_class("MyClass")
            
            # Get the destination file
            dest_file = self.python_codebase.get_file(dest_file_path)
            
            # Create a list of symbols to move
            symbols_to_move = [function_to_move, class_to_move]
            
            # Move each symbol to the destination file
            for symbol in symbols_to_move:
                symbol.move_to_file(dest_file, include_dependencies=True, strategy="update_all_imports")
                logger.info(f"Moved symbol {symbol.name} to {dest_file_path}")
            
            # Show the content of both files after moving
            updated_source = self.python_codebase.get_file(source_file_path)
            updated_dest = self.python_codebase.get_file(dest_file_path)
            
            logger.info(f"Source file after moving multiple symbols: {updated_source.content}")
            logger.info(f"Destination file after moving multiple symbols: {updated_dest.content}")
            
        except Exception as e:
            logger.error(f"Error during multiple symbol movement demonstration: {e}")
    
    def demonstrate_different_import_strategies(self):
        """
        Demonstrate different import strategies when moving symbols.
        
        The Codegen SDK supports different strategies for handling imports
        when moving symbols between files.
        """
        logger.info("Demonstrating different import strategies...")
        
        # Create files for demonstrating different strategies
        strategies = ["add_back_edge", "update_all_imports"]
        
        for strategy in strategies:
            try:
                # Create source file
                source_path = f"source_{strategy}.py"
                source_content = f"""
def symbol_for_{strategy}():
    \"\"\"This symbol will be moved using {strategy} strategy\"\"\"
    print("This is a symbol that will be moved")
    return "result"

def use_symbol():
    \"\"\"This function uses the symbol\"\"\"
    result = symbol_for_{strategy}()
    print(f"Using symbol with result: {result}")
    return result
"""
                
                # Create destination file
                dest_path = f"dest_{strategy}.py"
                dest_content = f"""
# Destination file for {strategy} strategy demonstration
"""
                
                # Create the files in the codebase
                self.python_codebase.create_file(source_path, content=source_content)
                self.python_codebase.create_file(dest_path, content=dest_content)
                
                # Get the source file and symbol
                source_file = self.python_codebase.get_file(source_path)
                symbol = source_file.get_symbol(f"symbol_for_{strategy}")
                
                # Get the destination file
                dest_file = self.python_codebase.get_file(dest_path)
                
                # Move the symbol using the specific strategy
                symbol.move_to_file(dest_file, strategy=strategy)
                logger.info(f"Moved symbol using {strategy} strategy")
                
                # Show the content of both files after moving
                updated_source = self.python_codebase.get_file(source_path)
                updated_dest = self.python_codebase.get_file(dest_path)
                
                logger.info(f"Source file after moving with {strategy} strategy: {updated_source.content}")
                logger.info(f"Destination file after moving with {strategy} strategy: {updated_dest.content}")
                
            except Exception as e:
                logger.error(f"Error during {strategy} strategy demonstration: {e}")
    
    def demonstrate_typescript_features(self):
        """
        Demonstrate TypeScript-specific features of the Codegen SDK.
        
        The Codegen SDK provides support for TypeScript codebases with
        similar capabilities to those available for Python.
        """
        logger.info("Demonstrating TypeScript features...")
        
        # Create TypeScript source file
        ts_source_path = "source.ts"
        ts_source_content = """
function symbolToMove() {
    console.log("This symbol will be moved");
    return "TypeScript result";
}

function useSymbol() {
    const result = symbolToMove();
    console.log(`Using symbol with result: ${result}`);
    return result;
}
"""
        
        # Create TypeScript destination file
        ts_dest_path = "destination.ts"
        ts_dest_content = """
// Destination file for TypeScript demonstration
"""
        
        try:
            # Create the files in the TypeScript codebase
            self.ts_codebase.create_file(ts_source_path, content=ts_source_content)
            self.ts_codebase.create_file(ts_dest_path, content=ts_dest_content)
            
            # Get the source file and symbol
            source_file = self.ts_codebase.get_file(ts_source_path)
            symbol = source_file.get_symbol("symbolToMove")
            
            # Get the destination file
            dest_file = self.ts_codebase.get_file(ts_dest_path)
            
            # Move the symbol
            symbol.move_to_file(dest_file, strategy="add_back_edge")
            logger.info("Moved TypeScript symbol")
            
            # Show the content of both files after moving
            updated_source = self.ts_codebase.get_file(ts_source_path)
            updated_dest = self.ts_codebase.get_file(ts_dest_path)
            
            logger.info(f"TypeScript source file after moving: {updated_source.content}")
            logger.info(f"TypeScript destination file after moving: {updated_dest.content}")
            
        except Exception as e:
            logger.error(f"Error during TypeScript demonstration: {e}")


def create_sample_codebase(base_path: str) -> str:
    """
    Create a sample codebase directory structure for demonstration.
    
    Args:
        base_path: Base directory to create the sample codebase in
        
    Returns:
        Path to the created sample codebase
    """
    import tempfile
    import shutil
    
    # Create a temporary directory for the sample codebase
    if not base_path:
        codebase_path = tempfile.mkdtemp(prefix="codegen_sdk_demo_")
    else:
        codebase_path = os.path.join(base_path, "codegen_sdk_demo")
        os.makedirs(codebase_path, exist_ok=True)
    
    logger.info(f"Created sample codebase at: {codebase_path}")
    return codebase_path


def main():
    """Main function to run the Codegen SDK demonstration."""
    logger.info("Starting Codegen SDK Advanced Features Demonstration")
    
    # Create a sample codebase
    codebase_path = create_sample_codebase("")
    
    try:
        # Initialize and run the demonstration
        demo = CodegenSDKDemo(codebase_path)
        demo.demonstrate_all_features()
        
        logger.info("Demonstration completed successfully")
    except Exception as e:
        logger.error(f"Error during demonstration: {e}")
    finally:
        # Clean up (optional)
        # import shutil
        # shutil.rmtree(codebase_path)
        # logger.info(f"Cleaned up sample codebase at: {codebase_path}")
        pass


if __name__ == "__main__":
    main()

