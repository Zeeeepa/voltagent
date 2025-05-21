# Workflow Orchestration API Reference

This document provides a reference for the Workflow Orchestration API endpoints.

## Authentication

All API requests require authentication using a JWT token. Include the token in the `Authorization` header:

```
Authorization: Bearer your-jwt-token
```

To obtain a token, make a POST request to the `/api/auth/login` endpoint with your credentials:

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

## API Versioning

The API supports versioning to ensure backward compatibility. You can specify the API version in two ways:

1. URL-based versioning:

```
/api/v1/workflows
/api/v2/workflows
```

2. Header-based versioning:

```
Accept: application/vnd.workflow-orchestration.v1+json
```

## RESTful API Endpoints

### Workflow Definitions

#### Get all workflow definitions

```http
GET /api/workflows
```

Query parameters:
- `limit` (optional): Maximum number of workflows to return (default: 10)
- `offset` (optional): Number of workflows to skip (default: 0)

Response:
```json
[
  {
    "id": "1",
    "name": "Sample Workflow",
    "description": "A sample workflow definition",
    "version": "1.0.0",
    "createdAt": "2025-05-21T21:26:58.211Z",
    "updatedAt": "2025-05-21T21:27:09.442Z",
    "tasks": [],
    "synchronizationPoints": []
  }
]
```

#### Get a workflow definition by ID

```http
GET /api/workflows/{id}
```

Response:
```json
{
  "id": "1",
  "name": "Sample Workflow",
  "description": "A sample workflow definition",
  "version": "1.0.0",
  "createdAt": "2025-05-21T21:26:58.211Z",
  "updatedAt": "2025-05-21T21:27:09.442Z",
  "tasks": [
    {
      "id": "task-1",
      "name": "Task 1",
      "description": "First task",
      "resourceRequirements": null,
      "dependencies": [],
      "timeout": null,
      "retryPolicy": null
    },
    {
      "id": "task-2",
      "name": "Task 2",
      "description": "Second task",
      "resourceRequirements": null,
      "dependencies": ["task-1"],
      "timeout": null,
      "retryPolicy": null
    }
  ],
  "synchronizationPoints": [
    {
      "id": "sync-1",
      "name": "All Tasks Completed",
      "description": "Wait for all tasks to complete",
      "requiredTasks": ["task-1", "task-2"],
      "timeout": null
    }
  ]
}
```

#### Create a workflow definition

```http
POST /api/workflows
Content-Type: application/json

{
  "name": "Sample Workflow",
  "description": "A sample workflow definition",
  "tasks": [
    {
      "name": "Task 1",
      "description": "First task"
    },
    {
      "name": "Task 2",
      "description": "Second task",
      "dependencies": ["task-1"]
    }
  ],
  "synchronizationPoints": [
    {
      "name": "All Tasks Completed",
      "description": "Wait for all tasks to complete",
      "requiredTasks": ["task-1", "task-2"]
    }
  ]
}
```

Response:
```json
{
  "id": "1",
  "name": "Sample Workflow",
  "description": "A sample workflow definition",
  "version": "1.0.0",
  "createdAt": "2025-05-21T21:26:58.211Z",
  "updatedAt": "2025-05-21T21:27:09.442Z",
  "tasks": [
    {
      "id": "task-1",
      "name": "Task 1",
      "description": "First task",
      "resourceRequirements": null,
      "dependencies": [],
      "timeout": null,
      "retryPolicy": null
    },
    {
      "id": "task-2",
      "name": "Task 2",
      "description": "Second task",
      "resourceRequirements": null,
      "dependencies": ["task-1"],
      "timeout": null,
      "retryPolicy": null
    }
  ],
  "synchronizationPoints": [
    {
      "id": "sync-1",
      "name": "All Tasks Completed",
      "description": "Wait for all tasks to complete",
      "requiredTasks": ["task-1", "task-2"],
      "timeout": null
    }
  ]
}
```

#### Update a workflow definition

```http
PUT /api/workflows/{id}
Content-Type: application/json

{
  "name": "Updated Workflow",
  "description": "An updated workflow definition",
  "tasks": [
    {
      "name": "Task 1",
      "description": "Updated first task"
    },
    {
      "name": "Task 2",
      "description": "Updated second task",
      "dependencies": ["task-1"]
    },
    {
      "name": "Task 3",
      "description": "New task",
      "dependencies": ["task-2"]
    }
  ],
  "synchronizationPoints": [
    {
      "name": "All Tasks Completed",
      "description": "Wait for all tasks to complete",
      "requiredTasks": ["task-1", "task-2", "task-3"]
    }
  ]
}
```

