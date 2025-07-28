#!/usr/bin/env python3
"""
Intelligent PR Validator with Codegen Integration
This script combines structural validation with Codegen AI analysis to provide
comprehensive PR validation that checks both technical correctness and code
quality/architecture alignment for TypeScript projects.
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

# Import the base validator
from pr_validator import PRValidator, ValidationResult, ValidationSeverity

# Codegen imports
try:
    from codegen.agents.agent import Agent
    CODEGEN_AVAILABLE = True
except ImportError:
    print("⚠️ Codegen not available. Install with: pip install codegen")
    CODEGEN_AVAILABLE = False


@dataclass
class IntelligentValidationResult:
    structural_validation: ValidationResult
    ai_validation: Optional[Dict] = None
    combined_score: float = 0.0
    recommendations: List[str] = None

    def __post_init__(self):
        if self.recommendations is None:
            self.recommendations = []


class IntelligentPRValidator:
    """Enhanced PR validator with AI-powered analysis for TypeScript projects"""

    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.base_validator = PRValidator(repo_path)

        # Codegen configuration
        self.org_id = os.getenv("CODEGEN_ORG_ID")
        self.api_token = os.getenv("CODEGEN_API_TOKEN")
        self.codegen_agent = None

        if CODEGEN_AVAILABLE and self.org_id and self.api_token:
            try:
                self.codegen_agent = Agent(org_id=self.org_id, token=self.api_token)
                print("✅ Codegen agent initialized")
            except Exception as e:
                print(f"⚠️ Could not initialize Codegen agent: {e}")

    def validate_pr_intelligent(
        self, pr_files: List[str] = None
    ) -> IntelligentValidationResult:
        """Perform intelligent PR validation combining structural and AI analysis"""
        print("🧠 Starting intelligent PR validation...")

        # Step 1: Structural validation
        print("🔍 Phase 1: Structural validation...")
        structural_result = self.base_validator.validate_pr(pr_files)

        # Step 2: AI-powered validation using Codegen
        ai_result = None
        if self.codegen_agent:
            print("🤖 Phase 2: AI-powered validation...")
            ai_result = self._perform_ai_validation(pr_files, structural_result)
        else:
            print("⚠️ Skipping AI validation (Codegen not available)")

        # Step 3: Combine results and generate recommendations
        print("🎯 Phase 3: Generating recommendations...")
        combined_result = self._combine_results(structural_result, ai_result)

        return combined_result

    def _perform_ai_validation(
        self, pr_files: List[str], structural_result: ValidationResult
    ) -> Dict:
        """Perform AI-powered validation using Codegen"""
        try:
            # Generate context for AI analysis
            context = self._generate_ai_context(pr_files, structural_result)

            # Create AI validation prompt
            prompt = self._create_ai_validation_prompt(context, structural_result)

            # Run Codegen analysis
            print("📤 Sending validation request to Codegen...")
            task = self.codegen_agent.run(prompt=prompt)

            # Wait for completion
            max_attempts = 30  # 5 minutes
            attempt = 0

            while attempt < max_attempts:
                task.refresh()

                if task.status == "completed":
                    print("✅ AI validation completed")
                    return {
                        "status": "completed",
                        "result": task.result,
                        "analysis": self._parse_ai_result(task.result),
                    }
                elif task.status == "failed":
                    print("❌ AI validation failed")
                    return {
                        "status": "failed",
                        "error": getattr(task, "error", "Unknown error"),
                    }

                attempt += 1
                time.sleep(10)

            print("⏰ AI validation timed out")
            return {"status": "timeout"}

        except Exception as e:
            print(f"❌ Error in AI validation: {e}")
            return {"status": "error", "error": str(e)}

    def _generate_ai_context(
        self, pr_files: List[str], structural_result: ValidationResult
    ) -> Dict:
        """Generate context for AI analysis"""
        context = {
            "changed_files": pr_files or [],
            "structural_issues": len(structural_result.issues),
            "error_count": structural_result.summary.get("errors", 0),
            "warning_count": structural_result.summary.get("warnings", 0),
            "file_analysis": {},
            "project_type": "typescript",
            "framework_detected": self._detect_framework(),
        }

        # Analyze changed files
        for file_path in context["changed_files"]:
            full_path = self.repo_path / file_path
            if full_path.exists() and file_path.endswith(('.ts', '.js', '.tsx', '.jsx')):
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    context["file_analysis"][file_path] = {
                        "lines_of_code": len(content.split('\\n')),
                        "has_exports": 'export' in content,
                        "has_imports": 'import' in content,
                        "has_types": ': ' in content or 'interface' in content or 'type ' in content,
                        "has_tests": any(keyword in content for keyword in ['describe', 'it(', 'test(']),
                        "complexity_indicators": {
                            "functions": content.count('function ') + content.count('=>'),
                            "classes": content.count('class '),
                            "interfaces": content.count('interface '),
                            "async_functions": content.count('async '),
                        }
                    }
                except Exception:
                    context["file_analysis"][file_path] = {"error": "Could not analyze file"}

        return context

    def _detect_framework(self) -> str:
        """Detect the framework being used"""
        package_json_path = self.repo_path / "package.json"
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                
                dependencies = {**package_data.get('dependencies', {}), **package_data.get('devDependencies', {})}
                
                if 'react' in dependencies:
                    return 'React'
                elif 'vue' in dependencies:
                    return 'Vue'
                elif 'angular' in dependencies or '@angular/core' in dependencies:
                    return 'Angular'
                elif 'express' in dependencies:
                    return 'Express/Node.js'
                elif 'next' in dependencies:
                    return 'Next.js'
                elif 'nuxt' in dependencies:
                    return 'Nuxt.js'
                else:
                    return 'TypeScript/JavaScript'
            except Exception:
                pass
        
        return 'Unknown'

    def _create_ai_validation_prompt(
        self, context: Dict, structural_result: ValidationResult
    ) -> str:
        """Create prompt for AI validation"""

        # Format structural issues
        issues_summary = ""
        if structural_result.issues:
            issues_by_category = {}
            for issue in structural_result.issues[:10]:  # Top 10 issues
                category = issue.category
                if category not in issues_by_category:
                    issues_by_category[category] = []
                issues_by_category[category].append(issue)

            for category, issues in issues_by_category.items():
                issues_summary += f"\\n### {category.replace('_', ' ').title()}\\n"
                for issue in issues:
                    issues_summary += f"- {issue.severity.value.upper()}: {issue.message} ({issue.file_path})\\n"

        prompt = f"""
