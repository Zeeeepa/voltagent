/**
 * add-task.ts
 * Direct function implementation for adding a new task
 */

import fs from 'fs';
import { DirectFunctionArgs, DirectFunctionContext, DirectFunctionResult, Logger, Task, TasksData } from '../types';
import { getAnthropicClientForTaskManager, getModelConfig } from '../utils/ai-client-utils';

/**
 * Direct function wrapper for adding a new task with error handling.
 *
 * @param args - Command arguments
 * @param log - Logger object
 * @param context - Additional context (reportProgress, session)
 * @returns Result object
 */
export async function addTaskDirect(
  args: DirectFunctionArgs, 
  log: Logger, 
  context: DirectFunctionContext = {}
): Promise<DirectFunctionResult<{ taskId: number; message: string }>> {
  // Destructure expected args
  const { tasksJsonPath, prompt, dependencies, priority } = args;
  try {
    // Check if tasksJsonPath was provided
    if (!tasksJsonPath) {
      log.error('addTaskDirect called without tasksJsonPath');
      return {
        success: false,
        error: {
          code: 'MISSING_ARGUMENT',
          message: 'tasksJsonPath is required'
        }
      };
    }

    // Use provided path
    const tasksPath = tasksJsonPath;

    // Check if this is manual task creation or AI-driven task creation
    const isManualCreation = args.title && args.description;

    // Check required parameters
    if (!args.prompt && !isManualCreation) {
      log.error(
        'Missing required parameters: either prompt or title+description must be provided'
      );
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message:
            'Either the prompt parameter or both title and description parameters are required for adding a task'
        }
      };
    }

    // Extract and prepare parameters
    const taskPrompt = prompt;
    const taskDependencies = Array.isArray(dependencies)
      ? dependencies
      : dependencies
        ? String(dependencies)
            .split(',')
            .map((id) => parseInt(id.trim(), 10))
        : [];
    const taskPriority = priority || 'medium';

    // Extract context parameters for advanced functionality
    const { session } = context;

    // Read existing tasks to provide context and determine next task ID
    let tasksData: TasksData;
    try {
      tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    } catch (error) {
      log.warn(`Could not read existing tasks for context: ${(error as Error).message}`);
      tasksData = { tasks: [] };
    }

    // Determine the next task ID
    const nextTaskId = tasksData.tasks.length > 0 
      ? Math.max(...tasksData.tasks.map(task => task.id)) + 1 
      : 1;

    if (isManualCreation) {
      // Create manual task data object
      const newTask: Task = {
        id: nextTaskId,
        title: args.title!,
        description: args.description,
        details: args.details || '',
        testStrategy: args.testStrategy || '',
        status: 'todo',
        priority: (taskPriority as 'high' | 'medium' | 'low'),
        dependencies: taskDependencies.length > 0 ? taskDependencies : undefined
      };

      log.info(
        `Adding new task manually with title: "${args.title}", dependencies: [${taskDependencies.join(', ')}], priority: ${priority}`
      );

      // Add the task to the tasks array
      tasksData.tasks.push(newTask);

      // Update the metadata
      if (!tasksData.metadata) {
        tasksData.metadata = {};
      }
      tasksData.metadata.updatedAt = new Date().toISOString();

      // Write the updated tasks back to the file
      fs.writeFileSync(tasksPath, JSON.stringify(tasksData, null, 2));

      return {
        success: true,
        data: {
          taskId: nextTaskId,
          message: `Successfully added new task #${nextTaskId}`
        }
      };
    } else {
      // AI-driven task creation
      log.info(
        `Adding new task with prompt: "${prompt}", dependencies: [${taskDependencies.join(', ')}], priority: ${priority}`
      );

      // Initialize AI client with session environment
      let localAnthropic;
      try {
        localAnthropic = getAnthropicClientForTaskManager(session, log);
      } catch (error) {
        log.error(`Failed to initialize Anthropic client: ${(error as Error).message}`);
        return {
          success: false,
          error: {
            code: 'AI_CLIENT_ERROR',
            message: `Cannot initialize AI client: ${(error as Error).message}`
          }
        };
      }

      // Get model configuration from session
      const modelConfig = getModelConfig(session);

      // Build prompts for AI
      const systemPrompt = `You are an AI assistant helping to create a new software development task based on a user's description.
Your job is to create a well-structured task with a clear title, description, and implementation details.
Format your response as a JSON object with the following structure:
{
  "title": "Brief, specific task title",
  "description": "Detailed explanation of what needs to be done",
  "details": "Technical implementation details, approach, and considerations",
  "testStrategy": "How this task should be tested"
}`;

      const userPrompt = `Create a new development task based on this description:
${taskPrompt}

${tasksData.tasks.length > 0 ? `
Here are the existing tasks in the project for context:
${tasksData.tasks.map(t => `#${t.id}: ${t.title}`).join('\n')}
` : ''}

${taskDependencies.length > 0 ? `
This task depends on the following task IDs: ${taskDependencies.join(', ')}
` : ''}

Priority: ${taskPriority}

Respond with a JSON object containing title, description, details, and testStrategy.`;

      // Make the AI call
      let responseText;
      try {
        const response = await localAnthropic.messages.create({
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt
        });
        
        responseText = response.content[0].text;
      } catch (error) {
        log.error(`AI processing failed: ${(error as Error).message}`);
        return {
          success: false,
          error: {
            code: 'AI_PROCESSING_ERROR',
            message: `Failed to generate task with AI: ${(error as Error).message}`
          }
        };
      }

      // Parse the AI response
      let taskDataFromAI;
      try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response');
        }
        
        taskDataFromAI = JSON.parse(jsonMatch[0]);
        
        // Validate required fields
        if (!taskDataFromAI.title) {
          throw new Error('Task title is missing from AI response');
        }
      } catch (error) {
        log.error(`Failed to parse AI response: ${(error as Error).message}`);
        return {
          success: false,
          error: {
            code: 'RESPONSE_PARSING_ERROR',
            message: `Failed to parse AI response: ${(error as Error).message}`
          }
        };
      }

      // Create the new task
      const newTask: Task = {
        id: nextTaskId,
        title: taskDataFromAI.title,
        description: taskDataFromAI.description || '',
        details: taskDataFromAI.details || '',
        testStrategy: taskDataFromAI.testStrategy || '',
        status: 'todo',
        priority: (taskPriority as 'high' | 'medium' | 'low'),
        dependencies: taskDependencies.length > 0 ? taskDependencies : undefined
      };

      // Add the task to the tasks array
      tasksData.tasks.push(newTask);

      // Update the metadata
      if (!tasksData.metadata) {
        tasksData.metadata = {};
      }
      tasksData.metadata.updatedAt = new Date().toISOString();

      // Write the updated tasks back to the file
      fs.writeFileSync(tasksPath, JSON.stringify(tasksData, null, 2));

      return {
        success: true,
        data: {
          taskId: nextTaskId,
          message: `Successfully added new task #${nextTaskId}`
        }
      };
    }
  } catch (error: any) {
    log.error(`Error in addTaskDirect: ${error.message}`);
    return {
      success: false,
      error: {
        code: 'ADD_TASK_ERROR',
        message: error.message
      }
    };
  }
}

