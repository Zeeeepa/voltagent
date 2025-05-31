#!/usr/bin/env python3
"""
Basic usage examples for Codegen SDK + graph-sitter integration.
"""

import os
from codegen_graph_sitter_integration import CodegenGraphSitterIntegration


def example_1_basic_analysis():
    """Example 1: Basic codebase analysis."""
    print("🔍 Example 1: Basic Codebase Analysis")
    
    integration = CodegenGraphSitterIntegration(
        org_id=os.getenv("CODEGEN_ORG_ID"),
        token=os.getenv("CODEGEN_TOKEN"),
        repo_path="fastapi/fastapi"
    )
    
    # Perform structural analysis
    analysis = integration.analyze_codebase_structure()
    
    print(f"Most called function: {analysis.most_called_function['name']}")
    print(f"Called {analysis.most_called_function['call_count']} times")
    
    print(f"\nFunction making most calls: {analysis.most_calling_function['name']}")
    print(f"Makes {analysis.most_calling_function['calls_count']} calls")
    
    print(f"\nUnused functions: {len(analysis.unused_functions)}")
    print(f"Recursive functions: {len(analysis.recursive_functions)}")


def example_2_function_context():
    """Example 2: Get detailed function context."""
    print("\n🔍 Example 2: Function Context Analysis")
    
    integration = CodegenGraphSitterIntegration(
        org_id=os.getenv("CODEGEN_ORG_ID"),
        token=os.getenv("CODEGEN_TOKEN"),
        repo_path="fastapi/fastapi"
    )
    
    # Get context for a specific function
    try:
        # Replace with an actual function name from the codebase
        function_name = "FastAPI"  # Example function name
        context = integration.get_function_context(function_name)
        
        print(f"Function: {function_name}")
        print(f"File: {context['implementation']['filepath']}")
        print(f"Lines of code: {context['implementation']['line_count']}")
        print(f"Called from {len(context['call_sites'])} places")
        print(f"Has {len(context['dependencies'])} dependencies")
        
    except ValueError as e:
        print(f"Function not found: {e}")


def example_3_ai_analysis():
    """Example 3: AI-powered analysis with context."""
    print("\n🤖 Example 3: AI Analysis with Context")
    
    integration = CodegenGraphSitterIntegration(
        org_id=os.getenv("CODEGEN_ORG_ID"),
        token=os.getenv("CODEGEN_TOKEN"),
        repo_path="fastapi/fastapi"
    )
    
    # Get structural analysis first
    analysis = integration.analyze_codebase_structure()
    
    # Use AI to analyze with context
    ai_prompt = """
    Analyze the code structure and identify the top 3 areas for improvement.
    Focus on maintainability and performance.
    """
    
    context_data = {
        "complexity_metrics": analysis.complexity_metrics,
        "unused_functions_count": len(analysis.unused_functions),
        "most_called": analysis.most_called_function['name']
    }
    
    result = integration.analyze_with_codegen_ai(ai_prompt, context_data)
    print("AI Analysis Result:")
    print(result)


def example_4_improvement_suggestions():
    """Example 4: Get AI improvement suggestions."""
    print("\n💡 Example 4: AI Improvement Suggestions")
    
    integration = CodegenGraphSitterIntegration(
        org_id=os.getenv("CODEGEN_ORG_ID"),
        token=os.getenv("CODEGEN_TOKEN"),
        repo_path="fastapi/fastapi"
    )
    
    # Get AI-powered improvement suggestions
    suggestions = integration.suggest_improvements()
    print("Improvement Suggestions:")
    print(suggestions)


def example_5_custom_analysis():
    """Example 5: Custom analysis combining both tools."""
    print("\n🔧 Example 5: Custom Analysis")
    
    integration = CodegenGraphSitterIntegration(
        org_id=os.getenv("CODEGEN_ORG_ID"),
        token=os.getenv("CODEGEN_TOKEN"),
        repo_path="fastapi/fastapi"
    )
    
    # Custom analysis: Find potential security issues
    analysis = integration.analyze_codebase_structure()
    
    # Look for functions that might have security implications
    security_prompt = """
    Review this codebase for potential security vulnerabilities.
    Focus on:
    1. Input validation
    2. Authentication/authorization
    3. Data sanitization
    4. Error handling that might leak information
    
    Provide specific recommendations for each issue found.
    """
    
    security_context = {
        "total_functions": analysis.complexity_metrics['total_functions'],
        "unused_functions": analysis.unused_functions[:5],  # Sample
        "high_complexity_functions": [
            analysis.most_called_function,
            analysis.most_calling_function
        ]
    }
    
    security_analysis = integration.analyze_with_codegen_ai(
        security_prompt, 
        security_context
    )
    
    print("Security Analysis:")
    print(security_analysis)


if __name__ == "__main__":
    # Check environment variables
    if not os.getenv("CODEGEN_ORG_ID") or not os.getenv("CODEGEN_TOKEN"):
        print("❌ Please set CODEGEN_ORG_ID and CODEGEN_TOKEN environment variables")
        exit(1)
    
    print("🚀 Running Codegen + graph-sitter Integration Examples")
    
    try:
        example_1_basic_analysis()
        example_2_function_context()
        example_3_ai_analysis()
        example_4_improvement_suggestions()
        example_5_custom_analysis()
        
    except Exception as e:
        print(f"❌ Error running examples: {e}")
        print("Make sure you have valid Codegen credentials and the repository is accessible.")