🔍 Intelligent TypeScript/JavaScript PR Validation Request
Please perform a comprehensive analysis of this PR's code changes and provide validation insights.

📊 Project Context
- **Project Type**: {context['project_type']}
- **Framework**: {context['framework_detected']}
- **Changed Files**: {len(context['changed_files'])}
- **Structural Issues**: {context['structural_issues']}
- **Errors**: {context['error_count']}
- **Warnings**: {context['warning_count']}

📁 Changed Files Analysis
{chr(10).join(f"- {file}" for file in context["changed_files"])}

📈 File Analysis Details
{json.dumps(context["file_analysis"], indent=2)}

⚠️ Structural Issues Detected
{issues_summary}

🎯 Validation Tasks
Please analyze the PR changes and provide:

1. **TypeScript/JavaScript Code Quality Assessment**
   - Evaluate type safety and TypeScript usage
   - Identify potential runtime errors
   - Assess code maintainability and readability
   - Check for proper error handling

2. **Framework-Specific Best Practices**
   - Analyze adherence to {context['framework_detected']} best practices
   - Check for proper component/module structure
   - Evaluate state management patterns
   - Assess performance implications

3. **Security & Performance Review**
   - Identify potential security vulnerabilities
   - Check for XSS, injection, or other web security issues
   - Assess bundle size and performance impact
   - Review async/await usage and error handling

4. **Testing & Documentation**
   - Evaluate test coverage for changes
   - Check if documentation needs updates
   - Identify missing test scenarios
   - Assess test quality and completeness

5. **Architecture & Design Patterns**
   - Analyze how changes affect overall architecture
   - Check for proper separation of concerns
   - Evaluate dependency management
   - Assess code reusability and modularity

📝 Required Output Format
Please provide your analysis in this JSON format:

{{
  "overall_score": 85,
  "validation_status": "PASSED_WITH_RECOMMENDATIONS",
  "categories": {{
    "code_quality": {{"score": 90, "issues": ["issue1", "issue2"]}},
    "typescript_usage": {{"score": 85, "issues": []}},
    "framework_practices": {{"score": 88, "issues": []}},
    "security": {{"score": 95, "issues": []}},
    "performance": {{"score": 80, "issues": ["potential issue"]}},
    "testing": {{"score": 70, "issues": ["missing tests"]}},
    "architecture": {{"score": 85, "issues": []}}
  }},
  "recommendations": [
    "Add unit tests for new functions",
    "Consider using TypeScript strict mode",
    "Update documentation for API changes"
  ],
  "critical_issues": [],
  "approval_recommendation": "APPROVE_WITH_SUGGESTIONS"
}}

