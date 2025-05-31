# Codegen SDK + graph-sitter Integration

This repository demonstrates comprehensive integration between the Codegen SDK and graph-sitter for advanced codebase analysis and AI-powered improvements.

## 🚀 Features

- **Comprehensive Codebase Analysis**: Use graph-sitter to analyze code structure, dependencies, and relationships
- **AI-Powered Insights**: Leverage Codegen SDK for intelligent code analysis and suggestions
- **Function Context Analysis**: Get detailed context for any function including call sites, dependencies, and usages
- **Automated Improvement Suggestions**: Generate actionable improvement recommendations
- **Custom AI Provider**: Configure graph-sitter to use Codegen SDK as the AI backend
- **Interactive Analysis**: Run interactive sessions for exploratory code analysis

## 📦 Installation

```bash
# Install required packages
pip install codegen graph-sitter

# Or using uv
uv pip install codegen graph-sitter
```

## 🔧 Setup

1. **Get Codegen Credentials**:
   - Sign up at [codegen.com](https://codegen.com)
   - Get your organization ID and API token

2. **Set Environment Variables**:
   ```bash
   export CODEGEN_ORG_ID="your-org-id"
   export CODEGEN_TOKEN="your-api-token"
   ```

3. **Alternative: Use OpenAI API**:
   If you prefer to use OpenAI API instead of Codegen credentials:
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   ```

## 🎯 Quick Start

### Basic Usage

```python
from codegen_graph_sitter_integration import CodegenGraphSitterIntegration

# Initialize the integration
integration = CodegenGraphSitterIntegration(
    org_id="your-org-id",
    token="your-token",
    repo_path="fastapi/fastapi"  # Any GitHub repo
)

# Analyze codebase structure
analysis = integration.analyze_codebase_structure()

print(f"Most called function: {analysis.most_called_function['name']}")
print(f"Unused functions: {len(analysis.unused_functions)}")
print(f"Recursive functions: {len(analysis.recursive_functions)}")
```

### Function Context Analysis

```python
# Get detailed context for a specific function
function_name = "FastAPI"
context = integration.get_function_context(function_name)

print(f"Function: {function_name}")
print(f"Called from {len(context['call_sites'])} places")
print(f"Has {len(context['dependencies'])} dependencies")
print(f"Lines of code: {context['implementation']['line_count']}")
```

### AI-Powered Analysis

```python
# Get AI improvement suggestions
suggestions = integration.suggest_improvements()
print("Improvement Suggestions:")
print(suggestions)

# Custom AI analysis with context
custom_analysis = integration.analyze_with_codegen_ai(
    "Analyze this codebase for security vulnerabilities",
    context_data={"functions": len(integration.codebase.functions)}
)
```

### Interactive Mode

```python
# Run interactive analysis session
integration.interactive_analysis()
```

## 🔬 Advanced Usage

### Custom AI Provider

Configure graph-sitter to use Codegen SDK as the AI backend:

```python
from examples.advanced_integration import AdvancedCodegenGraphSitter

# Initialize with custom AI provider
advanced = AdvancedCodegenGraphSitter(
    org_id="your-org-id",
    token="your-token",
    repo_path="fastapi/fastapi"
)

# Use codebase.ai() with Codegen backend
function = advanced.codebase.get_function("process_data")
result = advanced.codebase.ai(
    "Improve this function's implementation",
    target=function,
    context={
        "call_sites": function.call_sites,
        "dependencies": function.dependencies,
        "parent": function.parent
    }
)
```

### Batch Analysis

```python
# Analyze multiple functions
results = advanced.batch_analyze_functions("security")
for func_name, analysis in results.items():
    print(f"{func_name}: {analysis}")
```

### Code Refactoring

```python
# AI-powered refactoring
refactored_code = advanced.refactor_function_with_ai(
    "large_function",
    "break into smaller, more focused functions"
)
```

## 📊 Analysis Types

The integration supports various types of analysis:

- **Structural Analysis**: Function relationships, call graphs, dependency analysis
- **Complexity Metrics**: Lines of code, dependencies per function, call site analysis
- **Dead Code Detection**: Identify unused functions and potential cleanup opportunities
- **Performance Analysis**: Find bottlenecks and optimization opportunities
- **Security Review**: Identify potential security vulnerabilities
- **Documentation Generation**: Auto-generate comprehensive documentation

## 🛠️ API Reference

### CodegenGraphSitterIntegration

Main integration class that combines Codegen SDK with graph-sitter.

#### Methods

- `analyze_codebase_structure()` → `CodebaseAnalysis`: Comprehensive structural analysis
- `get_function_context(function_name)` → `Dict`: Detailed function context
- `analyze_with_codegen_ai(prompt, context_data)` → `str`: AI analysis with context
- `suggest_improvements()` → `str`: AI-generated improvement suggestions
- `create_improvement_pr(description)` → `str`: Create PR with improvements
- `interactive_analysis()`: Run interactive analysis session

### AdvancedCodegenGraphSitter

Advanced integration with custom AI provider configuration.

#### Methods

- `analyze_function_with_ai(function_name, analysis_type)` → `str`: AI function analysis
- `refactor_function_with_ai(function_name, goal)` → `str`: AI-powered refactoring
- `generate_documentation_with_ai(target_type, target_name)` → `str`: Auto-documentation
- `batch_analyze_functions(analysis_type)` → `Dict`: Batch function analysis
- `create_improvement_plan()` → `str`: Comprehensive improvement plan

## 📁 Examples

### Basic Examples

Run the basic usage examples:

```bash
python examples/basic_usage.py
```

This includes:
- Basic codebase analysis
- Function context analysis
- AI-powered analysis
- Improvement suggestions
- Custom security analysis

### Advanced Examples

Run advanced integration examples:

```bash
python examples/advanced_integration.py
```

This demonstrates:
- Custom AI provider configuration
- Batch analysis workflows
- Documentation generation
- Refactoring with AI
- Comprehensive improvement planning

## 🔍 Use Cases

### 1. Code Quality Assessment

```python
# Analyze code quality across the entire codebase
integration = CodegenGraphSitterIntegration(org_id, token, "your-repo")
analysis = integration.analyze_codebase_structure()

# Identify areas needing attention
if analysis.complexity_metrics['unused_function_ratio'] > 0.1:
    print("High number of unused functions detected")

if len(analysis.recursive_functions) > 0:
    print(f"Recursive functions found: {analysis.recursive_functions}")
```

### 2. Performance Optimization

```python
# Find performance bottlenecks
most_called = analysis.most_called_function
performance_analysis = integration.analyze_with_codegen_ai(
    f"Analyze the performance of {most_called['name']} function and suggest optimizations",
    context_data=most_called
)
```

### 3. Security Review

```python
# Security-focused analysis
security_review = integration.analyze_with_codegen_ai(
    "Review this codebase for security vulnerabilities, focusing on input validation and authentication",
    context_data={"total_functions": len(integration.codebase.functions)}
)
```

### 4. Documentation Generation

```python
# Generate comprehensive documentation
advanced = AdvancedCodegenGraphSitter(org_id, token, repo_path)
docs = advanced.generate_documentation_with_ai("class", "MyClass")
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: [Codegen Docs](https://docs.codegen.com)
- **Graph-sitter Docs**: [graph-sitter.com](https://graph-sitter.com)
- **Issues**: Create an issue in this repository
- **Community**: Join our Discord for discussions

## 🔗 Related Projects

- [Codegen SDK](https://github.com/codegen-sh/codegen): Python SDK for Codegen
- [graph-sitter](https://github.com/graph-sitter/graph-sitter): Code analysis toolkit
- [FastAPI](https://github.com/tiangolo/fastapi): Example repository for analysis

---

**Happy coding! 🚀**

