#!/usr/bin/env python3
"""
Module Disassembler

A tool that analyzes codebases, identifies duplicate/redundant code,
and restructures modules based on functionality using the Codegen SDK.

This tool can:
1. Extract all functions from a codebase
2. Identify exact and near-duplicate functions
3. Group functions by their purpose (validation, data processing, I/O, etc.)
4. Generate restructured modules organized by functionality
"""

import os
import sys
import argparse
import logging
import difflib
import ast
import re
import json
import shutil
from typing import Dict, List, Set, Tuple, Optional, Any, Callable
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import Codegen SDK components
try:
    from codegen.sdk.core.codebase import Codebase, CodebaseType
    from codegen.sdk.core.symbol import Symbol, Function, Class, Variable
    from codegen.shared.enums.programming_language import ProgrammingLanguage
except ImportError:
    logger.error("Codegen SDK not found. Please install it using: pip install codegen-sdk")
    raise


@dataclass
class FunctionInfo:
    """Information about a function extracted from the codebase."""
    name: str
    file_path: str
    symbol: Function
    content: str
    docstring: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    callers: List[str] = field(default_factory=list)
    category: Optional[str] = None
    similarity_group: Optional[int] = None


@dataclass
class ModuleStructure:
    """Represents a restructured module."""
    name: str
    functions: List[FunctionInfo] = field(default_factory=list)
    description: str = ""
    dependencies: List[str] = field(default_factory=list)


