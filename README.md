# Self-Evolving CI/CD Software Development System

A comprehensive, AI-powered system that automatically analyzes, improves, and evolves codebases using advanced static analysis, machine learning, and automated code generation.

## 🚀 Overview

This system combines multiple cutting-edge technologies to create a self-evolving CI/CD pipeline:

- **Graph-Sitter**: Deep codebase analysis and understanding
- **Codegen SDK**: Automated code generation and improvement
- **AutoGenLib**: Enhanced code generation capabilities
- **Linear Integration**: Project management and task tracking
- **GitHub Integration**: Version control and PR management
- **Comprehensive Analytics**: Code quality metrics and insights

## 🏗️ Architecture

The system is built with a modular, layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  Linear & GitHub Dashboard | Chat Interface | Settings     │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│  Contexten Extensions | GitHub API | Linear API | Webhooks │
├─────────────────────────────────────────────────────────────┤
│                    Intelligence Layer                       │
│  Chat Agent | Code Agent | Analysis Engine | Decision AI   │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                            │
│  Tasks DB | Codebase DB | Prompts DB | Analytics DB       │
├─────────────────────────────────────────────────────────────┤
│                    Execution Layer                         │
│  Codegen SDK | Graph-Sitter | AutoGenLib | PR Generator   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

The system uses four main database schemas:

### 1. Tasks Management (`/database/schemas/tasks/`)
- Task tracking and decomposition
- Dependency management
- Complexity analysis
- Progress monitoring

### 2. Codebase Management (`/database/schemas/codebase/`)
- Repository tracking
- File and function analysis
- Import dependency mapping
- Analysis session management

### 3. Prompts Management (`/database/schemas/prompts/`)
- AI prompt templates and variables
- Execution history and metrics
- Performance optimization
- Feedback collection

### 4. Analytics (`/database/schemas/analytics/`)
- Comprehensive code metrics
- Dependency graph analysis
- Issue detection and tracking
- Performance and security analysis

## 🔧 Key Features

### Comprehensive Code Analysis
- **Cyclomatic Complexity**: Measure code complexity
- **Halstead Volume**: Analyze operator/operand complexity
- **Maintainability Index**: Overall code maintainability
- **Dead Code Detection**: Find unused functions and variables
- **Dependency Analysis**: Map code relationships and circular dependencies
- **Architecture Patterns**: Identify and validate design patterns

### Automated Improvements
- **Dead Code Removal**: Automatically remove unused code
- **Complexity Reduction**: Refactor high-complexity functions
- **Dependency Fixes**: Resolve circular dependencies
- **Code Optimization**: Performance and security improvements
- **Test Generation**: Automated test creation
- **Documentation**: Generate comprehensive documentation

### Self-Evolution Capabilities
- **Pattern Learning**: Learn from successful improvements
- **Adaptive Analysis**: Adjust analysis based on project type
- **Threshold Optimization**: Self-tune complexity thresholds
- **Feedback Integration**: Improve based on PR acceptance rates

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Node.js 16+ (for dashboard)
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd self-evolving-cicd
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up the database**
```bash
# Create database
createdb selfevolving_cicd

# Run migrations
psql selfevolving_cicd < database/schemas/tasks/models.sql
psql selfevolving_cicd < database/schemas/codebase/models.sql
psql selfevolving_cicd < database/schemas/prompts/models.sql
psql selfevolving_cicd < database/schemas/analytics/models.sql
```

4. **Configure environment variables**
```bash
export CODEGEN_ORG_ID="your-org-id"
export CODEGEN_TOKEN="your-token"
export DATABASE_URL="postgresql://user:pass@localhost/selfevolving_cicd"
export GITHUB_TOKEN="your-github-token"
export LINEAR_TOKEN="your-linear-token"
export ANTHROPIC_API_KEY="your-anthropic-key"
```

### Basic Usage

```python
from examples.self_evolving_system import SelfEvolvingCICDSystem, AnalysisConfig

# Configure the system
config = AnalysisConfig(
    org_id="your-org-id",
    token="your-codegen-token",
    db_connection_string="postgresql://user:pass@localhost/selfevolving_cicd",
    github_token="your-github-token",
    linear_token="your-linear-token",
    anthropic_api_key="your-anthropic-key"
)

# Initialize and run analysis
system = SelfEvolvingCICDSystem(config)
await system.initialize()

# Analyze and improve a codebase
result = await system.analyze_and_improve_codebase("owner/repository")
print(f"Analysis completed with {len(result['improvements'])} improvements")
```

