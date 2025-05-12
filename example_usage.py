#!/usr/bin/env python3
"""
Example Usage of Module Disassembler

This script demonstrates how to use the Module Disassembler to analyze
and restructure a codebase using the Codegen SDK.
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import the ModuleDisassembler
try:
    from module_disassembler import ModuleDisassembler
except ImportError:
    logger.error("Module Disassembler not found. Make sure it's in the same directory.")
    sys.exit(1)


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Example usage of Module Disassembler")
    
    parser.add_argument("--repo-path", default=".", help="Path to the repository to analyze (default: current directory)")
    parser.add_argument("--output-dir", default="./restructured_modules", help="Directory to output restructured modules")
    parser.add_argument("--focus-dir", help="Optional subdirectory to focus analysis on")
    
    return parser.parse_args()


def main():
    """Main function to demonstrate the Module Disassembler."""
    args = parse_arguments()
    
    # Print banner
    print("\n" + "=" * 80)
    print("Module Disassembler - Example Usage".center(80))
    print("=" * 80 + "\n")
    
    # Validate paths
    repo_path = os.path.abspath(args.repo_path)
    output_dir = os.path.abspath(args.output_dir)
    
    if not os.path.exists(repo_path):
        logger.error(f"Repository path does not exist: {repo_path}")
        return 1
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Repository path: {repo_path}")
    print(f"Output directory: {output_dir}")
    if args.focus_dir:
        print(f"Focus directory: {args.focus_dir}")
    print("\n")
    
    try:
        # Create the Module Disassembler
        disassembler = ModuleDisassembler(
            repo_path=repo_path,
            output_dir=output_dir,
            focus_dir=args.focus_dir
        )
        
        # Run the complete process
        print("Starting module disassembly and restructuring process...\n")
        disassembler.run()
        
        # Print summary
        print("\nSummary:")
        print(f"- Analyzed {len(disassembler.functions)} functions")
        print(f"- Found {len(disassembler.duplicate_groups)} groups of duplicate/similar functions")
        print(f"- Created {len(disassembler.modules)} restructured modules")
        
        # Print module statistics
        print("\nModule Statistics:")
        for module_name, module in disassembler.modules.items():
            print(f"- {module_name}: {len(module.functions)} functions, " +
                  f"{len(module.dependencies)} dependencies")
        
        print("\nModule disassembly and restructuring completed successfully.")
        print(f"Restructured modules are available in: {output_dir}")
        
        # Suggest next steps
        print("\nNext Steps:")
        print("1. Review the generated modules in the output directory")
        print("2. Check the duplicate functions report for potential code consolidation")
        print("3. Examine the module dependency graph to understand relationships")
        print("4. Consider integrating the restructured modules into your codebase")
        
        return 0
    except Exception as e:
        logger.error(f"Error during demonstration: {e}", exc_info=True)
        print(f"\nError: {e}")
        return 1


def advanced_example():
    """
    Advanced example showing more detailed usage of the ModuleDisassembler.
    
    This function demonstrates how to use the ModuleDisassembler step by step
    and access the internal data structures.
    """
    # This is not run by default, but shows more advanced usage
    
    # Create a disassembler instance
    disassembler = ModuleDisassembler(
        repo_path=".",
        output_dir="./advanced_output",
        focus_dir="codegen-on-oss"
    )
    
    # Run individual steps
    disassembler.initialize_codebase()
    disassembler.extract_functions()
    
    # Access and analyze the extracted functions
    print(f"Extracted {len(disassembler.functions)} functions")
    
    # Count functions by category
    categories = {}
    for func_id, func_info in disassembler.functions.items():
        categories[func_info.category] = categories.get(func_info.category, 0) + 1
    
    print("\nFunctions by category:")
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"- {category}: {count} functions")
    
    # Find the most called functions
    most_called = sorted(disassembler.functions.values(), key=lambda f: len(f.callers), reverse=True)[:5]
    
    print("\nMost called functions:")
    for func in most_called:
        print(f"- {func.name}: called by {len(func.callers)} other functions")
    
    # Continue with the rest of the process
    disassembler.identify_duplicates()
    disassembler.design_module_structure()
    disassembler.generate_restructured_modules()
    
    print("\nModule disassembly and restructuring completed successfully.")


if __name__ == "__main__":
    sys.exit(main())

