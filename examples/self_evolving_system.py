#!/usr/bin/env python3
"""
Self-Evolving CI/CD System Implementation Example
Demonstrates integration of graph-sitter, codegen SDK, and autogenlib
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

# Core dependencies
from graph_sitter import Codebase
from graph_sitter.core.external_module import ExternalModule
from graph_sitter.core.import_resolution import Import
from graph_sitter.core.symbol import Symbol
from codegen import Agent
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AnalysisConfig:
    """Configuration for codebase analysis"""
    org_id: str
    token: str
    db_connection_string: str
    github_token: str
    linear_token: str
    anthropic_api_key: str

class SelfEvolvingCICDSystem:
    """
    Main system class that orchestrates the self-evolving CI/CD pipeline
    """
    
    def __init__(self, config: AnalysisConfig):
        self.config = config
        self.codegen_agent = Agent(org_id=config.org_id, token=config.token)
        self.db_connection = None
        self.analysis_history = []
        
    async def initialize(self):
        """Initialize the system components"""
        logger.info("Initializing Self-Evolving CI/CD System...")
        
        # Initialize database connection
        self.db_connection = psycopg2.connect(
            self.config.db_connection_string,
            cursor_factory=RealDictCursor
        )
        
        logger.info("System initialized successfully")
    
    def get_comprehensive_codebase_context(self, codebase: Codebase) -> Dict[str, Any]:
        """
        Extract comprehensive codebase analysis using graph-sitter
        This implements the extensive analysis described in the requirements
        """
        logger.info(f"Analyzing codebase with {len(codebase.files)} files...")
        
        # Basic statistics
        overview = {
            "total_files": len(codebase.files),
            "total_functions": len(codebase.functions),
            "total_classes": len(codebase.classes),
            "total_imports": len(codebase.imports)
        }
        
        # Function analysis with full context
        function_analysis = []
        for function in codebase.functions:
            context = self.get_function_context(function)
            metrics = self.calculate_function_metrics(function)
            
            function_analysis.append({
                "function": function.name,
                "file": function.filepath,
                "context": context,
                "metrics": metrics,
                "recommendations": self.generate_function_recommendations(function, context, metrics)
            })
        
        # Find most called function
        most_called = max(codebase.functions, key=lambda f: len(f.call_sites)) if codebase.functions else None
        
        # Find function that makes the most calls
        most_calls = max(codebase.functions, key=lambda f: len(f.function_calls)) if codebase.functions else None
        
        # Find dead code
        unused_functions = [f for f in codebase.functions if len(f.call_sites) == 0]
        
        # Find recursive functions
        recursive_functions = [
            f for f in codebase.functions 
            if any(call.name == f.name for call in f.function_calls)
        ]
        
        # Dependency analysis
        dependency_graph = self.build_dependency_graph(codebase)
        
        # Code quality metrics
        quality_metrics = self.calculate_quality_metrics(codebase)
        
        return {
            "overview": overview,
            "function_analysis": function_analysis,
            "call_patterns": {
                "most_called": {
                    "name": most_called.name if most_called else None,
                    "call_count": len(most_called.call_sites) if most_called else 0,
                    "callers": [
                        {
                            "function": call.parent_function.name,
                            "line": call.start_point[0]
                        } for call in most_called.call_sites
                    ] if most_called else []
                },
                "most_calls": {
                    "name": most_calls.name if most_calls else None,
                    "calls_made": len(most_calls.function_calls) if most_calls else 0,
                    "called_functions": [call.name for call in most_calls.function_calls] if most_calls else []
                }
            },
            "dead_code": [
                {
                    "name": func.name,
                    "file": func.filepath,
                    "reason": "No callers found"
                } for func in unused_functions
            ],
            "recursive_functions": [func.name for func in recursive_functions],
            "dependency_graph": dependency_graph,
            "quality_metrics": quality_metrics,
            "recommendations": self.generate_codebase_recommendations(codebase)
        }
    
    def get_function_context(self, function) -> Dict[str, Any]:
        """Get the implementation, dependencies, and usages of a function."""
        context = {
            "implementation": {
                "source": function.source,
                "filepath": function.filepath
            },
            "dependencies": [],
            "usages": [],
        }
        
        # Add dependencies
        for dep in function.dependencies:
            # Hop through imports to find the root symbol source
            if isinstance(dep, Import):
                dep = self.hop_through_imports(dep)
            context["dependencies"].append({
                "source": dep.source,
                "filepath": dep.filepath
            })
        
        # Add usages
        for usage in function.usages:
            context["usages"].append({
                "source": usage.usage_symbol.source,
                "filepath": usage.usage_symbol.filepath,
            })
        
        return context
    
    def hop_through_imports(self, imp: Import) -> Symbol:
        """Finds the root symbol for an import."""
        if isinstance(imp.imported_symbol, Import):
            return self.hop_through_imports(imp.imported_symbol)
        return imp.imported_symbol
    
    def calculate_function_metrics(self, function) -> Dict[str, Any]:
        """Calculate comprehensive metrics for a function"""
        source_lines = function.source.split('\n')
        
        # Basic metrics
        lines_of_code = len(source_lines)
        logical_lines = len([line for line in source_lines if line.strip() and not line.strip().startswith('#')])
        
        # Complexity metrics (simplified implementation)
        cyclomatic_complexity = self.calculate_cyclomatic_complexity(function)
        halstead_volume = self.calculate_halstead_volume(function)
        maintainability_index = self.calculate_maintainability_index(
            halstead_volume, cyclomatic_complexity, lines_of_code
        )
        
        return {
            "lines_of_code": lines_of_code,
            "logical_lines_of_code": logical_lines,
            "cyclomatic_complexity": cyclomatic_complexity,
            "halstead_volume": halstead_volume,
            "maintainability_index": maintainability_index,
            "parameter_count": len(function.parameters) if hasattr(function, 'parameters') else 0,
            "call_count": len(function.call_sites),
            "calls_made": len(function.function_calls)
        }
    
    def calculate_cyclomatic_complexity(self, function) -> float:
        """Calculate cyclomatic complexity for a function"""
        # Simplified implementation - count decision points
        source = function.source.lower()
        complexity = 1  # Base complexity
        
        # Count decision points
        decision_keywords = ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'and', 'or']
        for keyword in decision_keywords:
            complexity += source.count(keyword)
        
        return float(complexity)
    
    def calculate_halstead_volume(self, function) -> float:
        """Calculate Halstead volume for a function"""
        # Simplified implementation
        source = function.source
        
        # Count operators and operands (simplified)
        operators = ['+', '-', '*', '/', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not']
        operands = []  # Would need proper parsing for accurate count
        
        n1 = len(set(op for op in operators if op in source))
        n2 = len(operands)  # Simplified
        N1 = sum(source.count(op) for op in operators)
        N2 = len(operands)  # Simplified
        
        N = N1 + N2
        n = n1 + n2
        
        if n > 0:
            import math
            volume = N * math.log2(n)
            return volume
        return 0.0
    
    def calculate_maintainability_index(self, halstead_volume: float, cyclomatic_complexity: float, loc: int) -> int:
        """Calculate the normalized maintainability index for a function."""
        if loc <= 0:
            return 100
        
        try:
            import math
            raw_mi = (
                171
                - 5.2 * math.log(max(1, halstead_volume))
                - 0.23 * cyclomatic_complexity
                - 16.2 * math.log(max(1, loc))
            )
            normalized_mi = max(0, min(100, raw_mi * 100 / 171))
            return int(normalized_mi)
        except (ValueError, TypeError):
            return 0
    
    def build_dependency_graph(self, codebase: Codebase) -> Dict[str, Any]:
        """Build a comprehensive dependency graph"""
        dependencies = []
        
        for function in codebase.functions:
            for dep in function.dependencies:
                dependencies.append({
                    "source": function.name,
                    "target": dep.name if hasattr(dep, 'name') else str(dep),
                    "type": "function_dependency",
                    "file": function.filepath
                })
        
        # Analyze for circular dependencies
        circular_deps = self.find_circular_dependencies(dependencies)
        
        return {
            "dependencies": dependencies,
            "circular_dependencies": circular_deps,
            "dependency_count": len(dependencies)
        }
    
    def find_circular_dependencies(self, dependencies: List[Dict]) -> List[Dict]:
        """Find circular dependencies in the dependency graph"""
        # Simplified implementation
        circular = []
        dep_map = {}
        
        for dep in dependencies:
            source, target = dep["source"], dep["target"]
            if source not in dep_map:
                dep_map[source] = []
            dep_map[source].append(target)
        
        # Check for direct circular dependencies
        for source, targets in dep_map.items():
            for target in targets:
                if target in dep_map and source in dep_map[target]:
                    circular.append({
                        "source": source,
                        "target": target,
                        "type": "circular"
                    })
        
        return circular
    
    def calculate_quality_metrics(self, codebase: Codebase) -> Dict[str, Any]:
        """Calculate overall code quality metrics"""
        if not codebase.functions:
            return {"error": "No functions found"}
        
        complexities = [self.calculate_cyclomatic_complexity(f) for f in codebase.functions]
        maintainability_scores = [
            self.calculate_maintainability_index(
                self.calculate_halstead_volume(f),
                self.calculate_cyclomatic_complexity(f),
                len(f.source.split('\n'))
            ) for f in codebase.functions
        ]
        
        return {
            "average_complexity": sum(complexities) / len(complexities),
            "max_complexity": max(complexities),
            "high_complexity_functions": len([c for c in complexities if c > 10]),
            "average_maintainability": sum(maintainability_scores) / len(maintainability_scores),
            "low_maintainability_functions": len([m for m in maintainability_scores if m < 50])
        }
    
    def generate_function_recommendations(self, function, context: Dict, metrics: Dict) -> List[str]:
        """Generate recommendations for improving a specific function"""
        recommendations = []
        
        if metrics["cyclomatic_complexity"] > 10:
            recommendations.append(f"Reduce complexity of {function.name} (current: {metrics['cyclomatic_complexity']})")
        
        if metrics["lines_of_code"] > 50:
            recommendations.append(f"Consider breaking down {function.name} into smaller functions")
        
        if metrics["maintainability_index"] < 50:
            recommendations.append(f"Improve maintainability of {function.name}")
        
        if len(context["usages"]) == 0:
            recommendations.append(f"Consider removing unused function {function.name}")
        
        return recommendations
    
    def generate_codebase_recommendations(self, codebase: Codebase) -> List[str]:
        """Generate high-level recommendations for the entire codebase"""
        recommendations = []
        
        # Test coverage analysis
        test_files = [f for f in codebase.files if 'test' in f.filepath.lower()]
        source_files = [f for f in codebase.files if f not in test_files]
        
        if len(test_files) / max(len(source_files), 1) < 0.5:
            recommendations.append("Increase test coverage - current ratio is low")
        
        # Dead code analysis
        unused_functions = [f for f in codebase.functions if len(f.call_sites) == 0]
        if unused_functions:
            recommendations.append(f"Remove {len(unused_functions)} unused functions")
        
        # Complexity analysis
        high_complexity = [f for f in codebase.functions if self.calculate_cyclomatic_complexity(f) > 10]
        if high_complexity:
            recommendations.append(f"Refactor {len(high_complexity)} high-complexity functions")
        
        return recommendations
    
    async def analyze_and_improve_codebase(self, repo_name: str) -> Dict[str, Any]:
        """
        Main analysis and improvement pipeline
        This is the core self-evolving functionality
        """
        logger.info(f"Starting analysis and improvement for {repo_name}")
        
        try:
            # 1. Load codebase using graph-sitter
            logger.info("Loading codebase...")
            codebase = Codebase.from_repo(repo_name)
            
            # 2. Perform comprehensive analysis
            logger.info("Performing comprehensive analysis...")
            context = self.get_comprehensive_codebase_context(codebase)
            
            # 3. Store analysis results in database
            analysis_session_id = await self.store_analysis_results(repo_name, context)
            
            # 4. Generate improvement tasks using Codegen SDK
            logger.info("Generating improvement tasks...")
            improvement_tasks = await self.generate_improvement_tasks(context, codebase)
            
            # 5. Execute improvements
            logger.info("Executing improvements...")
            improvement_results = []
            for task in improvement_tasks:
                result = await self.execute_improvement_task(task, repo_name)
                improvement_results.append(result)
            
            # 6. Create PR with improvements
            if improvement_results:
                logger.info("Creating improvement PR...")
                pr_result = await self.create_improvement_pr(improvement_results, repo_name)
            else:
                pr_result = {"message": "No improvements needed"}
            
            return {
                "analysis": context,
                "analysis_session_id": analysis_session_id,
                "improvements": improvement_results,
                "pr": pr_result,
                "status": "completed"
            }
            
        except Exception as e:
            logger.error(f"Error in analysis pipeline: {str(e)}")
            return {
                "error": str(e),
                "status": "failed"
            }
    
    async def store_analysis_results(self, repo_name: str, context: Dict[str, Any]) -> str:
        """Store analysis results in the database"""
        cursor = self.db_connection.cursor()
        
        # Create analysis session
        cursor.execute("""
            INSERT INTO analysis_sessions (codebase_id, session_type, status, results_summary)
            VALUES ((SELECT id FROM codebases WHERE name = %s), 'full', 'completed', %s)
            RETURNING id
        """, (repo_name, json.dumps(context["overview"])))
        
        session_id = cursor.fetchone()['id']
        
        # Store detailed metrics
        for func_analysis in context["function_analysis"]:
            cursor.execute("""
                INSERT INTO code_metrics (
                    codebase_id, analysis_session_id, metric_type, metric_value,
                    scope_type, scope_identifier, file_path
                ) VALUES (
                    (SELECT id FROM codebases WHERE name = %s),
                    %s, 'cyclomatic_complexity', %s, 'function', %s, %s
                )
            """, (
                repo_name, session_id,
                func_analysis["metrics"]["cyclomatic_complexity"],
                func_analysis["function"],
                func_analysis["file"]
            ))
        
        self.db_connection.commit()
        return str(session_id)
    
    async def generate_improvement_tasks(self, context: Dict[str, Any], codebase: Codebase) -> List[Dict]:
        """Generate improvement tasks based on analysis"""
        tasks = []
        
        # Dead code removal tasks
        for dead_code in context["dead_code"]:
            tasks.append({
                "type": "remove_dead_code",
                "target": dead_code["name"],
                "file": dead_code["file"],
                "description": f"Remove unused function {dead_code['name']}",
                "priority": "medium"
            })
        
        # Complexity reduction tasks
        for func_analysis in context["function_analysis"]:
            if func_analysis["metrics"]["cyclomatic_complexity"] > 10:
                tasks.append({
                    "type": "reduce_complexity",
                    "target": func_analysis["function"],
                    "file": func_analysis["file"],
                    "description": f"Refactor high-complexity function {func_analysis['function']}",
                    "priority": "high",
                    "current_complexity": func_analysis["metrics"]["cyclomatic_complexity"]
                })
        
        # Circular dependency fixes
        for circular_dep in context["dependency_graph"]["circular_dependencies"]:
            tasks.append({
                "type": "fix_circular_dependency",
                "source": circular_dep["source"],
                "target": circular_dep["target"],
                "description": f"Fix circular dependency between {circular_dep['source']} and {circular_dep['target']}",
                "priority": "high"
            })
        
        return tasks
    
    async def execute_improvement_task(self, task: Dict, repo_name: str) -> Dict:
        """Execute a single improvement task using Codegen SDK"""
        logger.info(f"Executing task: {task['description']}")
        
        # Build improvement prompt based on task type
        prompt = self.build_improvement_prompt(task, repo_name)
        
        try:
            # Use Codegen SDK to implement the improvement
            agent_task = self.codegen_agent.run(prompt=prompt)
            
            # Wait for completion with timeout
            timeout_count = 0
            while agent_task.status not in ["completed", "failed"] and timeout_count < 60:
                await asyncio.sleep(5)
                agent_task.refresh()
                timeout_count += 1
            
            return {
                "task": task,
                "result": agent_task.result if agent_task.status == "completed" else None,
                "status": agent_task.status,
                "execution_time": timeout_count * 5
            }
            
        except Exception as e:
            logger.error(f"Error executing task: {str(e)}")
            return {
                "task": task,
                "error": str(e),
                "status": "failed"
            }
    
    def build_improvement_prompt(self, task: Dict, repo_name: str) -> str:
        """Build a detailed prompt for the Codegen agent"""
        base_prompt = f"Working on repository: {repo_name}\n\n"
        
        if task["type"] == "remove_dead_code":
            return base_prompt + f"""
            Task: Remove dead code
            
            Please remove the unused function '{task['target']}' from file '{task['file']}'.
            This function has no callers and can be safely removed.
            
            Steps:
            1. Locate the function in the specified file
            2. Verify it has no callers
            3. Remove the function definition
            4. Update any imports if necessary
            5. Run tests to ensure nothing breaks
            """
        
        elif task["type"] == "reduce_complexity":
            return base_prompt + f"""
            Task: Reduce function complexity
            
            Please refactor the function '{task['target']}' in file '{task['file']}'.
            Current cyclomatic complexity: {task.get('current_complexity', 'unknown')}
            Target: Reduce complexity to under 10
            
            Suggested approaches:
            1. Extract smaller functions from complex logic
            2. Simplify conditional statements
            3. Use early returns to reduce nesting
            4. Consider using design patterns if appropriate
            5. Ensure all tests still pass
            """
        
        elif task["type"] == "fix_circular_dependency":
            return base_prompt + f"""
            Task: Fix circular dependency
            
            Please fix the circular dependency between '{task['source']}' and '{task['target']}'.
            
            Suggested approaches:
            1. Extract common functionality to a separate module
            2. Use dependency injection
            3. Reorganize the code structure
            4. Consider using interfaces or abstract classes
            5. Ensure all functionality is preserved
            """
        
        return base_prompt + f"Please implement: {task['description']}"
    
    async def create_improvement_pr(self, improvements: List[Dict], repo_name: str) -> Dict:
        """Create a PR with all the improvements"""
        successful_improvements = [imp for imp in improvements if imp["status"] == "completed"]
        
        if not successful_improvements:
            return {"message": "No successful improvements to create PR for"}
        
        # Build PR description
        pr_title = f"🤖 Automated Code Improvements - {datetime.now().strftime('%Y-%m-%d')}"
        pr_description = f"""