🎯 Focus Areas
Based on the structural analysis, please pay special attention to:
- TypeScript type safety and proper typing
- {context['framework_detected']} specific patterns and conventions
- Security implications of the changes
- Performance impact and optimization opportunities
- Test coverage and quality

Provide specific, actionable feedback that helps improve the PR quality while considering the TypeScript/JavaScript ecosystem best practices.
"""

        return prompt

    def _parse_ai_result(self, ai_result: str) -> Dict:
        """Parse AI validation result"""
        try:
            # Try to extract JSON from the result
            import re

            json_match = re.search(r"```json\\s*(\\{.*?\\})\\s*```", ai_result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))

            # Fallback: try to parse the entire result as JSON
            return json.loads(ai_result)

        except Exception as e:
            print(f"⚠️ Could not parse AI result as JSON: {e}")
            return {
                "overall_score": 50,
                "validation_status": "ANALYSIS_ERROR",
                "raw_result": ai_result,
                "recommendations": ["Could not parse AI analysis result"],
            }

    def _combine_results(
        self, structural_result: ValidationResult, ai_result: Optional[Dict]
    ) -> IntelligentValidationResult:
        """Combine structural and AI validation results"""
        combined = IntelligentValidationResult(
            structural_validation=structural_result,
            ai_validation=ai_result
        )

        # Calculate combined score
        structural_score = self._calculate_structural_score(structural_result)
        ai_score = 50  # Default if AI not available

        if ai_result and ai_result.get("status") == "completed":
            analysis = ai_result.get("analysis", {})
            ai_score = analysis.get("overall_score", 50)

            # Extract recommendations
            if "recommendations" in analysis:
                combined.recommendations.extend(analysis["recommendations"])

        # Weight: 60% structural, 40% AI (if available)
        if ai_result and ai_result.get("status") == "completed":
            combined.combined_score = (structural_score * 0.6) + (ai_score * 0.4)
        else:
            combined.combined_score = structural_score

        # Add structural recommendations
        if structural_result.summary.get("errors", 0) > 0:
            combined.recommendations.append("Fix all structural errors before merging")

        if structural_result.summary.get("warnings", 0) > 5:
            combined.recommendations.append("Consider addressing structural warnings")

        # Add TypeScript-specific recommendations
        if not any("TypeScript" in rec for rec in combined.recommendations):
            combined.recommendations.append("Ensure proper TypeScript typing throughout the codebase")

        return combined

    def _calculate_structural_score(self, result: ValidationResult) -> float:
        """Calculate score based on structural validation"""
        if not result.issues:
            return 100.0

        error_count = result.summary.get("errors", 0)
        warning_count = result.summary.get("warnings", 0)
        info_count = result.summary.get("infos", 0)

        # Scoring: Start at 100, deduct points for issues
        score = 100.0
        score -= error_count * 20  # 20 points per error
        score -= warning_count * 5  # 5 points per warning
        score -= info_count * 1    # 1 point per info

        return max(0.0, score)


def generate_intelligent_report(result: IntelligentValidationResult) -> str:
    """Generate comprehensive intelligent validation report"""

    # Determine overall status
    if result.combined_score >= 90:
        status_icon = "✅"
        status_text = "EXCELLENT"
    elif result.combined_score >= 75:
        status_icon = "🟢"
        status_text = "GOOD"
    elif result.combined_score >= 60:
        status_icon = "🟡"
        status_text = "NEEDS IMPROVEMENT"
    else:
        status_icon = "🔴"
        status_text = "REQUIRES FIXES"

    report = f"""
# 🧠 Intelligent TypeScript PR Validation Report

{status_icon} **Overall Assessment**: {status_text}
**Combined Score**: {result.combined_score:.1f}/100

## 📊 Validation Summary

### 🔍 Structural Analysis
- **Status**: {"✅ PASSED" if result.structural_validation.is_valid else "❌ FAILED"}
- **Issues Found**: {len(result.structural_validation.issues)}
- **Errors**: {result.structural_validation.summary.get("errors", 0)}
- **Warnings**: {result.structural_validation.summary.get("warnings", 0)}
- **Info**: {result.structural_validation.summary.get("infos", 0)}

