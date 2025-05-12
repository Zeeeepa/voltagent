#!/usr/bin/env python3
"""
Test Module Disassembler

This script tests the functionality of the Module Disassembler by creating
a sample codebase with known patterns and verifying the output.
"""

import os
import sys
import shutil
import tempfile
import unittest
from pathlib import Path

# Import the ModuleDisassembler
try:
    from module_disassembler import ModuleDisassembler, FunctionInfo, ModuleStructure
except ImportError:
    print("Module Disassembler not found. Make sure it's in the same directory.")
    sys.exit(1)


class TestModuleDisassembler(unittest.TestCase):
    """Test cases for the Module Disassembler."""
    
    def setUp(self):
        """Set up the test environment."""
        # Create temporary directories for test repo and output
        self.test_repo_dir = tempfile.mkdtemp(prefix="test_repo_")
        self.test_output_dir = tempfile.mkdtemp(prefix="test_output_")
        
        # Create a sample codebase structure
        self.create_sample_codebase()
    
    def tearDown(self):
        """Clean up the test environment."""
        # Remove temporary directories
        shutil.rmtree(self.test_repo_dir, ignore_errors=True)
        shutil.rmtree(self.test_output_dir, ignore_errors=True)
    
    def create_sample_codebase(self):
        """Create a sample codebase for testing."""
        # Create directory structure
        os.makedirs(os.path.join(self.test_repo_dir, "module1"), exist_ok=True)
        os.makedirs(os.path.join(self.test_repo_dir, "module2"), exist_ok=True)
        
        # Create __init__.py files
        Path(os.path.join(self.test_repo_dir, "__init__.py")).touch()
        Path(os.path.join(self.test_repo_dir, "module1", "__init__.py")).touch()
        Path(os.path.join(self.test_repo_dir, "module2", "__init__.py")).touch()
        
        # Create sample Python files with functions in different categories
        
        # Validation functions
        with open(os.path.join(self.test_repo_dir, "module1", "validators.py"), "w") as f:
            f.write("""
def validate_input(data):
    \"\"\"Validate input data.\"\"\"
    if not isinstance(data, dict):
        raise ValueError("Input must be a dictionary")
    return True

def check_permissions(user, resource):
    \"\"\"Check if user has permissions for resource.\"\"\"
    return user.get('permissions', []).contains(resource)

# Duplicate of validate_input with slight differences
def validate_data(data):
    \"\"\"Validate input data (duplicate).\"\"\"
    if not isinstance(data, dict):
        raise ValueError("Data must be a dictionary")
    return True
""")
        
        # Data processing functions
        with open(os.path.join(self.test_repo_dir, "module1", "processors.py"), "w") as f:
            f.write("""
def process_data(data):
    \"\"\"Process input data.\"\"\"
    if not validate_input(data):
        return None
    
    result = {}
    for key, value in data.items():
        result[key] = value * 2
    return result

def transform_output(data):
    \"\"\"Transform output data.\"\"\"
    return {str(k): v for k, v in data.items()}

# Helper function that should be categorized as utility
def get_processor_name():
    \"\"\"Get the name of the processor.\"\"\"
    return "data_processor"

# Import the validation function
from module1.validators import validate_input
""")
        
        # Utility functions
        with open(os.path.join(self.test_repo_dir, "module2", "utils.py"), "w") as f:
            f.write("""
def format_string(text):
    \"\"\"Format a string.\"\"\"
    return text.strip().lower()

def get_timestamp():
    \"\"\"Get current timestamp.\"\"\"
    import time
    return time.time()

# This is a duplicate of format_string in another module
def format_text(text):
    \"\"\"Format a text string (duplicate).\"\"\"
    return text.strip().lower()
""")
        
        # API functions
        with open(os.path.join(self.test_repo_dir, "module2", "api.py"), "w") as f:
            f.write("""
def api_request(url, params=None):
    \"\"\"Make an API request.\"\"\"
    import requests
    return requests.get(url, params=params)

def handle_response(response):
    \"\"\"Handle API response.\"\"\"
    if response.status_code == 200:
        return response.json()
    return None

# This function uses functions from other modules
def process_api_data(url):
    \"\"\"Process data from API.\"\"\"
    from module1.processors import process_data
    from module2.utils import format_string
    
    response = api_request(url)
    data = handle_response(response)
    
    if data:
        data = {format_string(k): v for k, v in data.items()}
        return process_data(data)
    return None
""")
    
    def test_initialization(self):
        """Test initialization of the ModuleDisassembler."""
        disassembler = ModuleDisassembler(
            repo_path=self.test_repo_dir,
            output_dir=self.test_output_dir
        )
        
        self.assertEqual(disassembler.repo_path, os.path.abspath(self.test_repo_dir))
        self.assertEqual(disassembler.output_dir, os.path.abspath(self.test_output_dir))
        self.assertIsNone(disassembler.focus_dir)
    
    def test_function_extraction(self):
        """Test function extraction from the codebase."""
        # This test is more of an integration test and depends on the Codegen SDK
        # We'll just check if the disassembler can be initialized without errors
        try:
            disassembler = ModuleDisassembler(
                repo_path=self.test_repo_dir,
                output_dir=self.test_output_dir
            )
            disassembler.initialize_codebase()
            # If we get here without errors, the test passes
            self.assertTrue(True)
        except Exception as e:
            self.fail(f"ModuleDisassembler initialization failed with error: {e}")
    
    def test_function_categorization(self):
        """Test function categorization logic."""
        # Create a mock Function object for testing categorization
        class MockFunction:
            def __init__(self, name, docstring=None):
                self.name = name
                self.docstring = docstring
        
        disassembler = ModuleDisassembler(
            repo_path=self.test_repo_dir,
            output_dir=self.test_output_dir
        )
        
        # Test categorization by function name
        self.assertEqual(disassembler._categorize_function(MockFunction("validate_user")), "validation")
        self.assertEqual(disassembler._categorize_function(MockFunction("process_data")), "data_processing")
        self.assertEqual(disassembler._categorize_function(MockFunction("read_file")), "io")
        self.assertEqual(disassembler._categorize_function(MockFunction("helper_function")), "utility")
        self.assertEqual(disassembler._categorize_function(MockFunction("api_request")), "api")
        self.assertEqual(disassembler._categorize_function(MockFunction("query_database")), "database")
        self.assertEqual(disassembler._categorize_function(MockFunction("authenticate_user")), "authentication")
        self.assertEqual(disassembler._categorize_function(MockFunction("plot_data")), "visualization")
        self.assertEqual(disassembler._categorize_function(MockFunction("analyze_results")), "analysis")
        
        # Test categorization by docstring
        self.assertEqual(
            disassembler._categorize_function(MockFunction("func1", "Validates the input data")),
            "validation"
        )
        self.assertEqual(
            disassembler._categorize_function(MockFunction("func2", "Processes the data")),
            "data_processing"
        )
        
        # Test default category
        self.assertEqual(disassembler._categorize_function(MockFunction("random_function")), "general")
    
    def test_content_normalization(self):
        """Test function content normalization."""
        disassembler = ModuleDisassembler(
            repo_path=self.test_repo_dir,
            output_dir=self.test_output_dir
        )
        
        # Test comment removal
        content = """
def test_function():
    # This is a comment
    x = 1  # Inline comment
    return x
"""
        normalized = disassembler._normalize_function_content(content)
        self.assertNotIn("#", normalized)
        
        # Test docstring removal
        content = """
def test_function():
    \"\"\"
    This is a docstring
    with multiple lines
    \"\"\"
    x = 1
    return x
"""
        normalized = disassembler._normalize_function_content(content)
        self.assertNotIn("This is a docstring", normalized)
        
        # Test whitespace normalization
        content = """
def test_function():
    x = 1
    
    y = 2
    return x + y
"""
        normalized = disassembler._normalize_function_content(content)
        self.assertNotIn("\n", normalized)
        self.assertNotIn("    ", normalized)
    
    def test_module_structure_creation(self):
        """Test creation of module structure objects."""
        module = ModuleStructure(
            name="test_module",
            description="Test module description",
            functions=[],
            dependencies=[]
        )
        
        self.assertEqual(module.name, "test_module")
        self.assertEqual(module.description, "Test module description")
        self.assertEqual(module.functions, [])
        self.assertEqual(module.dependencies, [])
    
    def test_function_info_creation(self):
        """Test creation of function info objects."""
        func_info = FunctionInfo(
            name="test_function",
            file_path="path/to/file.py",
            symbol=None,  # Would be a Function object in real usage
            content="def test_function():\n    return True",
            docstring="Test function docstring",
            dependencies=["dep1", "dep2"],
            callers=["caller1", "caller2"],
            category="test_category"
        )
        
        self.assertEqual(func_info.name, "test_function")
        self.assertEqual(func_info.file_path, "path/to/file.py")
        self.assertEqual(func_info.content, "def test_function():\n    return True")
        self.assertEqual(func_info.docstring, "Test function docstring")
        self.assertEqual(func_info.dependencies, ["dep1", "dep2"])
        self.assertEqual(func_info.callers, ["caller1", "caller2"])
        self.assertEqual(func_info.category, "test_category")


if __name__ == "__main__":
    unittest.main()