Response:
```json
{
  "id": "1",
  "name": "Updated Workflow",
  "description": "An updated workflow definition",
  "version": "1.0.1",
  "createdAt": "2025-05-21T21:26:58.211Z",
  "updatedAt": "2025-05-21T21:27:09.442Z",
  "tasks": [
    {
      "id": "task-1",
      "name": "Task 1",
      "description": "Updated first task",
      "resourceRequirements": null,
      "dependencies": [],
      "timeout": null,
      "retryPolicy": null
    },
    {
      "id": "task-2",
      "name": "Task 2",
      "description": "Updated second task",
      "resourceRequirements": null,
      "dependencies": ["task-1"],
      "timeout": null,
      "retryPolicy": null
    },
    {
      "id": "task-3",
      "name": "Task 3",
      "description": "New task",
      "resourceRequirements": null,
      "dependencies": ["task-2"],
      "timeout": null,
      "retryPolicy": null
    }
  ],
  "synchronizationPoints": [
    {
      "id": "sync-1",
      "name": "All Tasks Completed",
      "description": "Wait for all tasks to complete",
      "requiredTasks": ["task-1", "task-2", "task-3"],
      "timeout": null
    }
  ]
}
```

#### Delete a workflow definition

```http
DELETE /api/workflows/{id}
```

Response: 204 No Content

### Workflow Executions

#### Start a workflow execution

```http
POST /api/executions
Content-Type: application/json

{
  "workflowDefinitionId": "1",
  "initialContext": {
    "key": "value"
  }
}
```

Response:
```json
{
  "id": "1",
  "workflowDefinitionId": "1",
  "status": "RUNNING",
  "startTime": "2025-05-21T21:26:58.211Z",
  "endTime": null,
  "taskExecutions": [],
  "context": {
    "id": "1",
    "data": "{\"key\":\"value\"}",
    "version": 1,
    "createdAt": "2025-05-21T21:26:58.211Z",
    "updatedAt": "2025-05-21T21:26:58.211Z"
  }
}
```

#### Get a workflow execution by ID

```http
GET /api/executions/{id}
```

Response:
```json
{
  "id": "1",
  "workflowDefinitionId": "1",
  "status": "RUNNING",
  "startTime": "2025-05-21T21:26:58.211Z",
  "endTime": null,
  "taskExecutions": [
    {
      "id": "1",
      "taskDefinitionId": "task-1",
      "status": "COMPLETED",
      "startTime": "2025-05-21T21:26:58.211Z",
      "endTime": "2025-05-21T21:27:09.442Z",
      "attempts": 1,
      "error": null,
      "resources": null
    },
    {
      "id": "2",
      "taskDefinitionId": "task-2",
      "status": "RUNNING",
      "startTime": "2025-05-21T21:27:09.442Z",
      "endTime": null,
      "attempts": 1,
      "error": null,
      "resources": null
    }
  ],
  "context": {
    "id": "1",
    "data": "{\"key\":\"value\",\"task-1-result\":\"success\"}",
    "version": 2,
    "createdAt": "2025-05-21T21:26:58.211Z",
    "updatedAt": "2025-05-21T21:27:09.442Z"
  }
}
```

#### Cancel a workflow execution

```http
POST /api/executions/{id}/cancel
```

Response:
```json
{
  "id": "1",
  "workflowDefinitionId": "1",
  "status": "CANCELLED",
  "startTime": "2025-05-21T21:26:58.211Z",
  "endTime": "2025-05-21T21:27:09.442Z",
  "taskExecutions": [
    {
      "id": "1",
      "taskDefinitionId": "task-1",
      "status": "COMPLETED",
      "startTime": "2025-05-21T21:26:58.211Z",
      "endTime": "2025-05-21T21:27:09.442Z",
      "attempts": 1,
      "error": null,
      "resources": null
    },
    {
      "id": "2",
      "taskDefinitionId": "task-2",
      "status": "CANCELLED",
      "startTime": "2025-05-21T21:27:09.442Z",
      "endTime": "2025-05-21T21:27:09.442Z",
      "attempts": 1,
      "error": null,
      "resources": null
    }
  ],
  "context": {
    "id": "1",
    "data": "{\"key\":\"value\",\"task-1-result\":\"success\"}",
    "version": 2,
    "createdAt": "2025-05-21T21:26:58.211Z",
    "updatedAt": "2025-05-21T21:27:09.442Z"
  }
}
```