### 🤖 AI Analysis
"""

    if result.ai_validation:
        if result.ai_validation.get("status") == "completed":
            analysis = result.ai_validation.get("analysis", {})
            report += f"""- **Status**: ✅ COMPLETED
- **AI Score**: {analysis.get("overall_score", "N/A")}/100
- **Validation Status**: {analysis.get("validation_status", "Unknown")}
- **Approval Recommendation**: {analysis.get("approval_recommendation", "Unknown")}
"""

            # Add category scores if available
            if "categories" in analysis:
                report += "\\n#### Category Scores\\n"
                for category, data in analysis["categories"].items():
                    score = data.get("score", 0)
                    issues_count = len(data.get("issues", []))
                    report += f"- **{category.replace('_', ' ').title()}**: {score}/100"
                    if issues_count > 0:
                        report += f" ({issues_count} issues)"
                    report += "\\n"
        else:
            status = result.ai_validation.get("status", "unknown")
            report += f"- **Status**: ⚠️ {status.upper()}\\n"
            if "error" in result.ai_validation:
                report += f"- **Error**: {result.ai_validation['error']}\\n"
    else:
        report += "- **Status**: ⚠️ NOT AVAILABLE\\n"

    # Add recommendations
    if result.recommendations:
        report += "\\n## 💡 Recommendations\\n"
        for i, rec in enumerate(result.recommendations, 1):
            report += f"{i}. {rec}\\n"

    # Add detailed structural issues
    if result.structural_validation.issues:
        report += "\\n## 🔍 Detailed Issues\\n"

        # Group by category
        categories = {}
        for issue in result.structural_validation.issues:
            if issue.category not in categories:
                categories[issue.category] = []
            categories[issue.category].append(issue)

        for category, issues in categories.items():
            report += f"\\n### {category.replace('_', ' ').title()}\\n"
            for issue in issues:
                severity_icon = {
                    ValidationSeverity.ERROR: "❌",
                    ValidationSeverity.WARNING: "⚠️",
                    ValidationSeverity.INFO: "ℹ️",
                }[issue.severity]

                report += f"- {severity_icon} **{issue.file_path}**"
                if issue.line_number:
                    report += f":{issue.line_number}"
                if issue.symbol_name:
                    report += f" ({issue.symbol_name})"
                report += f": {issue.message}\\n"

                if issue.suggestion:
                    report += f"  💡 *{issue.suggestion}*\\n"

    # Add AI detailed analysis if available
    if (
        result.ai_validation
        and result.ai_validation.get("status") == "completed"
        and "raw_result" in result.ai_validation.get("analysis", {})
    ):
        report += "\\n## 🤖 AI Analysis Details\\n"
        report += result.ai_validation["analysis"]["raw_result"]

    report += f"\\n---\\n*Report generated at: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}*"

    return report


def main():
    """Main function for intelligent PR validation"""
    print("🧠 Intelligent TypeScript PR Validator with AI Integration")
    print("=" * 70)

    # Get environment variables
    repo_path = os.getenv("GITHUB_WORKSPACE", ".")
    pr_number = os.getenv("GITHUB_PR_NUMBER")

    # Check for Codegen credentials
    if not os.getenv("CODEGEN_ORG_ID") or not os.getenv("CODEGEN_API_TOKEN"):
        print("⚠️ Codegen credentials not found. Running structural validation only.")

    # Initialize intelligent validator
    validator = IntelligentPRValidator(repo_path)

    # Run intelligent validation
    result = validator.validate_pr_intelligent()

    # Generate report
    report = generate_intelligent_report(result)
    print(report)

    # Save reports
    with open("intelligent_validation_report.md", "w") as f:
        f.write(report)

    with open("intelligent_validation_result.json", "w") as f:
        json.dump(
            {
                "combined_score": result.combined_score,
                "is_valid": result.structural_validation.is_valid,
                "structural_summary": result.structural_validation.summary,
                "ai_status": result.ai_validation.get("status")
                if result.ai_validation
                else None,
                "recommendations": result.recommendations,
                "issues": [
                    asdict(issue) for issue in result.structural_validation.issues
                ],
            },
            f,
            indent=2,
            default=str,
        )

    # Determine exit code based on combined score
    if result.combined_score >= 75:
        print(
            f"\\n✅ Intelligent validation passed! Score: {result.combined_score:.1f}/100"
        )
        sys.exit(0)
    else:
        print(
            f"\\n❌ Intelligent validation failed. Score: {result.combined_score:.1f}/100"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