# Automated Code Improvements

This PR contains automated improvements generated by the Self-Evolving CI/CD system.

## Improvements Made:

"""
        
        for improvement in successful_improvements:
            task = improvement["task"]
            pr_description += f"- **{task['type'].replace('_', ' ').title()}**: {task['description']}\n"
        
        pr_description += f"""

## Analysis Summary:
- Total improvements: {len(successful_improvements)}
- Execution time: {sum(imp.get('execution_time', 0) for imp in successful_improvements)} seconds

Generated by Self-Evolving CI/CD System 🚀
"""
        
        # Use Codegen SDK to create the PR
        pr_prompt = f"""
        Please create a pull request for repository {repo_name} with the following details:
        
        Title: {pr_title}
        Description: {pr_description}
        
        The changes have already been made to the codebase. Please create the PR to merge these improvements.
        """
        
        try:
            pr_task = self.codegen_agent.run(prompt=pr_prompt)
            
            # Wait for PR creation
            timeout_count = 0
            while pr_task.status not in ["completed", "failed"] and timeout_count < 30:
                await asyncio.sleep(5)
                pr_task.refresh()
                timeout_count += 1
            
            return {
                "status": pr_task.status,
                "result": pr_task.result,
                "title": pr_title,
                "improvements_count": len(successful_improvements)
            }
            
        except Exception as e:
            logger.error(f"Error creating PR: {str(e)}")
            return {
                "error": str(e),
                "status": "failed"
            }

# Example usage
async def main():
    """Example usage of the Self-Evolving CI/CD System"""
    
    # Configuration
    config = AnalysisConfig(
        org_id="your-org-id",
        token="your-codegen-token",
        db_connection_string="postgresql://user:pass@localhost/selfevolving",
        github_token="your-github-token",
        linear_token="your-linear-token",
        anthropic_api_key="your-anthropic-key"
    )
    
    # Initialize system
    system = SelfEvolvingCICDSystem(config)
    await system.initialize()
    
    # Analyze and improve a codebase
    result = await system.analyze_and_improve_codebase("fastapi/fastapi")
    
    print("Analysis and Improvement Results:")
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main())

