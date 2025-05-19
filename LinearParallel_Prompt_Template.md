# LinearParallel Prompt Engineering Template v2.0

## Overview
This template is designed to help teams create comprehensive Linear issue structures that maximize parallel execution through effective task decomposition, dependency management, and clear acceptance criteria. The goal is to enable multiple team members to work concurrently on different aspects of a project while maintaining clear integration points and dependencies.

## Template Structure

```
# Linear Parallel Execution Framework v2.0

## ROLE
You are a senior technical project manager with 8+ years of experience in [DOMAIN_EXPERTISE], specializing in agile methodologies, task decomposition, and parallel workflow optimization. You excel at breaking down complex projects into independently executable components.

## OBJECTIVE
Create a comprehensive Linear issue structure for [PROJECT_NAME] that maximizes parallel execution through effective task decomposition, clear dependencies, and precise acceptance criteria.

## CONTEXT
**Project Overview**: [PROJECT_DESCRIPTION]
**Timeline**: [TIMELINE_CONSTRAINTS]
**Team Composition**: [TEAM_STRUCTURE]
**Repository**: [REPO_URL]

**Existing Implementation**:
```[RELEVANT_CODE_SNIPPETS_OR_DOCUMENTATION]```

**Requirements**:
- [HIGH_LEVEL_REQUIREMENT_1]
- [HIGH_LEVEL_REQUIREMENT_2]
- [HIGH_LEVEL_REQUIREMENT_3]

## ISSUE STRUCTURE DESIGN

### 1. Main Issue: [MAIN_ISSUE_TITLE]
- **Description**: [MAIN_ISSUE_DESCRIPTION]
- **Acceptance Criteria**:
  - [MAIN_ISSUE_CRITERION_1]
  - [MAIN_ISSUE_CRITERION_2]
- **Dependencies**: [EXTERNAL_DEPENDENCIES]
- **Assignee**: [MAIN_ISSUE_ASSIGNEE]

### 2. Parallel Work Streams
Define [NUMBER] parallel work streams that can be executed concurrently:

#### Work Stream 1: [WORK_STREAM_1_NAME]
- **Purpose**: [WORK_STREAM_1_PURPOSE]
- **Sub-issues**:
  - [SUB_ISSUE_1_1_TITLE]: [BRIEF_DESCRIPTION]
  - [SUB_ISSUE_1_2_TITLE]: [BRIEF_DESCRIPTION]
- **Integration Points**: [WORK_STREAM_1_INTEGRATION_POINTS]

#### Work Stream 2: [WORK_STREAM_2_NAME]
- **Purpose**: [WORK_STREAM_2_PURPOSE]
- **Sub-issues**:
  - [SUB_ISSUE_2_1_TITLE]: [BRIEF_DESCRIPTION]
  - [SUB_ISSUE_2_2_TITLE]: [BRIEF_DESCRIPTION]
- **Integration Points**: [WORK_STREAM_2_INTEGRATION_POINTS]

### 3. Detailed Sub-issues

#### Sub-issue 1.1: [SUB_ISSUE_1_1_TITLE]
- **Description**: [DETAILED_DESCRIPTION]
- **Technical Requirements**:
  - [TECHNICAL_REQUIREMENT_1]
  - [TECHNICAL_REQUIREMENT_2]
- **Files to Modify**:
  - [FILE_PATH_1]: [MODIFICATION_DESCRIPTION]
  - [FILE_PATH_2]: [MODIFICATION_DESCRIPTION]
- **Acceptance Criteria**:
  - [CRITERION_1]
  - [CRITERION_2]
- **Dependencies**: [DEPENDENCIES]
- **Assignee**: [ASSIGNEE]
- **Estimated Complexity**: [COMPLEXITY_ESTIMATE]

[REPEAT FOR EACH SUB-ISSUE]

### 4. Critical Path Analysis
- **Critical Path**: [SUB_ISSUES_ON_CRITICAL_PATH]
- **Bottlenecks**: [POTENTIAL_BOTTLENECKS]
- **Risk Mitigation**: [RISK_MITIGATION_STRATEGIES]

### 5. Integration Strategy
- **Integration Points**: [KEY_INTEGRATION_POINTS]
- **Integration Testing**: [INTEGRATION_TESTING_APPROACH]
- **Rollback Plan**: [ROLLBACK_STRATEGY]

## IMPLEMENTATION SEQUENCE
1. [FIRST_IMPLEMENTATION_STEP]
2. [SECOND_IMPLEMENTATION_STEP]
3. [THIRD_IMPLEMENTATION_STEP]
...

## DELIVERABLES
1. Main issue with comprehensive project overview
2. [NUMBER] sub-issues with detailed specifications
3. Clear dependencies and integration points
4. Comprehensive acceptance criteria for each issue

## VALIDATION STRATEGY
- [VALIDATION_APPROACH_1]
- [VALIDATION_APPROACH_2]
- [VALIDATION_APPROACH_3]

## ADDITIONAL NOTES
- [SPECIAL_CONSIDERATIONS]
- [POTENTIAL_CHALLENGES]
- [TEAM_COORDINATION_REQUIREMENTS]
```

