#!/usr/bin/env python3
"""
Advanced integration examples showing how to configure graph-sitter's codebase.ai()
to use Codegen SDK credentials and create sophisticated analysis workflows.
"""

import os
import json
from typing import Dict, Any, Optional
from dataclasses import dataclass

from codegen import Agent
from graph_sitter import Codebase


class CodegenAIProvider:
    """
    Custom AI provider that uses Codegen SDK instead of default LLM.
    This allows graph-sitter's codebase.ai() to use your Codegen credentials.
    """
    
    def __init__(self, org_id: str, token: str):
        self.agent = Agent(org_id=org_id, token=token)
    
    def generate(self, prompt: str, context: Optional[Dict] = None) -> str:
        """
        Generate AI response using Codegen SDK.
        
        Args:
            prompt: The AI prompt
            context: Optional context data
            
        Returns:
            AI-generated response
        """
        full_prompt = prompt
        if context:
            full_prompt += f"\n\nContext:\n{json.dumps(context, indent=2)}"
        
        task = self.agent.run(prompt=full_prompt)
        
        # Wait for completion
        while task.status not in ["completed", "failed"]:
            task.refresh()
        
        if task.status == "completed":
            return task.result
        else:
            raise Exception(f"AI generation failed: {task.status}")


class AdvancedCodegenGraphSitter:
    """
    Advanced integration that configures graph-sitter to use Codegen SDK
    for all AI operations, enabling seamless integration between the tools.
    """
    
    def __init__(self, org_id: str, token: str, repo_path: str):
        self.org_id = org_id
        self.token = token
        self.repo_path = repo_path
        
        # Initialize Codegen AI provider
        self.ai_provider = CodegenAIProvider(org_id, token)
        
        # Initialize codebase
        self.codebase = Codebase.from_repo(repo_path)
        
        # Configure codebase to use Codegen AI
        self._configure_codebase_ai()
    
    def _configure_codebase_ai(self):
        """Configure graph-sitter codebase to use Codegen SDK for AI operations."""
        # Note: This is a conceptual implementation
        # The actual graph-sitter API might differ
        
        # Set custom AI provider for the codebase
        if hasattr(self.codebase, 'set_ai_provider'):
            self.codebase.set_ai_provider(self.ai_provider)
        
        # Configure session options
        if hasattr(self.codebase, 'set_session_options'):
            self.codebase.set_session_options(
                max_ai_requests=200,
                ai_provider="codegen"
            )
    
    def analyze_function_with_ai(self, function_name: str, analysis_type: str = "improvement") -> str:
        """
        Analyze a specific function using graph-sitter context and Codegen AI.
        
        Args:
            function_name: Name of the function to analyze
            analysis_type: Type of analysis (improvement, security, performance, etc.)
            
        Returns:
            AI analysis result
        """
        function = self.codebase.get_function(function_name)
        if not function:
            raise ValueError(f"Function '{function_name}' not found")
        
        # Gather comprehensive context
        context = {
            "call_sites": list(function.call_sites),
            "dependencies": list(function.dependencies),
            "parent": function.parent,
            "docstring": function.docstring,
            "usages": list(function.usages)
        }
        
        # Define analysis prompts based on type
        prompts = {
            "improvement": "Analyze this function and suggest improvements for better maintainability and performance",
            "security": "Review this function for potential security vulnerabilities",
            "performance": "Analyze this function for performance bottlenecks and optimization opportunities",
            "documentation": "Generate comprehensive documentation for this function",
            "testing": "Suggest comprehensive test cases for this function"
        }
        
        prompt = prompts.get(analysis_type, prompts["improvement"])
        
        # Use codebase.ai() with Codegen backend
        try:
            # This would use the configured Codegen AI provider
            result = self.codebase.ai(
                prompt=prompt,
                target=function,
                context=context
            )
            return result
        except AttributeError:
            # Fallback to direct AI provider if codebase.ai() not available
            return self.ai_provider.generate(
                f"{prompt}\n\nFunction: {function.name}\nSource:\n{function.source}",
                context
            )
    
    def refactor_function_with_ai(self, function_name: str, refactor_goal: str) -> str:
        """
        Refactor a function using AI with full context awareness.
        
        Args:
            function_name: Name of the function to refactor
            refactor_goal: Description of the refactoring goal
            
        Returns:
            Refactored code
        """
        function = self.codebase.get_function(function_name)
        if not function:
            raise ValueError(f"Function '{function_name}' not found")
        
        # Gather context for refactoring
        context = {
            "parent_class": function.parent,
            "call_sites": list(function.call_sites),
            "dependencies": list(function.dependencies),
            "related_functions": [
                f for f in self.codebase.functions 
                if f.parent == function.parent and f.name != function.name
            ][:5]  # Limit for context
        }
        
        refactor_prompt = f"""
        Refactor this function to {refactor_goal}.
        
        Requirements:
        1. Maintain the same interface (parameters and return type)
        2. Preserve all existing functionality
        3. Improve code quality and maintainability
        4. Consider the context of how this function is used
        
        Return only the refactored function code.
        """
        
        try:
            new_code = self.codebase.ai(
                prompt=refactor_prompt,
                target=function,
                context=context
            )
            
            # Apply the refactoring
            function.edit(new_code)
            return new_code
            
        except AttributeError:
            # Fallback implementation
            return self.ai_provider.generate(
                f"{refactor_prompt}\n\nOriginal function:\n{function.source}",
                context
            )
    
    def generate_documentation_with_ai(self, target_type: str = "class", target_name: str = None) -> str:
        """
        Generate comprehensive documentation using AI.
        
        Args:
            target_type: Type of target (class, function, module)
            target_name: Name of the specific target
            
        Returns:
            Generated documentation
        """
        if target_type == "class" and target_name:
            target = self.codebase.get_class(target_name)
            context = {
                "methods": [m.name for m in target.methods],
                "attributes": getattr(target, 'attributes', []),
                "inheritance": getattr(target, 'inheritance', [])
            }
        elif target_type == "function" and target_name:
            target = self.codebase.get_function(target_name)
            context = {
                "call_sites": list(target.call_sites),
                "dependencies": list(target.dependencies)
            }
        else:
            raise ValueError("Invalid target type or missing target name")
        
        doc_prompt = f"""
        Generate comprehensive documentation for this {target_type}.
        Include:
        1. Clear description of purpose and functionality
        2. Parameter descriptions with types
        3. Return value description
        4. Usage examples
        5. Any important notes or warnings
        
        Use Google docstring format.
        """
        
        try:
            documentation = self.codebase.ai(
                prompt=doc_prompt,
                target=target,
                context=context
            )
            
            # Apply documentation
            if hasattr(target, 'set_docstring'):
                target.set_docstring(documentation)
            
            return documentation
            
        except AttributeError:
            return self.ai_provider.generate(
                f"{doc_prompt}\n\n{target_type.title()}: {target.name}\nSource:\n{target.source}",
                context
            )
    
    def batch_analyze_functions(self, analysis_type: str = "improvement") -> Dict[str, str]:
        """
        Analyze multiple functions in batch using AI.
        
        Args:
            analysis_type: Type of analysis to perform
            
        Returns:
            Dictionary mapping function names to analysis results
        """
        results = {}
        
        # Analyze top 10 most called functions
        functions_by_calls = sorted(
            self.codebase.functions,
            key=lambda f: len(f.call_sites),
            reverse=True
        )[:10]
        
        for function in functions_by_calls:
            try:
                result = self.analyze_function_with_ai(function.name, analysis_type)
                results[function.name] = result
                print(f"✅ Analyzed {function.name}")
            except Exception as e:
                results[function.name] = f"Error: {e}"
                print(f"❌ Failed to analyze {function.name}: {e}")
        
        return results
    
    def create_improvement_plan(self) -> str:
        """
        Create a comprehensive improvement plan for the entire codebase.
        
        Returns:
            Detailed improvement plan
        """
        # Gather codebase metrics
        total_functions = len(self.codebase.functions)
        unused_functions = [f for f in self.codebase.functions if len(f.call_sites) == 0]
        complex_functions = [f for f in self.codebase.functions if len(f.source.split('\n')) > 50]
        
        # Most called functions (potential bottlenecks)
        most_called = sorted(
            self.codebase.functions,
            key=lambda f: len(f.call_sites),
            reverse=True
        )[:5]
        
        context = {
            "total_functions": total_functions,
            "unused_functions_count": len(unused_functions),
            "complex_functions_count": len(complex_functions),
            "most_called_functions": [f.name for f in most_called],
            "codebase_size": sum(len(f.source.split('\n')) for f in self.codebase.functions)
        }
        
        plan_prompt = """
        Create a comprehensive improvement plan for this codebase.
        
        Analyze the provided metrics and suggest:
        1. Priority areas for refactoring
        2. Performance optimization opportunities
        3. Code organization improvements
        4. Dead code removal strategy
        5. Documentation improvements
        6. Testing strategy enhancements
        
        Provide a prioritized action plan with specific steps.
        """
        
        return self.ai_provider.generate(plan_prompt, context)


