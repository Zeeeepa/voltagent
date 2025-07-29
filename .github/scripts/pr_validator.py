#!/usr/bin/env python3
"""
Automated PR Validator for TypeScript Projects
This script validates PR changes to ensure:
- TypeScript/JavaScript files are properly structured
- Dependencies are valid and resolvable
- No broken references or missing imports
- Code structure integrity is maintained
- ESLint and Prettier rules are followed
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class ValidationSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    severity: ValidationSeverity
    category: str
    message: str
    file_path: str
    line_number: Optional[int] = None
    symbol_name: Optional[str] = None
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    is_valid: bool
    issues: List[ValidationIssue]
    summary: Dict[str, int]

    def add_issue(self, issue: ValidationIssue):
        self.issues.append(issue)
        if issue.severity == ValidationSeverity.ERROR:
            self.is_valid = False

        # Update summary
        key = f"{issue.severity.value}s"
        self.summary[key] = self.summary.get(key, 0) + 1


class PRValidator:
    """Automated PR validator for TypeScript projects"""

    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.changed_files = []
        self.validation_result = ValidationResult(is_valid=True, issues=[], summary={})

    def validate_pr(self, pr_files: List[str] = None) -> ValidationResult:
        """Main validation entry point"""
        print("🔍 Starting PR validation...")

        try:
            # Get changed files
            self.changed_files = pr_files or self._get_changed_files()
            print(f"📝 Validating {len(self.changed_files)} changed files...")

            # Run validation checks
            self._validate_file_structure()
            self._validate_typescript_compilation()
            self._validate_eslint_rules()
            self._validate_prettier_formatting()
            self._validate_package_dependencies()
            self._validate_imports_and_exports()
            self._validate_test_coverage()
            self._validate_architectural_patterns()

            print(
                f"✅ Validation complete: {len(self.validation_result.issues)} issues found"
            )
            return self.validation_result

        except Exception as e:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="system",
                    message=f"Validation failed: {e}",
                    file_path="system",
                )
            )
            return self.validation_result

    def _get_changed_files(self) -> List[str]:
        """Get list of files changed in the PR"""
        try:
            # Try different git commands to get changed files
            commands = [
                ["git", "diff", "--name-only", "HEAD~1..HEAD"],
                ["git", "diff", "--name-only", "origin/main..HEAD"],
                ["git", "diff", "--name-only", "main..HEAD"],
                ["git", "diff", "--name-only", "--cached"],
                ["git", "ls-files", "--modified"],
            ]
            
            for cmd in commands:
                try:
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        cwd=self.repo_path,
                    )
                    if result.returncode == 0 and result.stdout.strip():
                        files = [f for f in result.stdout.strip().split("\\n") if f.strip()]
                        if files:
                            print(f"📁 Found {len(files)} changed files using: {' '.join(cmd)}")
                            return files
                except Exception:
                    continue
            
            # Fallback: analyze all TypeScript/JavaScript files
            print("⚠️ Could not detect changed files, analyzing common TS/JS files...")
            ts_files = []
            for pattern in ["src/**/*.ts", "src/**/*.js", "tests/**/*.ts", "**/*.test.ts"]:
                ts_files.extend(self.repo_path.glob(pattern))
            
            return [str(f.relative_to(self.repo_path)) for f in ts_files[:20]]
        
        except Exception as e:
            print(f"⚠️ Could not detect changed files: {e}")
            return []

    def _validate_file_structure(self):
        """Validate file structure and basic syntax"""
        print("📁 Validating file structure...")

        for file_path in self.changed_files:
            full_path = self.repo_path / file_path

            # Check if file exists
            if not full_path.exists():
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="file_structure",
                        message="File does not exist",
                        file_path=file_path,
                    )
                )
                continue

            # Check file extensions
            if file_path.endswith(('.ts', '.js', '.tsx', '.jsx')):
                self._validate_typescript_file(file_path, full_path)
            elif file_path.endswith('.json'):
                self._validate_json_file(file_path, full_path)

    def _validate_typescript_file(self, file_path: str, full_path: Path):
        """Validate TypeScript/JavaScript file"""
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Basic syntax checks
            if not content.strip():
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="empty_file",
                        message="File is empty",
                        file_path=file_path,
                    )
                )

            # Check for common issues
            lines = content.split('\\n')
            for i, line in enumerate(lines, 1):
                # Check for console.log in production code (not in tests)
                if 'console.log' in line and not any(test_dir in file_path for test_dir in ['test', 'spec', '__tests__']):
                    self.validation_result.add_issue(
                        ValidationIssue(
                            severity=ValidationSeverity.WARNING,
                            category="code_quality",
                            message="console.log found in production code",
                            file_path=file_path,
                            line_number=i,
                            suggestion="Use proper logging or remove console.log",
                        )
                    )

                # Check for TODO/FIXME comments
                if any(keyword in line.upper() for keyword in ['TODO', 'FIXME', 'HACK']):
                    self.validation_result.add_issue(
                        ValidationIssue(
                            severity=ValidationSeverity.INFO,
                            category="code_quality",
                            message=f"Found {line.strip()}",
                            file_path=file_path,
                            line_number=i,
                            suggestion="Consider addressing this comment before merging",
                        )
                    )

        except Exception as e:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="file_access",
                    message=f"Could not read file: {e}",
                    file_path=file_path,
                )
            )

    def _validate_json_file(self, file_path: str, full_path: Path):
        """Validate JSON file"""
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                json.load(f)
        except json.JSONDecodeError as e:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="json_syntax",
                    message=f"Invalid JSON: {e.msg}",
                    file_path=file_path,
                    line_number=e.lineno,
                )
            )

    def _validate_typescript_compilation(self):
        """Validate TypeScript compilation"""
        print("🔧 Validating TypeScript compilation...")

        if not (self.repo_path / "tsconfig.json").exists():
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="typescript",
                    message="tsconfig.json not found",
                    file_path="tsconfig.json",
                    suggestion="Add tsconfig.json for TypeScript configuration",
                )
            )
            return

        try:
            result = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                capture_output=True,
                text=True,
                cwd=self.repo_path,
            )

            if result.returncode != 0:
                # Parse TypeScript errors
                errors = result.stderr.strip().split('\\n')
                for error in errors:
                    if error.strip() and not error.startswith('Found'):
                        self.validation_result.add_issue(
                            ValidationIssue(
                                severity=ValidationSeverity.ERROR,
                                category="typescript_compilation",
                                message=f"TypeScript compilation error: {error}",
                                file_path="typescript",
                            )
                        )

        except FileNotFoundError:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="typescript",
                    message="TypeScript compiler not found (npx tsc)",
                    file_path="system",
                    suggestion="Install TypeScript: npm install -g typescript",
                )
            )

    def _validate_eslint_rules(self):
        """Validate ESLint rules"""
        print("📏 Validating ESLint rules...")

        if not any((self.repo_path / config).exists() for config in [".eslintrc.js", ".eslintrc.json", ".eslintrc.yml"]):
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="linting",
                    message="ESLint configuration not found",
                    file_path="eslint",
                    suggestion="Add ESLint configuration for code quality",
                )
            )
            return

        try:
            # Run ESLint on changed TypeScript/JavaScript files
            ts_files = [f for f in self.changed_files if f.endswith(('.ts', '.js', '.tsx', '.jsx'))]
            if not ts_files:
                return

            result = subprocess.run(
                ["npx", "eslint", "--format", "json"] + ts_files,
                capture_output=True,
                text=True,
                cwd=self.repo_path,
            )

            if result.stdout:
                try:
                    eslint_results = json.loads(result.stdout)
                    for file_result in eslint_results:
                        for message in file_result.get('messages', []):
                            severity = ValidationSeverity.ERROR if message['severity'] == 2 else ValidationSeverity.WARNING
                            self.validation_result.add_issue(
                                ValidationIssue(
                                    severity=severity,
                                    category="eslint",
                                    message=f"ESLint: {message['message']} ({message['ruleId']})",
                                    file_path=file_result['filePath'].replace(str(self.repo_path) + '/', ''),
                                    line_number=message.get('line'),
                                )
                            )
                except json.JSONDecodeError:
                    pass

        except FileNotFoundError:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    category="linting",
                    message="ESLint not found (npx eslint)",
                    file_path="system",
                    suggestion="Install ESLint: npm install eslint",
                )
            )

    def _validate_prettier_formatting(self):
        """Validate Prettier formatting"""
        print("💅 Validating Prettier formatting...")

        if not any((self.repo_path / config).exists() for config in [".prettierrc", ".prettierrc.json", ".prettierrc.js"]):
            return

        try:
            ts_files = [f for f in self.changed_files if f.endswith(('.ts', '.js', '.tsx', '.jsx', '.json'))]
            if not ts_files:
                return

            result = subprocess.run(
                ["npx", "prettier", "--check"] + ts_files,
                capture_output=True,
                text=True,
                cwd=self.repo_path,
            )

            if result.returncode != 0:
                unformatted_files = result.stdout.strip().split('\\n')
                for file_path in unformatted_files:
                    if file_path.strip():
                        self.validation_result.add_issue(
                            ValidationIssue(
                                severity=ValidationSeverity.WARNING,
                                category="formatting",
                                message="File is not formatted according to Prettier rules",
                                file_path=file_path.replace(str(self.repo_path) + '/', ''),
                                suggestion="Run: npx prettier --write <file>",
                            )
                        )

        except FileNotFoundError:
            pass  # Prettier is optional

    def _validate_package_dependencies(self):
        """Validate package.json dependencies"""
        print("📦 Validating package dependencies...")

        package_json_path = self.repo_path / "package.json"
        if not package_json_path.exists():
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="dependencies",
                    message="package.json not found",
                    file_path="package.json",
                )
            )
            return

        try:
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)

            # Check for security vulnerabilities
            try:
                result = subprocess.run(
                    ["npm", "audit", "--audit-level", "moderate", "--json"],
                    capture_output=True,
                    text=True,
                    cwd=self.repo_path,
                )

                if result.returncode != 0 and result.stdout:
                    audit_data = json.loads(result.stdout)
                    if 'vulnerabilities' in audit_data:
                        for vuln_name, vuln_data in audit_data['vulnerabilities'].items():
                            severity = ValidationSeverity.ERROR if vuln_data['severity'] in ['high', 'critical'] else ValidationSeverity.WARNING
                            self.validation_result.add_issue(
                                ValidationIssue(
                                    severity=severity,
                                    category="security",
                                    message=f"Security vulnerability in {vuln_name}: {vuln_data['severity']}",
                                    file_path="package.json",
                                    suggestion="Run: npm audit fix",
                                )
                            )

            except (subprocess.SubprocessError, json.JSONDecodeError):
                pass

        except Exception as e:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="dependencies",
                    message=f"Could not validate dependencies: {e}",
                    file_path="package.json",
                )
            )

    def _validate_imports_and_exports(self):
        """Validate imports and exports in TypeScript files"""
        print("🔗 Validating imports and exports...")

        for file_path in self.changed_files:
            if not file_path.endswith(('.ts', '.js', '.tsx', '.jsx')):
                continue

            full_path = self.repo_path / file_path
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                lines = content.split('\\n')
                for i, line in enumerate(lines, 1):
                    line = line.strip()
                    
                    # Check for relative imports going too deep
                    if line.startswith('import') and '../../../' in line:
                        self.validation_result.add_issue(
                            ValidationIssue(
                                severity=ValidationSeverity.WARNING,
                                category="imports",
                                message="Deep relative import detected",
                                file_path=file_path,
                                line_number=i,
                                suggestion="Consider using absolute imports or barrel exports",
                            )
                        )

                    # Check for unused imports (basic check)
                    if line.startswith('import') and 'from' in line:
                        # Extract imported names (basic regex would be better)
                        import_part = line.split('from')[0].replace('import', '').strip()
                        if '{' in import_part and '}' in import_part:
                            imported_names = import_part.split('{')[1].split('}')[0].split(',')
                            for name in imported_names:
                                name = name.strip()
                                if name and name not in content[content.find(line) + len(line):]:
                                    self.validation_result.add_issue(
                                        ValidationIssue(
                                            severity=ValidationSeverity.INFO,
                                            category="unused_imports",
                                            message=f"Potentially unused import: {name}",
                                            file_path=file_path,
                                            line_number=i,
                                            suggestion="Remove unused import",
                                        )
                                    )

            except Exception:
                continue

    def _validate_test_coverage(self):
        """Validate test coverage for changed files"""
        print("🧪 Validating test coverage...")

        # Check if test files exist for source files
        for file_path in self.changed_files:
            if file_path.startswith('src/') and file_path.endswith(('.ts', '.js')):
                # Look for corresponding test file
                test_patterns = [
                    file_path.replace('src/', 'tests/').replace('.ts', '.test.ts'),
                    file_path.replace('src/', 'tests/').replace('.js', '.test.js'),
                    file_path.replace('.ts', '.test.ts'),
                    file_path.replace('.js', '.test.js'),
                    file_path.replace('.ts', '.spec.ts'),
                    file_path.replace('.js', '.spec.js'),
                ]

                has_test = any((self.repo_path / pattern).exists() for pattern in test_patterns)
                if not has_test:
                    self.validation_result.add_issue(
                        ValidationIssue(
                            severity=ValidationSeverity.INFO,
                            category="test_coverage",
                            message="No test file found for source file",
                            file_path=file_path,
                            suggestion="Consider adding tests for new functionality",
                        )
                    )

    def _validate_architectural_patterns(self):
        """Validate architectural patterns and best practices"""
        print("🏛️ Validating architectural patterns...")

        # Check for proper file organization
        for file_path in self.changed_files:
            if file_path.endswith(('.ts', '.js')):
                # Check for deeply nested files
                parts = file_path.split('/')
                if len(parts) > 4:
                    self.validation_result.add_issue(
                        ValidationIssue(
                            severity=ValidationSeverity.INFO,
                            category="architecture",
                            message=f"File is deeply nested ({len(parts)} levels)",
                            file_path=file_path,
                            suggestion="Consider flattening the directory structure",
                        )
                    )

                # Check for proper naming conventions
                filename = Path(file_path).name
                if not filename.islower() and '-' not in filename and '_' not in filename:
                    if not filename[0].isupper():  # Allow PascalCase for components
                        self.validation_result.add_issue(
                            ValidationIssue(
                                severity=ValidationSeverity.INFO,
                                category="naming",
                                message="File name should follow kebab-case or camelCase convention",
                                file_path=file_path,
                                suggestion="Use kebab-case for file names",
                            )
                        )


def generate_validation_report(result: ValidationResult) -> str:
    """Generate a comprehensive validation report"""
    report = f"""
