# Workflow Orchestration SDK Usage Guide

This guide provides examples of how to use the Workflow Orchestration SDK in different programming languages.

## TypeScript/JavaScript SDK

### Installation

```bash
npm install @workflow-orchestration/typescript-sdk
```

### Usage

```typescript
import { WorkflowOrchestrationClient, Configuration } from '@workflow-orchestration/typescript-sdk';

// Create a client instance
const config = new Configuration({
  basePath: 'http://localhost:3000/api',
  accessToken: 'your-jwt-token'
});
const client = new WorkflowOrchestrationClient(config);

// Create a workflow definition
async function createWorkflow() {
  try {
    const workflow = await client.createWorkflowDefinition({
      name: 'Sample Workflow',
      description: 'A sample workflow definition',
      tasks: [
        {
          name: 'Task 1',
          description: 'First task'
        },
        {
          name: 'Task 2',
          description: 'Second task',
          dependencies: ['task-1']
        }
      ],
      synchronizationPoints: [
        {
          name: 'All Tasks Completed',
          description: 'Wait for all tasks to complete',
          requiredTasks: ['task-1', 'task-2']
        }
      ]
    });
    
    console.log('Workflow created:', workflow);
    return workflow;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
}

// Start a workflow execution
async function startWorkflowExecution(workflowDefinitionId) {
  try {
    const execution = await client.startWorkflowExecution({
      workflowDefinitionId,
      initialContext: {
        key: 'value'
      }
    });
    
    console.log('Workflow execution started:', execution);
    return execution;
  } catch (error) {
    console.error('Error starting workflow execution:', error);
    throw error;
  }
}

// Get workflow execution progress
async function getWorkflowProgress(executionId) {
  try {
    const progress = await client.getProgressReport(executionId);
    console.log('Workflow progress:', progress);
    return progress;
  } catch (error) {
    console.error('Error getting workflow progress:', error);
    throw error;
  }
}

// Register a webhook
async function registerWebhook() {
  try {
    const webhook = await client.registerWebhook({
      url: 'https://example.com/webhook',
      events: ['workflow.execution.completed', 'task.execution.failed'],
      secret: 'webhook-secret'
    });
    
    console.log('Webhook registered:', webhook);
    return webhook;
  } catch (error) {
    console.error('Error registering webhook:', error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const workflow = await createWorkflow();
    const execution = await startWorkflowExecution(workflow.id);
    await getWorkflowProgress(execution.id);
    await registerWebhook();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
```

## Python SDK

### Installation

```bash
pip install workflow-orchestration-sdk
```

### Usage

```python
from workflow_orchestration_sdk import Configuration, ApiClient, WorkflowsApi, ExecutionsApi, WebhooksApi

# Create a client instance
config = Configuration(
    host="http://localhost:3000/api",
    access_token="your-jwt-token"
)
client = ApiClient(config)

# Create API instances
workflows_api = WorkflowsApi(client)
executions_api = ExecutionsApi(client)
webhooks_api = WebhooksApi(client)

# Create a workflow definition
def create_workflow():
    try:
        workflow = workflows_api.create_workflow_definition({
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
        })
        
        print("Workflow created:", workflow)
        return workflow
    except Exception as e:
        print("Error creating workflow:", e)
        raise e

# Start a workflow execution
def start_workflow_execution(workflow_definition_id):
    try:
        execution = executions_api.start_workflow_execution({
            "workflowDefinitionId": workflow_definition_id,
            "initialContext": {
                "key": "value"
            }
        })
        
        print("Workflow execution started:", execution)
        return execution
    except Exception as e:
        print("Error starting workflow execution:", e)
        raise e

# Get workflow execution progress
def get_workflow_progress(execution_id):
    try:
        progress = executions_api.get_progress_report(execution_id)
        print("Workflow progress:", progress)
        return progress
    except Exception as e:
        print("Error getting workflow progress:", e)
        raise e

# Register a webhook
def register_webhook():
    try:
        webhook = webhooks_api.register_webhook({
            "url": "https://example.com/webhook",
            "events": ["workflow.execution.completed", "task.execution.failed"],
            "secret": "webhook-secret"
        })
        
        print("Webhook registered:", webhook)
        return webhook
    except Exception as e:
        print("Error registering webhook:", e)
        raise e

# Example usage
def main():
    try:
        workflow = create_workflow()
        execution = start_workflow_execution(workflow.id)
        get_workflow_progress(execution.id)
        register_webhook()
    except Exception as e:
        print("Error in main:", e)

if __name__ == "__main__":
    main()
```