def example_advanced_usage():
    """Example of advanced usage with custom AI provider."""
    print("🚀 Advanced Codegen + graph-sitter Integration")
    
    # Initialize with Codegen credentials
    integration = AdvancedCodegenGraphSitter(
        org_id=os.getenv("CODEGEN_ORG_ID"),
        token=os.getenv("CODEGEN_TOKEN"),
        repo_path="fastapi/fastapi"
    )
    
    # Example 1: Analyze specific function
    print("\n1. Analyzing specific function...")
    try:
        # Replace with actual function name from the codebase
        analysis = integration.analyze_function_with_ai("FastAPI", "improvement")
        print(f"Function analysis: {analysis[:200]}...")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 2: Generate documentation
    print("\n2. Generating documentation...")
    try:
        docs = integration.generate_documentation_with_ai("function", "FastAPI")
        print(f"Generated docs: {docs[:200]}...")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 3: Batch analysis
    print("\n3. Running batch analysis...")
    try:
        batch_results = integration.batch_analyze_functions("security")
        print(f"Analyzed {len(batch_results)} functions")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 4: Create improvement plan
    print("\n4. Creating improvement plan...")
    try:
        plan = integration.create_improvement_plan()
        print(f"Improvement plan: {plan[:300]}...")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    if not os.getenv("CODEGEN_ORG_ID") or not os.getenv("CODEGEN_TOKEN"):
        print("❌ Please set CODEGEN_ORG_ID and CODEGEN_TOKEN environment variables")
        exit(1)
    
    example_advanced_usage()

