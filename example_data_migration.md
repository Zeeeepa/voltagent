# Example Implementation: Data Migration Project

```
# Hierarchical Project Planning Framework v2.0

## ROLE
You are a senior technical program manager with 10+ years of experience in data engineering and migration projects, specializing in project planning, dependency management, and resource optimization. You excel at breaking down complex initiatives into structured, executable task hierarchies.

## OBJECTIVE
Create a comprehensive hierarchical project plan for "Enterprise Data Warehouse Migration" that maximizes parallel execution through effective task decomposition, clear dependencies, and precise milestones.

## CONTEXT
**Project Overview**: Migrate the organization's legacy data warehouse to a modern cloud-based platform, including ETL pipelines, reporting infrastructure, and analytics capabilities. The migration must ensure data integrity, minimize business disruption, and enable new analytical capabilities while maintaining historical reporting continuity.
**Timeline**: Must be completed within 8 months (March-October 2025)
**Team Composition**: 3 data engineers, 2 ETL developers, 2 BI developers, 1 data architect, 2 QA engineers, 1 DevOps engineer, 1 project manager
**Technical Stack**: Snowflake, AWS (S3, Lambda, Glue), Airflow, dbt, Tableau, Python, SQL

**Key Requirements**:
- Zero data loss during migration
- Minimal disruption to business reporting (< 24 hours downtime)
- 30% improvement in query performance
- Implementation of data quality monitoring
- Enhanced security and access controls
- Maintain backward compatibility for critical reports

**Constraints**:
- Legacy system must remain operational during migration
- Limited documentation for some legacy ETL processes
- Compliance with financial reporting regulations
- Fixed budget with no additional resources available
- Some source systems cannot be modified

## PLANNING METHODOLOGY

### 1. Project Decomposition
- Break down the project into logical components:
  - Data Assessment & Mapping
  - Infrastructure Setup
  - ETL Pipeline Migration
  - Data Validation & Quality
  - Reporting & Analytics Migration
  - Cutover & Decommissioning
- Identify cross-cutting concerns:
  - Data Governance & Security
  - Performance Optimization
  - Documentation & Knowledge Transfer
  - Business Continuity

### 2. Dependency Analysis
- Identify critical dependencies:
  - Data Mapping: Required before ETL migration
  - Infrastructure Setup: Required before data loading
  - Test Environment: Required for validation
  - Business Sign-off: Required before cutover
- Map dependency relationships:
  - ETL pipelines depend on data mapping and infrastructure
  - Reporting depends on successful data migration
  - Cutover depends on validation and business approval
  - Decommissioning depends on successful cutover

### 3. Milestone Definition
- Define key project milestones:
  - M1 (Month 1): Assessment Complete & Migration Strategy Approved
  - M2 (Month 3): Infrastructure Setup & Initial Data Load Complete
  - M3 (Month 5): ETL Pipelines Migrated & Validated
  - M4 (Month 6): Reporting & Analytics Migrated
  - M5 (Month 7): Parallel Run & Validation Complete
  - M6 (Month 8): Cutover Complete & Legacy System Decommissioned
- Establish validation criteria for each milestone

### 4. Resource Allocation
- Identify resource requirements:
  - Data Engineering: 3 engineers (full-time throughout)
  - ETL Development: 2 developers (full-time for months 2-5)
  - BI Development: 2 developers (full-time for months 4-7)
  - Architecture: 1 architect (full-time initially, then advisory)
  - QA: 2 engineers (part-time initially, full-time during validation)
  - DevOps: 1 engineer (part-time throughout, full-time during cutover)
- Optimize resource utilization across project phases

## HIERARCHICAL TASK BREAKDOWN

### Level 1: Project Phases
1. **Assessment & Planning**
   - **Description**: Analyze current state, define future state, and create migration strategy
   - **Timeline**: Months 1-2
   - **Dependencies**: None (project start)
   - **Deliverables**: Current state assessment, future state architecture, migration strategy, detailed project plan

2. **Infrastructure & Foundation**
   - **Description**: Set up cloud infrastructure, security, and foundational components
   - **Timeline**: Months 2-3
   - **Dependencies**: Completion of Assessment & Planning
   - **Deliverables**: Cloud infrastructure, security framework, data modeling, initial data load

3. **ETL Migration**
   - **Description**: Migrate and transform ETL processes to the new platform
   - **Timeline**: Months 3-5
   - **Dependencies**: Completion of Infrastructure & Foundation
   - **Deliverables**: Migrated ETL pipelines, data quality framework, automated testing

4. **Reporting Migration**
   - **Description**: Migrate reports, dashboards, and analytics capabilities
   - **Timeline**: Months 4-6
   - **Dependencies**: Partial completion of ETL Migration
   - **Deliverables**: Migrated reports, dashboards, self-service analytics

5. **Validation & Cutover**
   - **Description**: Validate the new system, conduct parallel runs, and perform cutover
   - **Timeline**: Months 6-7
   - **Dependencies**: Completion of ETL Migration and Reporting Migration
   - **Deliverables**: Validation results, cutover plan, business sign-off

6. **Optimization & Decommissioning**
   - **Description**: Optimize performance, decommission legacy system, and complete knowledge transfer
   - **Timeline**: Months 7-8
   - **Dependencies**: Completion of Validation & Cutover
   - **Deliverables**: Performance optimization, decommissioning plan, knowledge transfer documentation

### Level 2: Components
#### Phase 1 Components
1. **Current State Assessment**
   - **Description**: Document current data warehouse architecture, ETL processes, and reporting
   - **Owner**: Data Architect
   - **Dependencies**: None
   - **Acceptance Criteria**: Comprehensive documentation of current state approved by stakeholders

2. **Future State Architecture**
   - **Description**: Design cloud-based data warehouse architecture and data models
   - **Owner**: Data Architect
   - **Dependencies**: Current State Assessment
   - **Acceptance Criteria**: Architecture document approved by technical and business stakeholders

3. **Migration Strategy**
   - **Description**: Define approach for data migration, ETL conversion, and cutover
   - **Owner**: Project Manager
   - **Dependencies**: Current State Assessment, Future State Architecture
   - **Acceptance Criteria**: Migration strategy approved by steering committee

4. **Detailed Project Plan**
   - **Description**: Create detailed project plan with tasks, dependencies, and resource allocation
   - **Owner**: Project Manager
   - **Dependencies**: Migration Strategy
   - **Acceptance Criteria**: Project plan approved by all team leads and stakeholders

#### Phase 2 Components
1. **Cloud Infrastructure Setup**
   - **Description**: Provision and configure cloud infrastructure for data warehouse
   - **Owner**: DevOps Engineer
   - **Dependencies**: Future State Architecture
   - **Acceptance Criteria**: Infrastructure deployed and validated with monitoring in place

2. **Security Implementation**
   - **Description**: Implement security controls, access management, and encryption
   - **Owner**: Data Engineer 1
   - **Dependencies**: Cloud Infrastructure Setup
   - **Acceptance Criteria**: Security controls implemented and validated by security team

3. **Data Modeling**
   - **Description**: Implement data models in the new data warehouse
   - **Owner**: Data Engineer 2
   - **Dependencies**: Future State Architecture
   - **Acceptance Criteria**: Data models implemented and reviewed for performance and usability

4. **Initial Data Load**
   - **Description**: Perform initial load of historical data to the new platform
   - **Owner**: Data Engineer 3
   - **Dependencies**: Cloud Infrastructure Setup, Security Implementation, Data Modeling
   - **Acceptance Criteria**: Historical data successfully loaded and validated

#### Phase 3 Components
1. **ETL Pipeline Conversion**
   - **Description**: Convert legacy ETL processes to the new platform
   - **Owner**: ETL Developer 1
   - **Dependencies**: Initial Data Load
   - **Acceptance Criteria**: ETL pipelines successfully migrated and executing correctly

2. **Data Transformation Logic**
   - **Description**: Implement data transformation logic in the new platform
   - **Owner**: ETL Developer 2
   - **Dependencies**: Data Modeling
   - **Acceptance Criteria**: Transformation logic correctly implemented and validated

3. **Data Quality Framework**
   - **Description**: Implement data quality checks and monitoring
   - **Owner**: Data Engineer 2
   - **Dependencies**: ETL Pipeline Conversion
   - **Acceptance Criteria**: Data quality checks implemented and detecting issues correctly

4. **Automated Testing**
   - **Description**: Implement automated testing for ETL processes
   - **Owner**: QA Engineer 1
   - **Dependencies**: ETL Pipeline Conversion, Data Transformation Logic
   - **Acceptance Criteria**: Automated tests covering critical ETL processes and data quality

[ADDITIONAL COMPONENTS WOULD CONTINUE HERE]

### Level 3: Tasks
#### Component: ETL Pipeline Conversion Tasks
1. **ETL Process Inventory**
   - **Description**: Create detailed inventory of all ETL processes to be migrated
   - **Assignee**: ETL Developer 1
   - **Estimated Effort**: 1 week
   - **Dependencies**: Current State Assessment
   - **Acceptance Criteria**: Complete inventory with priority, complexity, and dependencies

2. **ETL Pattern Development**
   - **Description**: Develop standard patterns for ETL processes in the new platform
   - **Assignee**: ETL Developer 1
   - **Estimated Effort**: 2 weeks
   - **Dependencies**: Future State Architecture
   - **Acceptance Criteria**: ETL patterns documented and reviewed by team

3. **Source System Connectors**
   - **Description**: Implement connectors to source systems
   - **Assignee**: ETL Developer 2
   - **Estimated Effort**: 3 weeks
   - **Dependencies**: Cloud Infrastructure Setup
   - **Acceptance Criteria**: Connectors successfully extracting data from all source systems

4. **Incremental Load Logic**
   - **Description**: Implement incremental load logic for ongoing data synchronization
   - **Assignee**: ETL Developer 1
   - **Estimated Effort**: 2 weeks
   - **Dependencies**: Source System Connectors
   - **Acceptance Criteria**: Incremental loads correctly identifying and processing new data

5. **Error Handling Framework**
   - **Description**: Implement error handling and retry logic
   - **Assignee**: ETL Developer 2
   - **Estimated Effort**: 1 week
   - **Dependencies**: ETL Pattern Development
   - **Acceptance Criteria**: Errors properly caught, logged, and handled with appropriate retries

#### Component: Data Quality Framework Tasks
1. **Data Quality Rules Definition**
   - **Description**: Define data quality rules for critical data elements
   - **Assignee**: Data Engineer 2
   - **Estimated Effort**: 1 week
   - **Dependencies**: Data Modeling
   - **Acceptance Criteria**: Data quality rules documented and approved by business stakeholders

2. **Data Profiling Implementation**
   - **Description**: Implement data profiling for source and target data
   - **Assignee**: Data Engineer 2
   - **Estimated Effort**: 2 weeks
   - **Dependencies**: Initial Data Load
   - **Acceptance Criteria**: Data profiling providing accurate statistics on data quality

3. **Quality Check Implementation**
   - **Description**: Implement automated quality checks in ETL pipelines
   - **Assignee**: Data Engineer 2
   - **Estimated Effort**: 2 weeks
   - **Dependencies**: ETL Pipeline Conversion, Data Quality Rules Definition
   - **Acceptance Criteria**: Quality checks integrated into ETL pipelines and detecting issues

4. **Quality Monitoring Dashboard**
   - **Description**: Create dashboard for monitoring data quality metrics
   - **Assignee**: BI Developer 1
   - **Estimated Effort**: 1 week
   - **Dependencies**: Quality Check Implementation
   - **Acceptance Criteria**: Dashboard providing clear visibility into data quality metrics

[ADDITIONAL TASKS WOULD CONTINUE HERE]

## PARALLEL EXECUTION STRATEGY
- **Parallel Work Streams**:
  - Infrastructure & Security: Cloud setup, security implementation
  - Data Engineering: Data modeling, initial load, data quality
  - ETL Development: Pipeline conversion, transformation logic
  - BI Development: Report migration, dashboard development
  - Testing & Validation: Test automation, data validation
- **Integration Points**:
  - Infrastructure Readiness: Month 3 - Platform ready for ETL development
  - Data Availability: Month 4 - Initial data available for reporting development
  - ETL Completion: Month 5 - All data pipelines available for reporting
  - Validation Readiness: Month 6 - System ready for comprehensive validation
- **Synchronization Mechanisms**:
  - Weekly Integration Meetings: Sync across all work streams
  - Environment Promotion Process: Controlled promotion from dev to test to prod
  - Data Reconciliation: Regular reconciliation between legacy and new systems
  - Change Control Board: Weekly review of changes affecting multiple streams

## RISK MANAGEMENT
- **Identified Risks**:
  - Data Mapping Complexity: Legacy system may have undocumented transformations
  - Performance Issues: New system may not meet performance requirements
  - Business Disruption: Migration could impact critical business operations
  - Resource Constraints: Team may lack capacity for parallel operations
  - Legacy Knowledge Gaps: Key knowledge about legacy systems may be missing
- **Mitigation Strategies**:
  - Data Lineage Analysis: Conduct thorough analysis of data lineage in legacy system
  - Performance Testing: Implement early and ongoing performance testing
  - Business Involvement: Engage business users throughout the project
  - Resource Planning: Carefully plan resource allocation to avoid overloading
  - Knowledge Capture: Document legacy systems as early as possible
- **Contingency Plans**:
  - Phased Migration: Ability to migrate critical data marts first if needed
  - Rollback Procedure: Detailed procedure for rolling back to legacy system
  - Extended Parallel Run: Option to extend parallel run period if issues arise
  - External Resources: Budget for temporary external resources if needed
  - Prioritization Framework: Clear framework for prioritizing work if constrained

## IMPLEMENTATION ROADMAP
1. Complete assessment and planning (Months 1-2)
2. Set up cloud infrastructure and security (Months 2-3)
3. Implement data models and perform initial data load (Month 3)
4. Migrate ETL pipelines and implement data quality (Months 3-5)
5. Migrate reports and dashboards (Months 4-6)
6. Conduct validation and parallel runs (Months 6-7)
7. Perform cutover and decommission legacy system (Months 7-8)

## DELIVERABLES
1. Current state assessment document
2. Future state architecture document
3. Migration strategy and detailed project plan
4. Cloud infrastructure and security implementation
5. Migrated data warehouse with ETL pipelines
6. Migrated reports and dashboards
7. Data quality framework and monitoring
8. Validation results and cutover documentation
9. Performance optimization recommendations
10. Knowledge transfer and training materials

## VALIDATION STRATEGY
- Data Reconciliation: Comprehensive reconciliation between legacy and new systems
- Performance Testing: Validation of query performance against requirements
- User Acceptance Testing: Business validation of reports and functionality
- Parallel Running: Side-by-side operation of legacy and new systems
- Disaster Recovery Testing: Validation of backup and recovery procedures

## ADDITIONAL CONSIDERATIONS
- Training: Comprehensive training program for business users and IT staff
- Documentation: Detailed documentation of new system for future maintenance
- Governance: Implementation of data governance processes for the new platform
- Scalability: Design for future growth in data volume and user base
- Innovation: Enablement of new analytical capabilities not possible in legacy system
```

