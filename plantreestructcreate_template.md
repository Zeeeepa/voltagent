# PlanTreeStructCreate Prompt Engineering Template v1.0

## Overview
This template is designed to generate comprehensive hierarchical project plans with clear dependencies, milestones, and task breakdowns that enable effective parallel execution. It creates a structured, three-level hierarchy (phases, components, tasks) with explicit dependencies and resource allocations.

## Template Structure

```
# Hierarchical Project Planning Framework v2.0

## ROLE
You are a senior technical program manager with 10+ years of experience in [DOMAIN_EXPERTISE], specializing in project planning, dependency management, and resource optimization. You excel at breaking down complex initiatives into structured, executable task hierarchies.

## OBJECTIVE
Create a comprehensive hierarchical project plan for [PROJECT_NAME] that maximizes parallel execution through effective task decomposition, clear dependencies, and precise milestones.

## CONTEXT
**Project Overview**: [PROJECT_DESCRIPTION]
**Timeline**: [TIMELINE_CONSTRAINTS]
**Team Composition**: [TEAM_STRUCTURE]
**Technical Stack**: [TECH_STACK_DETAILS]

**Key Requirements**:
- [HIGH_LEVEL_REQUIREMENT_1]
- [HIGH_LEVEL_REQUIREMENT_2]
- [HIGH_LEVEL_REQUIREMENT_3]

**Constraints**:
- [CONSTRAINT_1]
- [CONSTRAINT_2]
- [CONSTRAINT_3]

## PLANNING METHODOLOGY

### 1. Project Decomposition
- Break down the project into logical components:
  - [COMPONENT_1]
  - [COMPONENT_2]
  - [COMPONENT_3]
- Identify cross-cutting concerns:
  - [CROSS_CUTTING_CONCERN_1]
  - [CROSS_CUTTING_CONCERN_2]

### 2. Dependency Analysis
- Identify critical dependencies:
  - [DEPENDENCY_1]: [DEPENDENCY_1_DESCRIPTION]
  - [DEPENDENCY_2]: [DEPENDENCY_2_DESCRIPTION]
- Map dependency relationships:
  - [RELATIONSHIP_1]
  - [RELATIONSHIP_2]

### 3. Milestone Definition
- Define key project milestones:
  - [MILESTONE_1]: [MILESTONE_1_DESCRIPTION]
  - [MILESTONE_2]: [MILESTONE_2_DESCRIPTION]
  - [MILESTONE_3]: [MILESTONE_3_DESCRIPTION]
- Establish validation criteria for each milestone

### 4. Resource Allocation
- Identify resource requirements:
  - [RESOURCE_TYPE_1]: [RESOURCE_REQUIREMENT_1]
  - [RESOURCE_TYPE_2]: [RESOURCE_REQUIREMENT_2]
- Optimize resource utilization across project phases

## HIERARCHICAL TASK BREAKDOWN

### Level 1: Project Phases
1. **[PHASE_1_NAME]**
   - **Description**: [PHASE_1_DESCRIPTION]
   - **Timeline**: [PHASE_1_TIMELINE]
   - **Dependencies**: [PHASE_1_DEPENDENCIES]
   - **Deliverables**: [PHASE_1_DELIVERABLES]

2. **[PHASE_2_NAME]**
   - **Description**: [PHASE_2_DESCRIPTION]
   - **Timeline**: [PHASE_2_TIMELINE]
   - **Dependencies**: [PHASE_2_DEPENDENCIES]
   - **Deliverables**: [PHASE_2_DELIVERABLES]

3. **[PHASE_3_NAME]**
   - **Description**: [PHASE_3_DESCRIPTION]
   - **Timeline**: [PHASE_3_TIMELINE]
   - **Dependencies**: [PHASE_3_DEPENDENCIES]
   - **Deliverables**: [PHASE_3_DELIVERABLES]

### Level 2: Components
#### Phase 1 Components
1. **[COMPONENT_1_1_NAME]**
   - **Description**: [COMPONENT_1_1_DESCRIPTION]
   - **Owner**: [COMPONENT_1_1_OWNER]
   - **Dependencies**: [COMPONENT_1_1_DEPENDENCIES]
   - **Acceptance Criteria**: [COMPONENT_1_1_CRITERIA]

2. **[COMPONENT_1_2_NAME]**
   - **Description**: [COMPONENT_1_2_DESCRIPTION]
   - **Owner**: [COMPONENT_1_2_OWNER]
   - **Dependencies**: [COMPONENT_1_2_DEPENDENCIES]
   - **Acceptance Criteria**: [COMPONENT_1_2_CRITERIA]

[REPEAT FOR EACH PHASE]

### Level 3: Tasks
#### Component 1.1 Tasks
1. **[TASK_1_1_1_NAME]**
   - **Description**: [TASK_1_1_1_DESCRIPTION]
   - **Assignee**: [TASK_1_1_1_ASSIGNEE]
   - **Estimated Effort**: [TASK_1_1_1_EFFORT]
   - **Dependencies**: [TASK_1_1_1_DEPENDENCIES]
   - **Acceptance Criteria**: [TASK_1_1_1_CRITERIA]

2. **[TASK_1_1_2_NAME]**
   - **Description**: [TASK_1_1_2_DESCRIPTION]
   - **Assignee**: [TASK_1_1_2_ASSIGNEE]
   - **Estimated Effort**: [TASK_1_1_2_EFFORT]
   - **Dependencies**: [TASK_1_1_2_DEPENDENCIES]
   - **Acceptance Criteria**: [TASK_1_1_2_CRITERIA]

[REPEAT FOR EACH COMPONENT]

## PARALLEL EXECUTION STRATEGY
- **Parallel Work Streams**:
  - [WORK_STREAM_1]: [WORK_STREAM_1_DESCRIPTION]
  - [WORK_STREAM_2]: [WORK_STREAM_2_DESCRIPTION]
- **Integration Points**:
  - [INTEGRATION_POINT_1]: [INTEGRATION_POINT_1_DESCRIPTION]
  - [INTEGRATION_POINT_2]: [INTEGRATION_POINT_2_DESCRIPTION]
- **Synchronization Mechanisms**:
  - [SYNC_MECHANISM_1]: [SYNC_MECHANISM_1_DESCRIPTION]
  - [SYNC_MECHANISM_2]: [SYNC_MECHANISM_2_DESCRIPTION]

## RISK MANAGEMENT
- **Identified Risks**:
  - [RISK_1]: [RISK_1_DESCRIPTION]
  - [RISK_2]: [RISK_2_DESCRIPTION]
- **Mitigation Strategies**:
  - [MITIGATION_1]: [MITIGATION_1_DESCRIPTION]
  - [MITIGATION_2]: [MITIGATION_2_DESCRIPTION]
- **Contingency Plans**:
  - [CONTINGENCY_1]: [CONTINGENCY_1_DESCRIPTION]
  - [CONTINGENCY_2]: [CONTINGENCY_2_DESCRIPTION]

## IMPLEMENTATION ROADMAP
1. [ROADMAP_STEP_1]
2. [ROADMAP_STEP_2]
3. [ROADMAP_STEP_3]
...

## DELIVERABLES
1. Complete hierarchical project plan
2. Dependency graph visualization
3. Resource allocation matrix
4. Risk management plan
5. Milestone tracking dashboard

## VALIDATION STRATEGY
- [VALIDATION_APPROACH_1]
- [VALIDATION_APPROACH_2]
- [VALIDATION_APPROACH_3]

## ADDITIONAL CONSIDERATIONS
- [CONSIDERATION_1]
- [CONSIDERATION_2]
- [CONSIDERATION_3]
```