# 🔍 PR Validation Report

## Summary
- **Status**: {"✅ PASSED" if result.is_valid else "❌ FAILED"}
- **Total Issues**: {len(result.issues)}
- **Errors**: {result.summary.get("errors", 0)}
- **Warnings**: {result.summary.get("warnings", 0)}
- **Info**: {result.summary.get("infos", 0)}

## Issues by Category
"""

    # Group issues by category
    categories = {}
    for issue in result.issues:
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
                report += f"  💡 *Suggestion: {issue.suggestion}*\\n"

    if not result.issues:
        report += "\\n🎉 **No issues found!** Your code looks great!\\n"

    return report


def main():
    """Main validation function for CI/CD"""
    print("🚀 Automated PR Validator for TypeScript Projects")
    print("=" * 60)

    # Get environment variables
    repo_path = os.getenv("GITHUB_WORKSPACE", ".")
    pr_number = os.getenv("GITHUB_PR_NUMBER")

    # Initialize validator
    validator = PRValidator(repo_path)

    # Run validation
    result = validator.validate_pr()

    # Generate report
    report = generate_validation_report(result)
    print(report)

    # Save report for CI/CD
    with open("pr_validation_report.md", "w") as f:
        f.write(report)

    # Save JSON for programmatic access
    with open("pr_validation_result.json", "w") as f:
        json.dump(
            {
                "is_valid": result.is_valid,
                "summary": result.summary,
                "issues": [asdict(issue) for issue in result.issues],
            },
            f,
            indent=2,
            default=str,
        )

    # Exit with appropriate code
    if result.is_valid:
        print("\\n✅ PR validation passed!")
        sys.exit(0)
    else:
        print(
            f"\\n❌ PR validation failed with {result.summary.get('errors', 0)} errors"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