## Java SDK

### Installation

#### Maven

```xml
<dependency>
  <groupId>com.workfloworchestration</groupId>
  <artifactId>workflow-orchestration-sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

#### Gradle

```groovy
implementation 'com.workfloworchestration:workflow-orchestration-sdk:1.0.0'
```

### Usage

```java
import com.workfloworchestration.sdk.ApiClient;
import com.workfloworchestration.sdk.ApiException;
import com.workfloworchestration.sdk.Configuration;
import com.workfloworchestration.sdk.auth.ApiKeyAuth;
import com.workfloworchestration.sdk.api.WorkflowsApi;
import com.workfloworchestration.sdk.api.ExecutionsApi;
import com.workfloworchestration.sdk.api.WebhooksApi;
import com.workfloworchestration.sdk.model.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class WorkflowOrchestrationExample {
    
    private final WorkflowsApi workflowsApi;
    private final ExecutionsApi executionsApi;
    private final WebhooksApi webhooksApi;
    
    public WorkflowOrchestrationExample(String basePath, String token) {
        ApiClient client = Configuration.getDefaultApiClient();
        client.setBasePath(basePath);
        
        // Configure API key authorization: bearerAuth
        ApiKeyAuth bearerAuth = (ApiKeyAuth) client.getAuthentication("bearerAuth");
        bearerAuth.setApiKey(token);
        bearerAuth.setApiKeyPrefix("Bearer");
        
        workflowsApi = new WorkflowsApi(client);
        executionsApi = new ExecutionsApi(client);
        webhooksApi = new WebhooksApi(client);
    }
    
    public WorkflowDefinition createWorkflow() throws ApiException {
        CreateWorkflowDefinitionInput input = new CreateWorkflowDefinitionInput();
        input.setName("Sample Workflow");
        input.setDescription("A sample workflow definition");
        
        // Create tasks
        TaskDefinitionInput task1 = new TaskDefinitionInput();
        task1.setName("Task 1");
        task1.setDescription("First task");
        
        TaskDefinitionInput task2 = new TaskDefinitionInput();
        task2.setName("Task 2");
        task2.setDescription("Second task");
        task2.setDependencies(Arrays.asList("task-1"));
        
        input.setTasks(Arrays.asList(task1, task2));
        
        // Create synchronization points
        SynchronizationPointInput syncPoint = new SynchronizationPointInput();
        syncPoint.setName("All Tasks Completed");
        syncPoint.setDescription("Wait for all tasks to complete");
        syncPoint.setRequiredTasks(Arrays.asList("task-1", "task-2"));
        
        input.setSynchronizationPoints(Arrays.asList(syncPoint));
        
        WorkflowDefinition workflow = workflowsApi.createWorkflowDefinition(input);
        System.out.println("Workflow created: " + workflow);
        return workflow;
    }
    
    public WorkflowExecution startWorkflowExecution(String workflowDefinitionId) throws ApiException {
        StartWorkflowExecutionInput input = new StartWorkflowExecutionInput();
        input.setWorkflowDefinitionId(workflowDefinitionId);
        
        Map<String, Object> context = new HashMap<>();
        context.put("key", "value");
        input.setInitialContext(context);
        
        WorkflowExecution execution = executionsApi.startWorkflowExecution(input);
        System.out.println("Workflow execution started: " + execution);
        return execution;
    }
    
    public ProgressReport getWorkflowProgress(String executionId) throws ApiException {
        ProgressReport progress = executionsApi.getProgressReport(executionId);
        System.out.println("Workflow progress: " + progress);
        return progress;
    }
    
    public WebhookRegistration registerWebhook() throws ApiException {
        RegisterWebhookInput input = new RegisterWebhookInput();
        input.setUrl("https://example.com/webhook");
        input.setEvents(Arrays.asList("workflow.execution.completed", "task.execution.failed"));
        input.setSecret("webhook-secret");
        
        WebhookRegistration webhook = webhooksApi.registerWebhook(input);
        System.out.println("Webhook registered: " + webhook);
        return webhook;
    }
    
    public static void main(String[] args) {
        try {
            WorkflowOrchestrationExample example = new WorkflowOrchestrationExample(
                "http://localhost:3000/api",
                "your-jwt-token"
            );
            
            WorkflowDefinition workflow = example.createWorkflow();
            WorkflowExecution execution = example.startWorkflowExecution(workflow.getId());
            example.getWorkflowProgress(execution.getId());
            example.registerWebhook();
        } catch (ApiException e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
```

## Go SDK

### Installation

```bash
go get github.com/workfloworchestration/go-sdk
```

### Usage

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/workfloworchestration/go-sdk/client"
	"github.com/workfloworchestration/go-sdk/models"
)

func main() {
	// Create a client instance
	cfg := client.NewConfiguration()
	cfg.Host = "localhost:3000"
	cfg.Scheme = "http"
	cfg.BasePath = "/api"
	cfg.DefaultHeader["Authorization"] = "Bearer your-jwt-token"
	
	c := client.NewAPIClient(cfg)
	ctx := context.Background()
	
	// Create a workflow definition
	workflow, err := createWorkflow(ctx, c)
	if err != nil {
		log.Fatalf("Error creating workflow: %v", err)
	}
	
	// Start a workflow execution
	execution, err := startWorkflowExecution(ctx, c, workflow.Id)
	if err != nil {
		log.Fatalf("Error starting workflow execution: %v", err)
	}
	
	// Get workflow execution progress
	_, err = getWorkflowProgress(ctx, c, execution.Id)
	if err != nil {
		log.Fatalf("Error getting workflow progress: %v", err)
	}
	
	// Register a webhook
	_, err = registerWebhook(ctx, c)
	if err != nil {
		log.Fatalf("Error registering webhook: %v", err)
	}
}

func createWorkflow(ctx context.Context, c *client.APIClient) (*models.WorkflowDefinition, error) {
	input := models.CreateWorkflowDefinitionInput{
		Name:        "Sample Workflow",
		Description: "A sample workflow definition",
		Tasks: []models.TaskDefinitionInput{
			{
				Name:        "Task 1",
				Description: "First task",
			},
			{
				Name:        "Task 2",
				Description: "Second task",
				Dependencies: []string{"task-1"},
			},
		},
		SynchronizationPoints: []models.SynchronizationPointInput{
			{
				Name:        "All Tasks Completed",
				Description: "Wait for all tasks to complete",
				RequiredTasks: []string{"task-1", "task-2"},
			},
		},
	}
	
	workflow, _, err := c.WorkflowsApi.CreateWorkflowDefinition(ctx).Body(input).Execute()
	if err != nil {
		return nil, err
	}
	
	fmt.Printf("Workflow created: %+v\n", workflow)
	return workflow, nil
}

func startWorkflowExecution(ctx context.Context, c *client.APIClient, workflowDefinitionId string) (*models.WorkflowExecution, error) {
	input := models.StartWorkflowExecutionInput{
		WorkflowDefinitionId: workflowDefinitionId,
		InitialContext:       map[string]interface{}{"key": "value"},
	}
	
	execution, _, err := c.ExecutionsApi.StartWorkflowExecution(ctx).Body(input).Execute()
	if err != nil {
		return nil, err
	}
	
	fmt.Printf("Workflow execution started: %+v\n", execution)
	return execution, nil
}

func getWorkflowProgress(ctx context.Context, c *client.APIClient, executionId string) (*models.ProgressReport, error) {
	progress, _, err := c.ExecutionsApi.GetProgressReport(ctx, executionId).Execute()
	if err != nil {
		return nil, err
	}
	
	fmt.Printf("Workflow progress: %+v\n", progress)
	return progress, nil
}

func registerWebhook(ctx context.Context, c *client.APIClient) (*models.WebhookRegistration, error) {
	input := models.RegisterWebhookInput{
		Url:    "https://example.com/webhook",
		Events: []string{"workflow.execution.completed", "task.execution.failed"},
		Secret: "webhook-secret",
	}
	
	webhook, _, err := c.WebhooksApi.RegisterWebhook(ctx).Body(input).Execute()
	if err != nil {
		return nil, err
	}
	
	fmt.Printf("Webhook registered: %+v\n", webhook)
	return webhook, nil
}
```

## C# SDK

### Installation

```bash
dotnet add package WorkflowOrchestration.SDK
```

### Usage

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WorkflowOrchestration.SDK.Api;
using WorkflowOrchestration.SDK.Client;
using WorkflowOrchestration.SDK.Model;

namespace WorkflowOrchestrationExample
{
    class Program
    {
        static async Task Main(string[] args)
        {
            try
            {
                // Create a client instance
                var config = new Configuration
                {
                    BasePath = "http://localhost:3000/api"
                };
                config.AddApiKey("Authorization", "Bearer your-jwt-token");
                
                var workflowsApi = new WorkflowsApi(config);
                var executionsApi = new ExecutionsApi(config);
                var webhooksApi = new WebhooksApi(config);
                
                // Create a workflow definition
                var workflow = await CreateWorkflow(workflowsApi);
                
                // Start a workflow execution
                var execution = await StartWorkflowExecution(executionsApi, workflow.Id);
                
                // Get workflow execution progress
                await GetWorkflowProgress(executionsApi, execution.Id);
                
                // Register a webhook
                await RegisterWebhook(webhooksApi);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }
        
        static async Task<WorkflowDefinition> CreateWorkflow(WorkflowsApi api)
        {
            var input = new CreateWorkflowDefinitionInput
            {
                Name = "Sample Workflow",
                Description = "A sample workflow definition",
                Tasks = new List<TaskDefinitionInput>
                {
                    new TaskDefinitionInput
                    {
                        Name = "Task 1",
                        Description = "First task"
                    },
                    new TaskDefinitionInput
                    {
                        Name = "Task 2",
                        Description = "Second task",
                        Dependencies = new List<string> { "task-1" }
                    }
                },
                SynchronizationPoints = new List<SynchronizationPointInput>
                {
                    new SynchronizationPointInput
                    {
                        Name = "All Tasks Completed",
                        Description = "Wait for all tasks to complete",
                        RequiredTasks = new List<string> { "task-1", "task-2" }
                    }
                }
            };
            
            var workflow = await api.CreateWorkflowDefinitionAsync(input);
            Console.WriteLine($"Workflow created: {workflow.Id}");
            return workflow;
        }
        
        static async Task<WorkflowExecution> StartWorkflowExecution(ExecutionsApi api, string workflowDefinitionId)
        {
            var input = new StartWorkflowExecutionInput
            {
                WorkflowDefinitionId = workflowDefinitionId,
                InitialContext = new Dictionary<string, object>
                {
                    { "key", "value" }
                }
            };
            
            var execution = await api.StartWorkflowExecutionAsync(input);
            Console.WriteLine($"Workflow execution started: {execution.Id}");
            return execution;
        }
        
        static async Task<ProgressReport> GetWorkflowProgress(ExecutionsApi api, string executionId)
        {
            var progress = await api.GetProgressReportAsync(executionId);
            Console.WriteLine($"Workflow progress: {progress.CompletedTasks}/{progress.TotalTasks}");
            return progress;
        }
        
        static async Task<WebhookRegistration> RegisterWebhook(WebhooksApi api)
        {
            var input = new RegisterWebhookInput
            {
                Url = "https://example.com/webhook",
                Events = new List<string> { "workflow.execution.completed", "task.execution.failed" },
                Secret = "webhook-secret"
            };
            
            var webhook = await api.RegisterWebhookAsync(input);
            Console.WriteLine($"Webhook registered: {webhook.Id}");
            return webhook;
        }
    }
}
```