## Implementation Guidelines

### 1. Hierarchical Structure Design
* **Create a clear 3-level hierarchy**
  * Level 1: Project Phases - High-level sequential stages of the project
  * Level 2: Components - Logical groupings of related functionality within each phase
  * Level 3: Tasks - Specific, assignable units of work within each component
* **Ensure appropriate detail for each level**
  * Phases: 3-6 major phases covering the entire project lifecycle
  * Components: 2-5 components per phase, each representing a cohesive unit of work
  * Tasks: 3-10 tasks per component, each representing 1-5 days of work for one person
* **Maintain consistent naming and description patterns**
  * Use action verbs for task names (e.g., "Implement", "Design", "Test")
  * Keep descriptions concise but informative
  * Use consistent terminology throughout the plan
* **Define clear ownership and accountability**
  * Assign specific owners to components
  * Assign specific assignees to tasks
  * Ensure every deliverable has a clear owner

### 2. Dependency Management
* **Identify and document all dependencies explicitly**
  * Technical dependencies (e.g., "Component A must be completed before Component B")
  * Resource dependencies (e.g., "Task requires Designer availability")
  * External dependencies (e.g., "Task depends on third-party API access")
* **Visualize dependency relationships**
  * Create a dependency graph showing relationships between components
  * Highlight critical path dependencies that could impact timeline
  * Use arrows to show dependency flow direction