class ModuleDisassembler:
    """
    Analyzes codebases and restructures modules based on functionality.
    
    This class uses the Codegen SDK to analyze Python codebases, identify
    duplicate or similar functions, and reorganize them into more logical
    and maintainable modules based on their functionality.
    """
    
    # Function categories based on common naming patterns and purposes
    CATEGORY_PATTERNS = {
        'validation': [r'validate', r'check', r'is_valid', r'assert'],
        'data_processing': [r'process', r'transform', r'convert', r'parse'],
        'io': [r'read', r'write', r'load', r'save', r'import', r'export'],
        'utility': [r'util', r'helper', r'format', r'get'],
        'api': [r'api', r'request', r'response', r'endpoint'],
        'database': [r'db', r'query', r'database', r'sql', r'fetch'],
        'authentication': [r'auth', r'login', r'permission', r'access'],
        'visualization': [r'plot', r'chart', r'graph', r'display', r'render'],
        'analysis': [r'analyze', r'calculate', r'compute', r'evaluate'],
    }
    
    def __init__(self, repo_path: str, output_dir: str, focus_dir: Optional[str] = None):
        """
        Initialize the module disassembler.
        
        Args:
            repo_path: Path to the repository to analyze
            output_dir: Directory to output restructured modules
            focus_dir: Optional subdirectory to focus analysis on
        """
        self.repo_path = os.path.abspath(repo_path)
        self.output_dir = os.path.abspath(output_dir)
        self.focus_dir = focus_dir
        
        if focus_dir:
            self.analysis_path = os.path.join(self.repo_path, focus_dir)
        else:
            self.analysis_path = self.repo_path
            
        self.codebase = None
        self.functions: Dict[str, FunctionInfo] = {}
        self.modules: Dict[str, ModuleStructure] = {}
        self.duplicate_groups: List[List[str]] = []
        self.similarity_threshold = 0.8  # Threshold for considering functions similar
        
        logger.info(f"Initializing ModuleDisassembler for repo: {self.repo_path}")
        logger.info(f"Analysis path: {self.analysis_path}")
        logger.info(f"Output directory: {self.output_dir}")
    
    def initialize_codebase(self):
        """Initialize the Codegen SDK codebase object."""
        try:
            self.codebase = Codebase(self.repo_path, language=ProgrammingLanguage.PYTHON)
            logger.info("Codebase initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize codebase: {e}")
            raise
    
    def extract_functions(self):
        """
        Extract all functions from the codebase using Codegen SDK.
        
        This method uses the Codegen SDK to extract all functions from Python
        files in the codebase, along with their dependencies and other metadata.
        """
        logger.info("Extracting functions from codebase...")
        
        # Get all Python files in the codebase
        python_files = []
        for root, _, files in os.walk(self.analysis_path):
            for file in files:
                if file.endswith('.py'):
                    rel_path = os.path.relpath(os.path.join(root, file), self.repo_path)
                    python_files.append(rel_path)
        
        logger.info(f"Found {len(python_files)} Python files")
        
        # Extract functions from each file
        for file_path in python_files:
            try:
                file = self.codebase.get_file(file_path)
                
                # Extract all functions from the file
                for function in file.functions:
                    # Skip dunder methods and private functions
                    if function.name.startswith('__') or function.name.startswith('_'):
                        continue
                    
                    # Create FunctionInfo object
                    function_info = FunctionInfo(
                        name=function.name,
                        file_path=file_path,
                        symbol=function,
                        content=function.content,
                        docstring=function.docstring,
                        dependencies=self._get_function_dependencies(function),
                        category=self._categorize_function(function)
                    )
                    
                    # Store the function info
                    self.functions[f"{file_path}:{function.name}"] = function_info
                    
                logger.info(f"Extracted {len(file.functions)} functions from {file_path}")
                
            except Exception as e:
                logger.warning(f"Error extracting functions from {file_path}: {e}")
        
        logger.info(f"Extracted a total of {len(self.functions)} functions")
        
        # Build the caller relationships
        self._build_caller_relationships()
    
    def _get_function_dependencies(self, function: Function) -> List[str]:
        """
        Get the dependencies of a function.
        
        Args:
            function: The function to analyze
            
        Returns:
            List of function names that this function depends on
        """
        dependencies = []
        
        # Use the Codegen SDK to get dependencies
        try:
            for dep in function.dependencies:
                if isinstance(dep, Function):
                    dependencies.append(dep.name)
        except Exception as e:
            logger.debug(f"Error getting dependencies for {function.name}: {e}")
            # Fallback to basic AST parsing if SDK method fails
            try:
                tree = ast.parse(function.content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                        dependencies.append(node.func.id)
            except Exception:
                pass
        
        return list(set(dependencies))
    
    def _build_caller_relationships(self):
        """Build the caller relationships between functions."""
        logger.info("Building caller relationships...")
        
        # For each function, check if it calls other functions
        for func_id, func_info in self.functions.items():
            for dep in func_info.dependencies:
                # Find the called function
                for other_id, other_info in self.functions.items():
                    if other_info.name == dep:
                        # Add the caller to the called function
                        other_info.callers.append(func_id)
        
        # Log some statistics
        caller_counts = [len(f.callers) for f in self.functions.values()]
        if caller_counts:
            avg_callers = sum(caller_counts) / len(caller_counts)
            max_callers = max(caller_counts) if caller_counts else 0
            logger.info(f"Average callers per function: {avg_callers:.2f}")
            logger.info(f"Maximum callers for a function: {max_callers}")
    
    def _categorize_function(self, function: Function) -> str:
        """
        Categorize a function based on its name and content.
        
        Args:
            function: The function to categorize
            
        Returns:
            Category name as a string
        """
        # Check function name against category patterns
        func_name = function.name.lower()
        
        for category, patterns in self.CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, func_name):
                    return category
        
        # If no match in name, try to analyze the docstring
        if function.docstring:
            docstring = function.docstring.lower()
            for category, patterns in self.CATEGORY_PATTERNS.items():
                for pattern in patterns:
                    if re.search(pattern, docstring):
                        return category
        
        # Default category
        return "general"
    
    def identify_duplicates(self):
        """
        Identify duplicate and similar functions in the codebase.
        
        This method uses content comparison to find exact duplicates and
        similarity scoring to find near-duplicates.
        """
        logger.info("Identifying duplicate and similar functions...")
        
        # Group functions by content hash for exact duplicates
        content_groups = defaultdict(list)
        for func_id, func_info in self.functions.items():
            # Normalize content by removing whitespace and comments
            normalized_content = self._normalize_function_content(func_info.content)
            content_hash = hash(normalized_content)
            content_groups[content_hash].append(func_id)
        
        # Extract duplicate groups (more than one function with same content)
        exact_duplicates = [group for group in content_groups.values() if len(group) > 1]
        
        logger.info(f"Found {len(exact_duplicates)} groups of exact duplicate functions")
        
        # Find similar functions using difflib
        similarity_groups = []
        processed_funcs = set()
        
        # First add exact duplicates to similarity groups
        for group in exact_duplicates:
            similarity_groups.append(group)
            processed_funcs.update(group)
        
        # Then find similar but not identical functions
        for func_id, func_info in self.functions.items():
            if func_id in processed_funcs:
                continue
                
            similar_funcs = [func_id]
            processed_funcs.add(func_id)
            
            normalized_content = self._normalize_function_content(func_info.content)
            
            for other_id, other_info in self.functions.items():
                if other_id in processed_funcs or other_id == func_id:
                    continue
                    
                other_normalized = self._normalize_function_content(other_info.content)
                
                # Calculate similarity ratio
                similarity = difflib.SequenceMatcher(None, normalized_content, other_normalized).ratio()
                
                if similarity >= self.similarity_threshold:
                    similar_funcs.append(other_id)
                    processed_funcs.add(other_id)
            
            if len(similar_funcs) > 1:
                similarity_groups.append(similar_funcs)
        
        logger.info(f"Found {len(similarity_groups)} groups of similar functions")
        
        # Store the duplicate groups
        self.duplicate_groups = similarity_groups
        
        # Assign similarity group IDs to functions
        for group_id, group in enumerate(similarity_groups):
            for func_id in group:
                self.functions[func_id].similarity_group = group_id
    
    def _normalize_function_content(self, content: str) -> str:
        """
        Normalize function content for comparison.
        
        Args:
            content: Function content as string
            
        Returns:
            Normalized content with whitespace and comments removed
        """
        # Remove comments
        content = re.sub(r'#.*$', '', content, flags=re.MULTILINE)
        
        # Remove docstrings
        content = re.sub(r'""".*?"""', '', content, flags=re.DOTALL)
        content = re.sub(r"'''.*?'''", '', content, flags=re.DOTALL)
        
        # Remove whitespace
        content = re.sub(r'\s+', ' ', content).strip()
        
        return content
    
    def design_module_structure(self):
        """
        Design a new module structure based on function categories and dependencies.
        
        This method creates a new module structure by grouping functions by their
        categories and considering their dependencies.
        """
        logger.info("Designing new module structure...")
        
        # Group functions by category
        category_groups = defaultdict(list)
        for func_id, func_info in self.functions.items():
            category_groups[func_info.category].append(func_id)
        
        # Create modules for each category
        for category, func_ids in category_groups.items():
            module_name = f"{category}_module"
            
            # Create module structure
            module = ModuleStructure(
                name=module_name,
                description=f"Module containing {category} functions",
                functions=[self.functions[func_id] for func_id in func_ids]
            )
            
            # Add to modules dictionary
            self.modules[module_name] = module
        
        # Handle duplicate functions - keep only one instance in the appropriate module
        self._handle_duplicates()
        
        # Calculate module dependencies
        self._calculate_module_dependencies()
        
        logger.info(f"Created {len(self.modules)} modules based on function categories")
    
    def _handle_duplicates(self):
        """
        Handle duplicate functions in the module structure.
        
        For each group of duplicate functions, keep only one instance in the
        most appropriate module and remove the others.
        """
        for group in self.duplicate_groups:
            if not group:
                continue
                
            # Get the functions in this group
            group_funcs = [self.functions[func_id] for func_id in group]
            
            # Determine the best module for this function group
            # Strategy: keep in the module where most similar functions are
            category_counts = defaultdict(int)
            for func in group_funcs:
                category_counts[func.category] += 1
            
            best_category = max(category_counts.items(), key=lambda x: x[1])[0]
            
            # Select one function to keep (preferably one with a docstring)
            funcs_with_docs = [f for f in group_funcs if f.docstring]
            func_to_keep = funcs_with_docs[0] if funcs_with_docs else group_funcs[0]
            
            # Remove all instances of this function from all modules
            for module in self.modules.values():
                module.functions = [f for f in module.functions if f.name != func_to_keep.name or f is func_to_keep]
            
            # Make sure the function is in the best category module
            best_module = self.modules[f"{best_category}_module"]
            if func_to_keep not in best_module.functions:
                best_module.functions.append(func_to_keep)
    
    def _calculate_module_dependencies(self):
        """
        Calculate dependencies between modules.
        
        This method analyzes function dependencies to determine which modules
        depend on other modules.
        """
        # Create a mapping from function name to module
        func_to_module = {}
        for module_name, module in self.modules.items():
            for func in module.functions:
                func_to_module[func.name] = module_name
        
        # Calculate module dependencies
        for module_name, module in self.modules.items():
            module_deps = set()
            
            for func in module.functions:
                for dep in func.dependencies:
                    if dep in func_to_module and func_to_module[dep] != module_name:
                        module_deps.add(func_to_module[dep])
            
            module.dependencies = list(module_deps)
    
    def generate_restructured_modules(self):
        """
        Generate restructured modules in the output directory.
        
        This method creates new Python files for each module in the output
        directory, with appropriate imports and function definitions.
        """
        logger.info(f"Generating restructured modules in {self.output_dir}...")
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Create __init__.py file
        with open(os.path.join(self.output_dir, "__init__.py"), "w") as f:
            f.write(f"""\"\"\"
Restructured modules generated by ModuleDisassembler.

This package contains modules reorganized by functionality:
{', '.join(self.modules.keys())}
\"\"\"

# Import all modules
{chr(10).join([f'from . import {module_name}' for module_name in self.modules.keys()])}
""")
        
        # Create a file for each module
        for module_name, module in self.modules.items():
            module_path = os.path.join(self.output_dir, f"{module_name}.py")
            
            with open(module_path, "w") as f:
                # Write module docstring
                f.write(f'"""\n{module.description}\n"""\n\n')
                
                # Write imports
                if module.dependencies:
                    for dep_module in module.dependencies:
                        f.write(f"from . import {dep_module}\n")
                    f.write("\n")
                
                # Write functions
                for func in module.functions:
                    # Use the Codegen SDK to get the function content
                    try:
                        # Write the function with its docstring
                        f.write(f"{func.content}\n\n")
                    except Exception as e:
                        logger.warning(f"Error writing function {func.name}: {e}")
                        # Fallback to basic content
                        if func.docstring:
                            f.write(f'def {func.name}():\n    """{func.docstring}"""\n    pass\n\n')
                        else:
                            f.write(f'def {func.name}():\n    pass\n\n')
            
            logger.info(f"Created module file: {module_path}")
        
        # Generate a module dependency graph visualization
        self._generate_dependency_graph()
        
        # Generate a report of duplicate functions
        self._generate_duplicate_report()
    
    def _generate_dependency_graph(self):
        """Generate a module dependency graph visualization."""
        try:
            # Create a simple text representation of the dependency graph
            graph_path = os.path.join(self.output_dir, "module_dependencies.txt")
            
            with open(graph_path, "w") as f:
                f.write("Module Dependency Graph\n")
                f.write("======================\n\n")
                
                for module_name, module in self.modules.items():
                    f.write(f"{module_name}:\n")
                    if module.dependencies:
                        for dep in module.dependencies:
                            f.write(f"  ├─> {dep}\n")
                    else:
                        f.write("  (no dependencies)\n")
                    f.write("\n")
            
            logger.info(f"Generated module dependency graph: {graph_path}")
            
            # Try to generate a graphviz visualization if available
            try:
                import graphviz
                
                dot = graphviz.Digraph(comment='Module Dependencies')
                
                # Add nodes
                for module_name in self.modules.keys():
                    dot.node(module_name)
                
                # Add edges
                for module_name, module in self.modules.items():
                    for dep in module.dependencies:
                        dot.edge(module_name, dep)
                
                # Save the graph
                dot_path = os.path.join(self.output_dir, "module_dependencies")
                dot.render(dot_path, format='png')
                logger.info(f"Generated graphviz dependency graph: {dot_path}.png")
            except ImportError:
                logger.info("Graphviz not available, skipping visual dependency graph")
        except Exception as e:
            logger.warning(f"Error generating dependency graph: {e}")
    
    def _generate_duplicate_report(self):
        """Generate a report of duplicate functions."""
        try:
            report_path = os.path.join(self.output_dir, "duplicate_functions_report.txt")
            
            with open(report_path, "w") as f:
                f.write("Duplicate Functions Report\n")
                f.write("========================\n\n")
                
                if not self.duplicate_groups:
                    f.write("No duplicate functions found.\n")
                else:
                    f.write(f"Found {len(self.duplicate_groups)} groups of duplicate/similar functions:\n\n")
                    
                    for i, group in enumerate(self.duplicate_groups):
                        f.write(f"Group {i+1}:\n")
                        for func_id in group:
                            func = self.functions[func_id]
                            f.write(f"  - {func.name} (from {func.file_path})\n")
                        f.write("\n")
            
            logger.info(f"Generated duplicate functions report: {report_path}")
        except Exception as e:
            logger.warning(f"Error generating duplicate report: {e}")
    
    def run(self):
        """
        Run the complete module disassembly and restructuring process.
        
        This method executes all steps of the process in sequence.
        """
        logger.info("Starting module disassembly and restructuring process...")
        
        # Initialize the codebase
        self.initialize_codebase()
        
        # Extract functions from the codebase
        self.extract_functions()
        
        # Identify duplicate functions
        self.identify_duplicates()
        
        # Design the new module structure
        self.design_module_structure()
        
        # Generate restructured modules
        self.generate_restructured_modules()
        
        logger.info("Module disassembly and restructuring process completed successfully")
        logger.info(f"Restructured modules are available in: {self.output_dir}")


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Module Disassembler - Analyze and restructure code modules")
    
    parser.add_argument("--repo-path", required=True, help="Path to the repository to analyze")
    parser.add_argument("--output-dir", required=True, help="Directory to output restructured modules")
    parser.add_argument("--focus-dir", help="Optional subdirectory to focus analysis on")
    
    return parser.parse_args()


def main():
    """Main function to run the module disassembler."""
    args = parse_arguments()
    
    try:
        # Create and run the module disassembler
        disassembler = ModuleDisassembler(
            repo_path=args.repo_path,
            output_dir=args.output_dir,
            focus_dir=args.focus_dir
        )
        
        disassembler.run()
        
        print(f"\nModule disassembly and restructuring completed successfully.")
        print(f"Restructured modules are available in: {args.output_dir}")
        
        return 0
    except Exception as e:
        logger.error(f"Error during module disassembly: {e}", exc_info=True)
        print(f"\nError: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

