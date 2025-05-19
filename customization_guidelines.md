# Customization Guidelines for Different Team Structures

The PlanTreeStructCreate template is designed to be flexible and adaptable to different team structures and project types. This guide provides specific recommendations for customizing the template based on team size, composition, and distribution.

## Small Teams (2-5 People)

### Template Modifications
- **Simplify the hierarchy**: Reduce to 2 levels instead of 3 (Phases and Tasks)
- **Combine roles**: Each team member will likely handle multiple responsibilities
- **Reduce documentation overhead**: Focus on essential documentation only
- **Streamline milestones**: Use fewer, broader milestones

### Parameter Adjustments
- **[TEAM_STRUCTURE]**: List each team member with their primary and secondary skills
- **[COMPONENT_X]**: Reduce the number of components to match team capacity
- **[OWNER]**: Assign components to individuals (not teams)
- **[MILESTONE_X]**: Define 3-4 major milestones instead of 5-6

### Example Structure
```
## HIERARCHICAL TASK BREAKDOWN

### Level 1: Project Phases
1. **Design & Planning**
   - **Description**: Define requirements, architecture, and design
   - **Timeline**: Weeks 1-2
   - **Dependencies**: None
   - **Deliverables**: Requirements doc, architecture diagram, UI mockups

2. **Core Implementation**
   - **Description**: Develop core functionality
   - **Timeline**: Weeks 3-6
   - **Dependencies**: Design & Planning
   - **Deliverables**: Working core features

3. **Refinement & Launch**
   - **Description**: Complete all features, testing, and deployment
   - **Timeline**: Weeks 7-8
   - **Dependencies**: Core Implementation
   - **Deliverables**: Complete product ready for launch

### Level 2: Tasks
#### Phase 1 Tasks
1. **Requirement Analysis**
   - **Assignee**: [Team Member 1]
   - **Estimated Effort**: 3 days
   - **Dependencies**: None
   - **Acceptance Criteria**: Requirements document approved by all team members

2. **Architecture Design**
   - **Assignee**: [Team Member 2]
   - **Estimated Effort**: 2 days
   - **Dependencies**: Requirement Analysis
   - **Acceptance Criteria**: Architecture diagram reviewed and approved

[CONTINUE WITH ADDITIONAL TASKS]
```

### Synchronization Recommendations
- Daily quick stand-ups (15 minutes)
- Shared task board with real-time updates
- End-of-week review and planning session
- Direct communication rather than formal documentation

## Medium Teams (6-15 People)

### Template Modifications
- **Use the full 3-level hierarchy**: Phases, Components, and Tasks
- **Add clear ownership**: Assign specific owners to components
- **Enhance documentation**: Include more detailed specifications
- **Add integration points**: Define clear handoffs between sub-teams

### Parameter Adjustments
- **[TEAM_STRUCTURE]**: Group team members into functional sub-teams
- **[COMPONENT_X]**: Align components with sub-team responsibilities
- **[OWNER]**: Assign components to sub-team leads
- **[INTEGRATION_POINT_X]**: Define explicit integration points between sub-teams

### Example Structure
```
## TEAM COMPOSITION
- Frontend Team (3 developers, 1 designer)
- Backend Team (3 developers, 1 database specialist)
- QA Team (2 testers)
- Project Management (1 project manager)

## HIERARCHICAL TASK BREAKDOWN

### Level 1: Project Phases
[STANDARD PHASES AS IN TEMPLATE]

### Level 2: Components
#### Phase 1 Components
1. **User Interface Design**
   - **Owner**: Frontend Team Lead
   - **Dependencies**: None
   - **Acceptance Criteria**: Design system approved by all stakeholders

2. **API Specification**
   - **Owner**: Backend Team Lead
   - **Dependencies**: Initial requirements
   - **Acceptance Criteria**: API contract approved by Frontend and Backend teams

[CONTINUE WITH ADDITIONAL COMPONENTS]

### Level 3: Tasks
[STANDARD TASKS AS IN TEMPLATE]
```

