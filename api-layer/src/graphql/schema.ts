import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # Common types
  scalar DateTime

  # Workflow definition types
  type WorkflowDefinition {
    id: ID!
    name: String!
    description: String
    version: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    tasks: [TaskDefinition!]!
    synchronizationPoints: [SynchronizationPoint!]!
  }

  type TaskDefinition {
    id: ID!
    name: String!
    description: String
    resourceRequirements: ResourceRequirements
    dependencies: [ID!]
    timeout: Int
    retryPolicy: RetryPolicy
  }

  type ResourceRequirements {
    cpu: Float
    memory: Int
    storage: Int
    custom: [CustomResource!]
  }

  type CustomResource {
    name: String!
    value: String!
  }

  type RetryPolicy {
    maxRetries: Int!
    backoffMultiplier: Float
    maxBackoff: Int
  }

  type SynchronizationPoint {
    id: ID!
    name: String!
    description: String
    requiredTasks: [ID!]!
    timeout: Int
  }

  # Workflow execution types
  type WorkflowExecution {
    id: ID!
    workflowDefinitionId: ID!
    status: ExecutionStatus!
    startTime: DateTime
    endTime: DateTime
    taskExecutions: [TaskExecution!]!
    context: WorkflowContext
  }

  type TaskExecution {
    id: ID!
    taskDefinitionId: ID!
    status: ExecutionStatus!
    startTime: DateTime
    endTime: DateTime
    attempts: Int!
    error: String
    resources: ResourceUsage
  }

  type ResourceUsage {
    cpu: Float
    memory: Int
    storage: Int
    custom: [CustomResourceUsage!]
  }

  type CustomResourceUsage {
    name: String!
    value: String!
  }

  type WorkflowContext {
    id: ID!
    data: String! # JSON string
    version: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ExecutionStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
    WAITING
  }

  # Progress tracking types
  type ProgressReport {
    id: ID!
    workflowExecutionId: ID!
    completedTasks: Int!
    totalTasks: Int!
    estimatedCompletion: DateTime
    blockers: [Blocker!]!
    milestones: [Milestone!]!
  }

  type Blocker {
    id: ID!
    taskExecutionId: ID!
    description: String!
    createdAt: DateTime!
    resolvedAt: DateTime
  }

  type Milestone {
    id: ID!
    name: String!
    description: String
    achieved: Boolean!
    achievedAt: DateTime
  }

  # Webhook types
  type WebhookRegistration {
    id: ID!
    url: String!
    events: [String!]!
    secret: String
    active: Boolean!
    createdAt: DateTime!
  }

  # Queries
  type Query {
    # Workflow definition queries
    workflowDefinition(id: ID!): WorkflowDefinition
    workflowDefinitions(limit: Int, offset: Int): [WorkflowDefinition!]!
    
    # Workflow execution queries
    workflowExecution(id: ID!): WorkflowExecution
    workflowExecutions(
      status: ExecutionStatus, 
      workflowDefinitionId: ID,
      limit: Int, 
      offset: Int
    ): [WorkflowExecution!]!
    
    # Task execution queries
    taskExecution(id: ID!): TaskExecution
    taskExecutions(
      workflowExecutionId: ID!, 
      status: ExecutionStatus,
      limit: Int, 
      offset: Int
    ): [TaskExecution!]!
    
    # Progress tracking queries
    progressReport(workflowExecutionId: ID!): ProgressReport
    
    # Webhook queries
    webhookRegistrations: [WebhookRegistration!]!
  }

  # Mutations
  type Mutation {
    # Workflow definition mutations
    createWorkflowDefinition(input: CreateWorkflowDefinitionInput!): WorkflowDefinition!
    updateWorkflowDefinition(id: ID!, input: UpdateWorkflowDefinitionInput!): WorkflowDefinition!
    deleteWorkflowDefinition(id: ID!): Boolean!
    
    # Workflow execution mutations
    startWorkflowExecution(input: StartWorkflowExecutionInput!): WorkflowExecution!
    cancelWorkflowExecution(id: ID!): WorkflowExecution!
    
    # Task execution mutations
    retryTaskExecution(id: ID!): TaskExecution!
    
    # Webhook mutations
    registerWebhook(input: RegisterWebhookInput!): WebhookRegistration!
    updateWebhook(id: ID!, input: UpdateWebhookInput!): WebhookRegistration!
    deleteWebhook(id: ID!): Boolean!
  }

  # Subscriptions
  type Subscription {
    workflowExecutionUpdated(id: ID!): WorkflowExecution!
    taskExecutionUpdated(workflowExecutionId: ID!): TaskExecution!
    progressReportUpdated(workflowExecutionId: ID!): ProgressReport!
  }

  # Input types
  input CreateWorkflowDefinitionInput {
    name: String!
    description: String
    tasks: [TaskDefinitionInput!]!
    synchronizationPoints: [SynchronizationPointInput!]!
  }

  input TaskDefinitionInput {
    name: String!
    description: String
    resourceRequirements: ResourceRequirementsInput
    dependencies: [ID!]
    timeout: Int
    retryPolicy: RetryPolicyInput
  }

  input ResourceRequirementsInput {
    cpu: Float
    memory: Int
    storage: Int
    custom: [CustomResourceInput!]
  }

  input CustomResourceInput {
    name: String!
    value: String!
  }

  input RetryPolicyInput {
    maxRetries: Int!
    backoffMultiplier: Float
    maxBackoff: Int
  }

  input SynchronizationPointInput {
    name: String!
    description: String
    requiredTasks: [ID!]!
    timeout: Int
  }

  input UpdateWorkflowDefinitionInput {
    name: String
    description: String
    tasks: [TaskDefinitionInput!]
    synchronizationPoints: [SynchronizationPointInput!]
  }

  input StartWorkflowExecutionInput {
    workflowDefinitionId: ID!
    initialContext: String # JSON string
  }

  input RegisterWebhookInput {
    url: String!
    events: [String!]!
    secret: String
  }

  input UpdateWebhookInput {
    url: String
    events: [String!]
    secret: String
    active: Boolean
  }
`;