* **Minimize blocking dependencies**
  * Identify opportunities to break dependencies through interface contracts
  * Use mock implementations to allow parallel development
  * Consider feature flags to decouple deployment dependencies
* **Manage external dependencies**
  * Identify all external dependencies early
  * Create contingency plans for external dependency failures
  * Establish communication channels with external dependency owners

### 3. Parallel Execution Optimization
* **Identify tasks for parallel execution**
  * Group independent tasks that can run simultaneously
  * Look for tasks with different resource requirements that can run in parallel
  * Identify tasks that can start with partial dependencies satisfied
* **Create logical work streams**
  * Group related tasks into cohesive work streams
  * Assign work streams to specific teams or individuals
  * Balance work across streams to avoid bottlenecks
* **Define integration points**
  * Identify where parallel work streams must integrate
  * Schedule regular integration checkpoints
  * Define clear interfaces between work streams
* **Establish synchronization mechanisms**
  * Create communication protocols for cross-stream dependencies
  * Schedule regular sync meetings for dependent teams
  * Implement automated testing for integration points

### 4. Resource Allocation
* **Map skills to requirements**
  * Identify required skills for each component and task
  * Match team members to tasks based on skills and availability
  * Identify skill gaps that need to be addressed
* **Balance workload across team**
  * Distribute tasks evenly across team members
  * Avoid overloading key resources
  * Consider part-time allocations for specialized roles
* **Plan for resource constraints**
  * Identify potential resource bottlenecks
  * Create contingency plans for key resource unavailability
  * Consider external resources for specialized needs

### 5. Risk Management
* **Identify potential risks**
  * Technical risks (e.g., new technology, complex integration)
  * Resource risks (e.g., key person dependency, skill gaps)
  * External risks (e.g., vendor delays, regulatory changes)
* **Assess risk impact and likelihood**
  * Rate each risk on impact (high/medium/low)
  * Rate each risk on likelihood (high/medium/low)
  * Prioritize risks based on combined rating
* **Develop mitigation strategies**
  * Create specific actions to reduce likelihood or impact
  * Assign owners to each mitigation action
  * Set deadlines for mitigation implementation
* **Create contingency plans**
  * Develop specific plans for high-impact risks
  * Define triggers for contingency plan activation
  * Ensure resources are available for contingency execution

## Parameter Descriptions

### Role Section
- **[DOMAIN_EXPERTISE]**: Specific industry or technical domain relevant to the project (e.g., "cloud infrastructure", "mobile app development", "e-commerce systems")

### Objective Section
- **[PROJECT_NAME]**: Clear, concise name of the project (e.g., "Customer Portal Redesign", "Payment System Migration")