### Task Executions

#### Get task executions for a workflow execution

```http
GET /api/executions/{executionId}/tasks
```

Query parameters:
- `status` (optional): Filter by task status (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, WAITING)
- `limit` (optional): Maximum number of tasks to return (default: 10)
- `offset` (optional): Number of tasks to skip (default: 0)

Response:
```json
[
  {
    "id": "1",
    "taskDefinitionId": "task-1",
    "status": "COMPLETED",
    "startTime": "2025-05-21T21:26:58.211Z",
    "endTime": "2025-05-21T21:27:09.442Z",
    "attempts": 1,
    "error": null,
    "resources": null
  },
  {
    "id": "2",
    "taskDefinitionId": "task-2",
    "status": "RUNNING",
    "startTime": "2025-05-21T21:27:09.442Z",
    "endTime": null,
    "attempts": 1,
    "error": null,
    "resources": null
  }
]
```

#### Retry a failed task execution

```http
POST /api/tasks/{id}/retry
```

Response:
```json
{
  "id": "2",
  "taskDefinitionId": "task-2",
  "status": "RUNNING",
  "startTime": "2025-05-21T21:27:09.442Z",
  "endTime": null,
  "attempts": 2,
  "error": null,
  "resources": null
}
```

### Progress Tracking

#### Get progress report for a workflow execution

```http
GET /api/executions/{id}/progress
```

Response:
```json
{
  "id": "1",
  "workflowExecutionId": "1",
  "completedTasks": 2,
  "totalTasks": 5,
  "estimatedCompletion": "2025-05-21T22:27:09.442Z",
  "blockers": [],
  "milestones": [
    {
      "id": "1",
      "name": "Initialization",
      "description": "Workflow initialization",
      "achieved": true,
      "achievedAt": "2025-05-21T21:27:09.442Z"
    }
  ]
}
```

### Webhooks

#### Get all webhook registrations

```http
GET /api/webhooks
```

Response:
```json
[
  {
    "id": "1",
    "url": "https://example.com/webhook",
    "events": ["workflow.execution.completed", "task.execution.failed"],
    "secret": null,
    "active": true,
    "createdAt": "2025-05-21T21:26:58.211Z"
  }
]
```

#### Register a webhook

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["workflow.execution.completed", "task.execution.failed"],
  "secret": "webhook-secret"
}
```

Response:
```json
{
  "id": "1",
  "url": "https://example.com/webhook",
  "events": ["workflow.execution.completed", "task.execution.failed"],
  "secret": "webhook-secret",
  "active": true,
  "createdAt": "2025-05-21T21:26:58.211Z"
}
```

#### Update a webhook registration

```http
PUT /api/webhooks/{id}
Content-Type: application/json

{
  "url": "https://example.com/updated-webhook",
  "events": ["workflow.execution.completed", "task.execution.failed", "workflow.execution.started"],
  "active": true
}
```

Response:
```json
{
  "id": "1",
  "url": "https://example.com/updated-webhook",
  "events": ["workflow.execution.completed", "task.execution.failed", "workflow.execution.started"],
  "secret": "webhook-secret",
  "active": true,
  "createdAt": "2025-05-21T21:26:58.211Z"
}
```

#### Delete a webhook registration

```http
DELETE /api/webhooks/{id}
```

Response: 204 No Content

#### Test a webhook

```http
POST /api/webhooks/test
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "event": "workflow.execution.completed",
  "payload": {
    "id": "1",
    "status": "COMPLETED"
  },
  "secret": "webhook-secret"
}
```

Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Webhook delivered successfully"
}
```

## GraphQL API

The GraphQL API is available at `/graphql`. You can use the GraphQL Playground at this endpoint to explore the API.

### Example Queries

#### Get a workflow definition

```graphql
query GetWorkflowDefinition($id: ID!) {
  workflowDefinition(id: $id) {
    id
    name
    description
    version
    createdAt
    updatedAt
    tasks {
      id
      name
      description
      dependencies
    }
    synchronizationPoints {
      id
      name
      description
      requiredTasks
    }
  }
}
```

