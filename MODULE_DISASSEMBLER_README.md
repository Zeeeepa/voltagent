# Module Disassembler

A powerful tool that analyzes codebases, identifies duplicate/redundant code, and restructures modules based on functionality using the Codegen SDK.

## Features

- **Function Extraction**: Extracts all functions from Python files in a codebase
- **Duplicate Detection**: Identifies exact and near-duplicate functions
- **Functional Categorization**: Groups functions by their purpose (validation, data processing, I/O, etc.)
- **Dependency Analysis**: Builds a dependency graph to understand function relationships
- **Module Restructuring**: Generates a new, more maintainable module structure
- **Visualization**: Creates dependency graphs and detailed reports

## Requirements

- Python 3.7+
- Codegen SDK
- (Optional) Graphviz for dependency graph visualization

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/your-repo.git
cd your-repo

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python module_disassembler.py --repo-path /path/to/your/repo --output-dir /path/to/output
```

### With Focus Directory

To analyze only a specific subdirectory within the repository:

```bash
python module_disassembler.py --repo-path /path/to/your/repo --output-dir /path/to/output --focus-dir path/to/subdirectory
```

### Example

```bash
# Analyze the codegen-on-oss directory and output restructured modules to ./restructured_modules
python module_disassembler.py --repo-path . --output-dir ./restructured_modules --focus-dir codegen-on-oss
```

## How It Works

The Module Disassembler works in several stages:

1. **Initialization**: Sets up the Codegen SDK to analyze the codebase
2. **Function Extraction**: Uses the SDK to extract all functions from Python files
3. **Dependency Analysis**: Builds a graph of function dependencies and caller relationships
4. **Duplicate Identification**: Finds exact and similar functions using content comparison
5. **Categorization**: Groups functions by purpose based on naming patterns and content
6. **Module Design**: Creates a new module structure based on function categories
7. **Code Generation**: Generates new Python files with the restructured modules

## Output

The tool generates the following in the output directory:

- A Python package with restructured modules
- An `__init__.py` file that imports all modules
- A module dependency graph visualization (if Graphviz is installed)
- A report of duplicate functions

## Function Categories

Functions are categorized based on naming patterns and content analysis:

- **validation**: Functions that validate or check data
- **data_processing**: Functions that transform or process data
- **io**: Functions that handle input/output operations
- **utility**: Helper functions and utilities
- **api**: Functions related to API interactions
- **database**: Database-related functions
- **authentication**: Authentication and permission functions
- **visualization**: Functions for data visualization
- **analysis**: Functions that analyze or compute data
- **general**: Functions that don't fit into other categories

## Advanced Usage

### Using as a Library

You can also use the Module Disassembler as a library in your own Python code:

```python
from module_disassembler import ModuleDisassembler

# Create a disassembler instance
disassembler = ModuleDisassembler(
    repo_path="/path/to/your/repo",
    output_dir="/path/to/output",
    focus_dir="optional/subdirectory"
)

# Run the complete process
disassembler.run()

# Or run individual steps
disassembler.initialize_codebase()
disassembler.extract_functions()
disassembler.identify_duplicates()
disassembler.design_module_structure()
disassembler.generate_restructured_modules()

# Access the extracted data
for func_id, func_info in disassembler.functions.items():
    print(f"Function: {func_info.name}, Category: {func_info.category}")

# Access the module structure
for module_name, module in disassembler.modules.items():
    print(f"Module: {module_name}, Functions: {len(module.functions)}")
```

## Customization

You can customize the function categorization by modifying the `CATEGORY_PATTERNS` dictionary in the `ModuleDisassembler` class:

```python
CATEGORY_PATTERNS = {
    'validation': [r'validate', r'check', r'is_valid', r'assert'],
    'data_processing': [r'process', r'transform', r'convert', r'parse'],
    # Add your own categories and patterns
    'my_category': [r'pattern1', r'pattern2'],
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