### Synchronization Recommendations
- Sub-team daily stand-ups
- Cross-team sync twice weekly
- Documented integration points with acceptance criteria
- Weekly demo sessions for all teams
- Shared documentation repository

## Large Teams (16+ People)

### Template Modifications
- **Expand the hierarchy**: Consider adding a fourth level for epics or initiatives
- **Formalize governance**: Add approval processes and decision-making frameworks
- **Enhance dependency management**: Create detailed dependency maps
- **Add coordination mechanisms**: Define explicit coordination roles and processes

### Parameter Adjustments
- **[TEAM_STRUCTURE]**: Organize into feature teams or functional teams with clear leadership
- **[CROSS_CUTTING_CONCERN_X]**: Expand to include team coordination and communication
- **[DEPENDENCY_X]**: Include team dependencies as well as technical dependencies
- **[SYNC_MECHANISM_X]**: Define formal synchronization mechanisms between teams

### Example Structure
```
## TEAM COMPOSITION
- Feature Team Alpha: User Authentication & Profile (4 developers, 1 designer, 1 QA)
- Feature Team Beta: Core Functionality (5 developers, 1 designer, 2 QA)
- Feature Team Gamma: Analytics & Reporting (4 developers, 1 designer, 1 QA)
- Platform Team: Infrastructure & DevOps (4 engineers)
- UX Team: Design System & User Research (3 designers, 1 researcher)
- QA Team: Test Automation & Performance (3 QA engineers)
- Program Management: (2 program managers)

## HIERARCHICAL TASK BREAKDOWN

### Level 1: Initiatives
1. **User Management Initiative**
   - **Description**: All features related to user management
   - **Lead Team**: Feature Team Alpha
   - **Supporting Teams**: Platform Team, UX Team
   - **Timeline**: Months 1-3

[CONTINUE WITH ADDITIONAL INITIATIVES]

### Level 2: Project Phases
[FOR EACH INITIATIVE, DEFINE PHASES]

### Level 3: Components
[FOR EACH PHASE, DEFINE COMPONENTS]

### Level 4: Tasks
[FOR EACH COMPONENT, DEFINE TASKS]
```

### Synchronization Recommendations
- Scrum-of-scrums for team lead coordination
- Sprint alignment across all teams
- Dedicated integration sprints
- Formal change management process
- Centralized documentation with ownership assignments
- Regular all-hands demos (bi-weekly)
- Cross-team pairing for critical integration points

## Remote/Distributed Teams

### Template Modifications
- **Enhance communication sections**: Add explicit communication protocols
- **Increase documentation detail**: Ensure all decisions and requirements are documented
- **Add time zone considerations**: Account for time zone differences in scheduling
- **Formalize handoffs**: Create clear processes for work handoffs between teams

### Parameter Adjustments
- **[TEAM_STRUCTURE]**: Include time zones and working hours for each team member
- **[SYNC_MECHANISM_X]**: Define asynchronous and synchronous communication channels
- **[INTEGRATION_POINT_X]**: Include handoff processes between distributed team members
- **[ADDITIONAL_CONSIDERATIONS]**: Add section for communication protocols

### Example Structure
```
## TEAM COMPOSITION
- US Team (4 members, PST/EST time zones)
- Europe Team (3 members, CET time zone)
- Asia Team (3 members, IST/SGT time zones)

## COMMUNICATION PROTOCOLS
- Asynchronous Updates: Daily written updates in shared document
- Synchronous Meetings: 2 weekly overlap meetings (US morning/Europe afternoon, Asia evening/US afternoon)
- Documentation: All decisions documented in central wiki within 24 hours
- Handoffs: End-of-day summary from each team to the next team in the workflow

## PARALLEL EXECUTION STRATEGY
- **Work Distribution**: Assign work to maximize independent execution across time zones
- **Handoff Points**: Define clear handoffs between regional teams
- **Overlap Tasks**: Identify tasks requiring real-time collaboration during overlap hours
- **Follow-the-sun Development**: Critical issues addressed by whoever is currently working
```