Variables:
```json
{
  "id": "1"
}
```

#### Get a workflow execution with task executions

```graphql
query GetWorkflowExecution($id: ID!) {
  workflowExecution(id: $id) {
    id
    workflowDefinitionId
    status
    startTime
    endTime
    taskExecutions {
      id
      taskDefinitionId
      status
      startTime
      endTime
      attempts
      error
    }
    context {
      id
      data
      version
      createdAt
      updatedAt
    }
  }
}
```

Variables:
```json
{
  "id": "1"
}
```

#### Get progress report for a workflow execution

```graphql
query GetProgressReport($id: ID!) {
  progressReport(workflowExecutionId: $id) {
    id
    workflowExecutionId
    completedTasks
    totalTasks
    estimatedCompletion
    blockers {
      id
      taskExecutionId
      description
      createdAt
      resolvedAt
    }
    milestones {
      id
      name
      description
      achieved
      achievedAt
    }
  }
}
```

Variables:
```json
{
  "id": "1"
}
```

### Example Mutations

#### Create a workflow definition

```graphql
mutation CreateWorkflowDefinition($input: CreateWorkflowDefinitionInput!) {
  createWorkflowDefinition(input: $input) {
    id
    name
    description
    version
    createdAt
    updatedAt
    tasks {
      id
      name
      description
      dependencies
    }
    synchronizationPoints {
      id
      name
      description
      requiredTasks
    }
  }
}
```

Variables:
```json
{
  "input": {
    "name": "Sample Workflow",
    "description": "A sample workflow definition",
    "tasks": [
      {
        "name": "Task 1",
        "description": "First task"
      },
      {
        "name": "Task 2",
        "description": "Second task",
        "dependencies": ["task-1"]
      }
    ],
    "synchronizationPoints": [
      {
        "name": "All Tasks Completed",
        "description": "Wait for all tasks to complete",
        "requiredTasks": ["task-1", "task-2"]
      }
    ]
  }
}
```

#### Start a workflow execution

```graphql
mutation StartWorkflowExecution($input: StartWorkflowExecutionInput!) {
  startWorkflowExecution(input: $input) {
    id
    workflowDefinitionId
    status
    startTime
    endTime
    context {
      id
      data
      version
      createdAt
      updatedAt
    }
  }
}
```

Variables:
```json
{
  "input": {
    "workflowDefinitionId": "1",
    "initialContext": "{\"key\":\"value\"}"
  }
}
```

#### Register a webhook

```graphql
mutation RegisterWebhook($input: RegisterWebhookInput!) {
  registerWebhook(input: $input) {
    id
    url
    events
    secret
    active
    createdAt
  }
}
```

Variables:
```json
{
  "input": {
    "url": "https://example.com/webhook",
    "events": ["workflow.execution.completed", "task.execution.failed"],
    "secret": "webhook-secret"
  }
}
```

### Example Subscriptions

#### Subscribe to workflow execution updates

```graphql
subscription WorkflowExecutionUpdates($id: ID!) {
  workflowExecutionUpdated(id: $id) {
    id
    status
    startTime
    endTime
    taskExecutions {
      id
      taskDefinitionId
      status
      startTime
      endTime
      attempts
      error
    }
  }
}
```

Variables:
```json
{
  "id": "1"
}
```

#### Subscribe to task execution updates

```graphql
subscription TaskExecutionUpdates($workflowExecutionId: ID!) {
  taskExecutionUpdated(workflowExecutionId: $workflowExecutionId) {
    id
    taskDefinitionId
    status
    startTime
    endTime
    attempts
    error
  }
}
```

Variables:
```json
{
  "workflowExecutionId": "1"
}
```

#### Subscribe to progress report updates

```graphql
subscription ProgressReportUpdates($workflowExecutionId: ID!) {
  progressReportUpdated(workflowExecutionId: $workflowExecutionId) {
    id
    workflowExecutionId
    completedTasks
    totalTasks
    estimatedCompletion
    blockers {
      id
      taskExecutionId
      description
      createdAt
      resolvedAt
    }
    milestones {
      id
      name
      description
      achieved
      achievedAt
    }
  }
}
```

Variables:
```json
{
  "workflowExecutionId": "1"
}
```