## 📈 Code Analysis Example

The system provides comprehensive analysis using Graph-Sitter:

```python
from graph_sitter import Codebase

# Load codebase
codebase = Codebase.from_repo('fastapi/fastapi')

# Find the most called function
most_called = max(codebase.functions, key=lambda f: len(f.call_sites))
print(f"Most called function: {most_called.name}")
print(f"Called {len(most_called.call_sites)} times")

# Find dead code
unused = [f for f in codebase.functions if len(f.call_sites) == 0]
print(f"Found {len(unused)} unused functions")

# Find recursive functions
recursive = [f for f in codebase.functions 
            if any(call.name == f.name for call in f.function_calls)]
print(f"Found {len(recursive)} recursive functions")

# Get function context
function = codebase.get_function("process_data")
context = {
    "call_sites": function.call_sites,
    "dependencies": function.dependencies,
    "parent": function.parent,
    "docstring": function.docstring,
}

# Use Codegen SDK for improvements
from codegen import Agent
agent = Agent(org_id="...", token="...")
task = agent.run(prompt="Analyze and improve this codebase for better maintainability")
```

## 🔄 Self-Evolution Process

The system continuously improves through:

1. **Analysis**: Deep codebase analysis using Graph-Sitter
2. **Issue Detection**: Identify code quality issues and technical debt
3. **Improvement Generation**: Create targeted improvement tasks
4. **Execution**: Implement improvements using Codegen SDK
5. **Validation**: Test and validate changes
6. **Learning**: Learn from outcomes to improve future analysis

## 📊 Metrics and Analytics

The system tracks comprehensive metrics:

- **Code Quality**: Complexity, maintainability, technical debt
- **Performance**: Execution time, resource usage
- **Security**: Vulnerability detection and fixes
- **Architecture**: Design pattern compliance
- **Test Coverage**: Automated test generation and coverage
- **Documentation**: API documentation completeness

## 🔧 SQL Operations

The system includes comprehensive SQL operations for each schema:

### Tasks Operations
- `add-task.sql`: Create new tasks
- `add-subtask.sql`: Add subtasks to existing tasks
- `analyze-task-complexity.sql`: Calculate task complexity
- `find-next-task.sql`: Find optimal next task to work on

### Codebase Operations
- `add-codebase.sql`: Register new codebases
- `update-codebase.sql`: Update codebase information
- `remove-codebase.sql`: Remove codebases

### Analytics Operations
- `analyze-codebase.sql`: Comprehensive codebase analysis
- `list-analysis-results.sql`: Query analysis results

### Prompts Operations
- `add-prompt.sql`: Create new AI prompts
- `expand-prompt-full.sql`: Get complete prompt context

## 🚀 Advanced Features

### Dashboard Integration
- **Project Selection**: Browse and select from 150+ GitHub projects
- **Real-time Updates**: Live PR and branch status
- **Requirements Management**: Edit REQUIREMENTS.md files
- **Webhook Integration**: Automatic updates from GitHub events

### AI-Powered Chat
- **Conversational Interface**: Natural language codebase interaction
- **Context-Aware**: Uses full codebase context for responses
- **Improvement Suggestions**: AI-generated improvement recommendations

### Automated PR Generation
- **Smart Improvements**: Targeted code improvements
- **Comprehensive Testing**: Automated test validation
- **Detailed Descriptions**: Clear PR descriptions with impact analysis

## 🔒 Security and Safety

- **Automated Testing**: All changes validated with test suites
- **Human Review**: Configurable approval workflows
- **Rollback Mechanisms**: Quick reversion of problematic changes
- **Access Controls**: Role-based permissions
- **Audit Logging**: Complete audit trail

## 📚 Documentation

- [Architecture Documentation](docs/SELF_EVOLVING_CICD_ARCHITECTURE.md)
- [Database Schema](database/schemas/)
- [API Reference](docs/api/)
- [Examples](examples/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Graph-Sitter**: For powerful code analysis capabilities
- **Codegen**: For automated code generation and improvement
- **AutoGenLib**: For enhanced code generation features
- **Linear**: For project management integration
- **GitHub**: For version control and collaboration

---

Built with ❤️ for the future of automated software development

