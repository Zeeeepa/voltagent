#!/usr/bin/env python3
"""
Comprehensive integration example of Codegen SDK with graph-sitter
for advanced codebase analysis and AI-powered improvements.
"""

import json
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

# Core imports
from codegen import Agent
from graph_sitter import Codebase
from graph_sitter.core.external_module import ExternalModule
from graph_sitter.core.import_resolution import Import
from graph_sitter.core.symbol import Symbol


@dataclass
class CodebaseAnalysis:
    """Structured analysis results from graph-sitter."""
    most_called_function: Dict[str, Any]
    most_calling_function: Dict[str, Any]
    unused_functions: List[Dict[str, str]]
    recursive_functions: List[str]
    complexity_metrics: Dict[str, float]
    dependency_graph: Dict[str, List[str]]


class CodegenGraphSitterIntegration:
    """
    Integration class that combines Codegen SDK with graph-sitter
    for comprehensive codebase analysis and AI-powered improvements.
    """
    
    def __init__(self, org_id: str, token: str, repo_path: str):
        """
        Initialize the integration with Codegen credentials and repository.
        
        Args:
            org_id: Codegen organization ID
            token: Codegen API token  
            repo_path: Repository path (e.g., 'fastapi/fastapi')
        """
        self.agent = Agent(org_id=org_id, token=token)
        self.codebase = None
        self.repo_path = repo_path
        self._initialize_codebase()
    
    def _initialize_codebase(self):
        """Initialize the graph-sitter codebase."""
        print(f"🔄 Initializing codebase from {self.repo_path}...")
        try:
            self.codebase = Codebase.from_repo(self.repo_path)
            print(f"✅ Successfully loaded codebase with {len(self.codebase.functions)} functions")
        except Exception as e:
            print(f"❌ Error loading codebase: {e}")
            raise
    
    def analyze_codebase_structure(self) -> CodebaseAnalysis:
        """
        Perform comprehensive structural analysis using graph-sitter.
        
        Returns:
            CodebaseAnalysis object with detailed metrics
        """
        print("🔍 Analyzing codebase structure...")
        
        # Find the most called function
        most_called = max(self.codebase.functions, key=lambda f: len(f.call_sites))
        most_called_info = {
            "name": most_called.name,
            "call_count": len(most_called.call_sites),
            "filepath": most_called.filepath,
            "callers": [
                {
                    "function": call.parent_function.name if call.parent_function else "global",
                    "line": call.start_point[0] if call.start_point else 0
                }
                for call in most_called.call_sites
            ]
        }
        
        # Find function that makes the most calls
        most_calling = max(self.codebase.functions, key=lambda f: len(f.function_calls))
        most_calling_info = {
            "name": most_calling.name,
            "calls_count": len(most_calling.function_calls),
            "filepath": most_calling.filepath,
            "calls_to": [call.name for call in most_calling.function_calls]
        }
        
        # Find unused functions (potential dead code)
        unused = [
            {"name": f.name, "filepath": f.filepath}
            for f in self.codebase.functions 
            if len(f.call_sites) == 0
        ]
        
        # Find recursive functions
        recursive = [
            f.name for f in self.codebase.functions
            if any(call.name == f.name for call in f.function_calls)
        ]
        
        # Calculate complexity metrics
        complexity_metrics = self._calculate_complexity_metrics()
        
        # Build dependency graph
        dependency_graph = self._build_dependency_graph()
        
        return CodebaseAnalysis(
            most_called_function=most_called_info,
            most_calling_function=most_calling_info,
            unused_functions=unused,
            recursive_functions=recursive,
            complexity_metrics=complexity_metrics,
            dependency_graph=dependency_graph
        )
    
    def _calculate_complexity_metrics(self) -> Dict[str, float]:
        """Calculate various complexity metrics for the codebase."""
        total_functions = len(self.codebase.functions)
        if total_functions == 0:
            return {}
        
        # Calculate average dependencies per function
        avg_dependencies = sum(
            len(f.dependencies) for f in self.codebase.functions
        ) / total_functions
        
        # Calculate average call sites per function
        avg_call_sites = sum(
            len(f.call_sites) for f in self.codebase.functions
        ) / total_functions
        
        # Calculate average lines of code per function
        avg_loc = sum(
            len(f.source.split('\n')) for f in self.codebase.functions
        ) / total_functions
        
        return {
            "total_functions": total_functions,
            "avg_dependencies": avg_dependencies,
            "avg_call_sites": avg_call_sites,
            "avg_lines_per_function": avg_loc,
            "unused_function_ratio": len([f for f in self.codebase.functions if len(f.call_sites) == 0]) / total_functions
        }
    
    def _build_dependency_graph(self) -> Dict[str, List[str]]:
        """Build a dependency graph of functions."""
        graph = {}
        for function in self.codebase.functions:
            deps = []
            for dep in function.dependencies:
                if isinstance(dep, Import):
                    dep = self._hop_through_imports(dep)
                if hasattr(dep, 'name'):
                    deps.append(dep.name)
            graph[function.name] = deps
        return graph
    
    def _hop_through_imports(self, imp: Import) -> Symbol | ExternalModule:
        """Resolve import chains to find the root symbol."""
        if isinstance(imp.imported_symbol, Import):
            return self._hop_through_imports(imp.imported_symbol)
        return imp.imported_symbol
    
    def get_function_context(self, function_name: str) -> Dict[str, Any]:
        """
        Get comprehensive context for a specific function.
        
        Args:
            function_name: Name of the function to analyze
            
        Returns:
            Dictionary with function context including dependencies and usages
        """
        function = self.codebase.get_function(function_name)
        if not function:
            raise ValueError(f"Function '{function_name}' not found in codebase")
        
        context = {
            "implementation": {
                "source": function.source,
                "filepath": function.filepath,
                "line_count": len(function.source.split('\n'))
            },
            "call_sites": [
                {
                    "caller": call.parent_function.name if call.parent_function else "global",
                    "filepath": call.usage_symbol.filepath if hasattr(call, 'usage_symbol') else "unknown",
                    "line": call.start_point[0] if call.start_point else 0
                }
                for call in function.call_sites
            ],
            "dependencies": [],
            "usages": [],
            "parent": function.parent.name if function.parent else None,
            "docstring": function.docstring
        }
        
        # Add dependencies
        for dep in function.dependencies:
            if isinstance(dep, Import):
                dep = self._hop_through_imports(dep)
            
            context["dependencies"].append({
                "name": getattr(dep, 'name', 'unknown'),
                "source": getattr(dep, 'source', ''),
                "filepath": getattr(dep, 'filepath', '')
            })
        
        # Add usages
        for usage in function.usages:
            context["usages"].append({
                "source": usage.usage_symbol.source,
                "filepath": usage.usage_symbol.filepath,
            })
        
        return context
    
    def analyze_with_codegen_ai(self, analysis_prompt: str, context_data: Optional[Dict] = None) -> str:
        """
        Use Codegen AI to analyze the codebase with graph-sitter context.
        
        Args:
            analysis_prompt: Prompt for the AI analysis
            context_data: Optional context data from graph-sitter analysis
            
        Returns:
            AI analysis result
        """
        # Prepare context for the AI
        full_prompt = f"""
{analysis_prompt}

Context from codebase analysis:
"""
        
        if context_data:
            full_prompt += f"\nCodebase Context:\n{json.dumps(context_data, indent=2)}"
        
        print("🤖 Running Codegen AI analysis...")
        task = self.agent.run(prompt=full_prompt)
        
        print(f"📊 Task status: {task.status}")
        
        # Wait for completion and get result
        while task.status not in ["completed", "failed"]:
            task.refresh()
            print(f"⏳ Task status: {task.status}")
        
        if task.status == "completed":
            return task.result
        else:
            raise Exception(f"AI analysis failed: {task.status}")
    
    def suggest_improvements(self) -> str:
        """
        Analyze the codebase and suggest improvements using both graph-sitter and Codegen AI.
        
        Returns:
            AI-generated improvement suggestions
        """
        # First, get structural analysis
        analysis = self.analyze_codebase_structure()
        
        # Prepare context for AI
        context = {
            "structural_analysis": {
                "most_called_function": analysis.most_called_function,
                "most_calling_function": analysis.most_calling_function,
                "unused_functions_count": len(analysis.unused_functions),
                "recursive_functions_count": len(analysis.recursive_functions),
                "complexity_metrics": analysis.complexity_metrics
            },
            "potential_issues": {
                "unused_functions": analysis.unused_functions[:10],  # Limit for context
                "recursive_functions": analysis.recursive_functions
            }
        }
        
        improvement_prompt = """
Analyze this codebase and suggest specific improvements for better maintainability, 
performance, and code quality. Focus on:

1. Code organization and structure
2. Potential refactoring opportunities  
3. Dead code removal
4. Performance optimizations
5. Best practices implementation

Provide specific, actionable recommendations with examples where possible.
"""
        
        return self.analyze_with_codegen_ai(improvement_prompt, context)
    
    def create_improvement_pr(self, improvements_description: str) -> str:
        """
        Create a PR with suggested improvements using Codegen AI.
        
        Args:
            improvements_description: Description of improvements to implement
            
        Returns:
            Result of the PR creation task
        """
        pr_prompt = f"""
Create a pull request implementing the following improvements to the codebase:

{improvements_description}

Please:
1. Analyze the current code structure
2. Implement the suggested improvements
3. Ensure all changes maintain backward compatibility
4. Add appropriate tests if needed
5. Update documentation as necessary

Focus on making the codebase more maintainable and efficient.
"""
        
        return self.analyze_with_codegen_ai(pr_prompt)
    
    def interactive_analysis(self):
        """Run an interactive analysis session."""
        print("🚀 Starting interactive codebase analysis...")
        
        # Perform initial analysis
        analysis = self.analyze_codebase_structure()
        
        print(f"\n📈 Codebase Overview:")
        print(f"  • Total functions: {analysis.complexity_metrics['total_functions']}")
        print(f"  • Most called function: {analysis.most_called_function['name']} ({analysis.most_called_function['call_count']} calls)")
        print(f"  • Most calling function: {analysis.most_calling_function['name']} ({analysis.most_calling_function['calls_count']} calls)")
        print(f"  • Unused functions: {len(analysis.unused_functions)}")
        print(f"  • Recursive functions: {len(analysis.recursive_functions)}")
        print(f"  • Average dependencies per function: {analysis.complexity_metrics['avg_dependencies']:.2f}")
        
        while True:
            print("\n🔍 What would you like to analyze?")
            print("1. Get function context")
            print("2. Suggest improvements")
            print("3. Create improvement PR")
            print("4. Custom AI analysis")
            print("5. Exit")
            
            choice = input("\nEnter your choice (1-5): ").strip()
            
            if choice == "1":
                func_name = input("Enter function name: ").strip()
                try:
                    context = self.get_function_context(func_name)
                    print(f"\n📋 Context for {func_name}:")
                    print(json.dumps(context, indent=2))
                except ValueError as e:
                    print(f"❌ {e}")
            
            elif choice == "2":
                print("\n🔄 Generating improvement suggestions...")
                suggestions = self.suggest_improvements()
                print(f"\n💡 Improvement Suggestions:\n{suggestions}")
            
            elif choice == "3":
                description = input("Enter improvement description: ").strip()
                print("\n🔄 Creating improvement PR...")
                result = self.create_improvement_pr(description)
                print(f"\n🎉 PR Creation Result:\n{result}")
            
            elif choice == "4":
                prompt = input("Enter your analysis prompt: ").strip()
                result = self.analyze_with_codegen_ai(prompt, analysis.__dict__)
                print(f"\n🤖 AI Analysis Result:\n{result}")
            
            elif choice == "5":
                print("👋 Goodbye!")
                break
            
            else:
                print("❌ Invalid choice. Please try again.")


def main():
    """
    Example usage of the Codegen + graph-sitter integration.
    """
    # Configuration - replace with your actual values
    ORG_ID = os.getenv("CODEGEN_ORG_ID", "your-org-id")
    TOKEN = os.getenv("CODEGEN_TOKEN", "your-token")
    REPO_PATH = "fastapi/fastapi"  # Example repository
    
    if ORG_ID == "your-org-id" or TOKEN == "your-token":
        print("❌ Please set CODEGEN_ORG_ID and CODEGEN_TOKEN environment variables")
        print("   or update the values in the script")
        return
    
    try:
        # Initialize the integration
        integration = CodegenGraphSitterIntegration(
            org_id=ORG_ID,
            token=TOKEN,
            repo_path=REPO_PATH
        )
        
        # Run interactive analysis
        integration.interactive_analysis()
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()