### Synchronization Recommendations
- Comprehensive written documentation
- Recorded video meetings for those who cannot attend
- Clear definition of decision-making authority
- Shared project management tools with real-time updates
- Regular virtual team-building activities
- Rotation of meeting times to share the burden of odd hours

## Cross-Functional Teams

### Template Modifications
- **Enhance role definitions**: Clearly define roles and responsibilities
- **Add skill matrix**: Map team skills to project requirements
- **Include training needs**: Identify areas where cross-training is needed
- **Define decision frameworks**: Clarify how cross-functional decisions are made

### Parameter Adjustments
- **[TEAM_STRUCTURE]**: Define primary and secondary skills for each team member
- **[RESOURCE_TYPE_X]**: Include skill-based resource allocation
- **[OWNER]**: Assign based on skill rather than organizational role
- **[ADDITIONAL_CONSIDERATIONS]**: Add section for cross-functional collaboration

### Example Structure
```
## TEAM COMPOSITION
- Team Members:
  - Alex: Frontend (primary), UX (secondary)
  - Blake: Backend (primary), DevOps (secondary)
  - Casey: UX (primary), Product (secondary)
  - Dana: QA (primary), Frontend (secondary)
  - Evan: Product (primary), QA (secondary)

## SKILL MATRIX
| Skill Area    | Expert | Proficient | Familiar |
|---------------|--------|------------|----------|
| Frontend      | Alex   | Dana       | Casey    |
| Backend       | Blake  | -          | Alex     |
| UX Design     | Casey  | Alex       | Evan     |
| QA            | Dana   | Evan       | -        |
| DevOps        | -      | Blake      | Dana     |
| Product       | Evan   | Casey      | -        |

## RESOURCE ALLOCATION
- Frontend Development: Alex (80%), Dana (30%)
- Backend Development: Blake (70%)
- UX Design: Casey (70%), Alex (20%)
- QA: Dana (70%), Evan (30%)
- DevOps: Blake (30%)
- Product Management: Evan (70%), Casey (30%)
```

### Synchronization Recommendations
- Cross-functional daily stand-ups
- Skill-sharing sessions
- Pair programming/pairing across disciplines
- Shared ownership of quality and delivery
- Regular retrospectives focused on cross-functional collaboration

## Specialized Technical Teams

### Template Modifications
- **Add technical depth**: Include more technical details in specifications
- **Enhance technical dependencies**: Map detailed technical dependencies
- **Add architecture sections**: Include detailed architecture considerations
- **Include technical debt management**: Plan for managing technical debt

### Parameter Adjustments
- **[TECH_STACK_DETAILS]**: Provide detailed technical stack information
- **[DEPENDENCY_X]**: Include detailed technical dependencies
- **[COMPONENT_X_DESCRIPTION]**: Include technical architecture details
- **[ADDITIONAL_CONSIDERATIONS]**: Add section for technical debt management

### Example Structure
```
## TECHNICAL STACK
- Frontend: React 18.2, TypeScript 5.0, Redux Toolkit 2.0
- Backend: Node.js 18 LTS, Express 4.18, TypeScript 5.0
- Database: PostgreSQL 15, Redis 7.0
- Infrastructure: AWS (ECS, RDS, ElastiCache), Terraform 1.5
- CI/CD: GitHub Actions, Docker 24.0

## ARCHITECTURE CONSIDERATIONS
- Microservices Architecture:
  - User Service: Authentication, profile management
  - Content Service: Content creation, storage, retrieval
  - Analytics Service: User behavior tracking, reporting
- Database Design:
  - Normalized schema for transactional data
  - Denormalized views for reporting
  - Redis for caching and session management
- API Design:
  - RESTful API for client-server communication
  - GraphQL for complex data queries
  - WebSockets for real-time updates

## TECHNICAL DEBT MANAGEMENT
- Scheduled refactoring sprints every quarter
- Technical debt tracking in issue management system
- 20% time allocation for addressing technical debt
- Architecture review board for major technical decisions
```

### Synchronization Recommendations
- Architecture review meetings
- Technical design documents with formal review process
- Code reviews across team boundaries
- Technical brown bag sessions
- Shared coding standards and best practices documentation