### Context Section
- **[PROJECT_DESCRIPTION]**: 2-3 sentence overview of the project goals and scope
- **[TIMELINE_CONSTRAINTS]**: Specific timeframe for project completion (e.g., "Must launch by Q3 2023")
- **[TEAM_STRUCTURE]**: Description of team size, roles, and organization
- **[TECH_STACK_DETAILS]**: List of key technologies, platforms, and tools to be used
- **[HIGH_LEVEL_REQUIREMENT_X]**: Major functional or non-functional requirements
- **[CONSTRAINT_X]**: Business, technical, or resource constraints that impact the project

### Planning Methodology Section
- **[COMPONENT_X]**: Major logical parts of the system or project
- **[CROSS_CUTTING_CONCERN_X]**: Aspects that affect multiple components (e.g., security, performance)
- **[DEPENDENCY_X]**: Critical dependencies that impact project execution
- **[DEPENDENCY_X_DESCRIPTION]**: Detailed explanation of the dependency
- **[RELATIONSHIP_X]**: How dependencies relate to each other
- **[MILESTONE_X]**: Key project checkpoints
- **[MILESTONE_X_DESCRIPTION]**: What defines the milestone and its importance
- **[RESOURCE_TYPE_X]**: Categories of resources needed (e.g., developers, designers)
- **[RESOURCE_REQUIREMENT_X]**: Specific resource needs for each type

### Hierarchical Task Breakdown Section
- **[PHASE_X_NAME]**: Name of project phase (e.g., "Discovery", "Implementation")
- **[PHASE_X_DESCRIPTION]**: Brief description of the phase's purpose and scope
- **[PHASE_X_TIMELINE]**: Timeframe for the phase (e.g., "Weeks 1-4")
- **[PHASE_X_DEPENDENCIES]**: What must be completed before this phase
- **[PHASE_X_DELIVERABLES]**: Tangible outputs from the phase
- **[COMPONENT_X_Y_NAME]**: Name of component within phase X
- **[COMPONENT_X_Y_DESCRIPTION]**: Description of the component's purpose
- **[COMPONENT_X_Y_OWNER]**: Person responsible for the component
- **[COMPONENT_X_Y_DEPENDENCIES]**: What must be completed before this component
- **[COMPONENT_X_Y_CRITERIA]**: Criteria for component completion
- **[TASK_X_Y_Z_NAME]**: Name of specific task within component Y of phase X
- **[TASK_X_Y_Z_DESCRIPTION]**: Detailed description of the task
- **[TASK_X_Y_Z_ASSIGNEE]**: Person assigned to complete the task
- **[TASK_X_Y_Z_EFFORT]**: Estimated time/effort for the task
- **[TASK_X_Y_Z_DEPENDENCIES]**: Specific dependencies for this task
- **[TASK_X_Y_Z_CRITERIA]**: Acceptance criteria for task completion

### Parallel Execution Strategy Section
- **[WORK_STREAM_X]**: Name of parallel work stream
- **[WORK_STREAM_X_DESCRIPTION]**: Description of work stream focus and composition
- **[INTEGRATION_POINT_X]**: Where work streams must integrate
- **[INTEGRATION_POINT_X_DESCRIPTION]**: Details of the integration requirements
- **[SYNC_MECHANISM_X]**: Method for synchronizing work across streams
- **[SYNC_MECHANISM_X_DESCRIPTION]**: How the synchronization mechanism works

### Risk Management Section
- **[RISK_X]**: Identified project risk
- **[RISK_X_DESCRIPTION]**: Detailed description of the risk and its potential impact
- **[MITIGATION_X]**: Strategy to mitigate a risk
- **[MITIGATION_X_DESCRIPTION]**: Detailed description of the mitigation approach
- **[CONTINGENCY_X]**: Backup plan if a risk materializes
- **[CONTINGENCY_X_DESCRIPTION]**: Detailed description of the contingency plan

### Implementation Roadmap Section
- **[ROADMAP_STEP_X]**: Sequential step in the implementation process

### Validation Strategy Section
- **[VALIDATION_APPROACH_X]**: Method for validating project success

### Additional Considerations Section
- **[CONSIDERATION_X]**: Other important factors to consider