## Field Descriptions and Guidelines

### ROLE
- **Purpose**: Establishes expertise and authority for the task breakdown
- **Guidelines**: 
  - Specify relevant domain expertise (e.g., frontend development, data engineering, DevOps)
  - Include years of experience (typically 8+ for senior roles)
  - Highlight specialization in methodologies relevant to the project

### OBJECTIVE
- **Purpose**: Clearly defines the goal of the issue structure
- **Guidelines**:
  - Be specific about the project name
  - Emphasize parallel execution as a key outcome
  - Keep it concise (1-2 sentences)

### CONTEXT
- **Purpose**: Provides essential background information for task decomposition
- **Guidelines**:
  - **Project Overview**: 2-3 sentences describing the project scope and purpose
  - **Timeline**: Specific deadlines, sprint cycles, or time constraints
  - **Team Composition**: Number of team members, roles, and expertise levels
  - **Repository**: Link to the codebase or project repository
  - **Existing Implementation**: Include only the most relevant code snippets or documentation
  - **Requirements**: List 3-5 high-level requirements that drive the project

### ISSUE STRUCTURE DESIGN
- **Purpose**: Outlines the hierarchy and organization of issues
- **Guidelines**:
  - **Main Issue**: Should be broad enough to encompass all work but specific enough to have clear boundaries
  - **Parallel Work Streams**: Identify 2-5 independent tracks of work that can proceed simultaneously
  - **Sub-issues**: Break down each work stream into discrete, manageable tasks (1-2 days of work per task)

### DETAILED SUB-ISSUES
- **Purpose**: Provides comprehensive specifications for each task
- **Guidelines**:
  - **Description**: Clear explanation of what needs to be done
  - **Technical Requirements**: Specific technical constraints or standards to follow
  - **Files to Modify**: Exact file paths and the nature of changes needed
  - **Acceptance Criteria**: Measurable outcomes that define when the task is complete
  - **Dependencies**: Other tasks that must be completed before this one can start
  - **Assignee**: Team member responsible for the task
  - **Estimated Complexity**: Low, Medium, or High (or use story points if preferred)

### CRITICAL PATH ANALYSIS
- **Purpose**: Identifies potential bottlenecks and risk factors
- **Guidelines**:
  - **Critical Path**: Sequence of tasks that determine the minimum project timeline
  - **Bottlenecks**: Tasks that could delay the entire project if not completed on time
  - **Risk Mitigation**: Specific strategies to address identified risks

### INTEGRATION STRATEGY
- **Purpose**: Ensures all parallel work streams can be successfully combined
- **Guidelines**:
  - **Integration Points**: Specific interfaces or touchpoints between work streams
  - **Integration Testing**: Approach for validating that components work together
  - **Rollback Plan**: Strategy for reverting changes if integration fails

### IMPLEMENTATION SEQUENCE
- **Purpose**: Provides a high-level roadmap for execution
- **Guidelines**:
  - List 5-10 major milestones in chronological order
  - Focus on the sequence rather than specific timelines
  - Include integration checkpoints between parallel work streams

### DELIVERABLES
- **Purpose**: Clearly defines what will be produced
- **Guidelines**:
  - Be specific about the number and nature of issues to be created
  - Include documentation or other artifacts that will result from the work

### VALIDATION STRATEGY
- **Purpose**: Ensures quality and completeness of the implementation
- **Guidelines**:
  - Include automated testing approaches
  - Specify manual validation procedures
  - Define acceptance criteria for the overall project

### ADDITIONAL NOTES
- **Purpose**: Captures important considerations that don't fit elsewhere
- **Guidelines**:
  - Include team coordination requirements
  - Note potential challenges or special considerations
  - Highlight any external dependencies or constraints

## Implementation Guidelines

### 1. Parallel Processing Strategy
* Identify independent work streams that can proceed in parallel
* Create clear boundaries between parallel tasks
* Define explicit integration points and dependencies
* Structure Linear issues to maximize concurrent development

### 2. Dependency Management
* Clearly document all dependencies between issues
* Identify critical path and potential bottlenecks
* Create dependency graphs for complex relationships
* Provide strategies for managing blocking dependencies

### 3. Task Granularity
* Break down tasks to optimal size (1-2 days of work)
* Ensure each task has a single responsibility
* Create clear, measurable acceptance criteria
* Define precise technical requirements for each task

### 4. Integration Planning
* Identify key integration points early in the process
* Define clear interfaces between components
* Schedule regular integration checkpoints
* Create a rollback strategy for failed integrations

### 5. Risk Management
* Identify potential bottlenecks and dependencies
* Develop mitigation strategies for critical path items
* Consider team availability and expertise
* Plan for external dependencies and potential delays

