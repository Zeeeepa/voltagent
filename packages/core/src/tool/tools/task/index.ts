import { AddTaskTool } from "./add-task";
import { GetTaskTool } from "./get-task";
import { GetTasksTool } from "./get-tasks";
import { UpdateTaskTool } from "./update-task";
import { RemoveTaskTool } from "./remove-task";
import { AddSubtaskTool } from "./add-subtask";
import { UpdateSubtaskTool } from "./update-subtask";
import { RemoveSubtaskTool } from "./remove-subtask";
import { ClearSubtasksTool } from "./clear-subtasks";
import { AddDependencyTool } from "./add-dependency";
import { RemoveDependencyTool } from "./remove-dependency";
import { SetTaskStatusTool } from "./set-task-status";
import { NextTaskTool } from "./next-task";
import { ExpandTaskTool } from "./expand-task";
import { ExpandAllTool } from "./expand-all";
import { ValidateDependenciesTool } from "./validate-dependencies";
import { FixDependenciesTool } from "./fix-dependencies";
import type { Toolkit } from "../../toolkit";

/**
 * Create a toolkit with all task management tools
 * @returns A toolkit with all task management tools
 */
export function createTaskManagementToolkit(): Toolkit {
  return {
    name: "task-management",
    description: "Tools for managing tasks and subtasks",
    tools: [
      AddTaskTool,
      GetTaskTool,
      GetTasksTool,
      UpdateTaskTool,
      RemoveTaskTool,
      AddSubtaskTool,
      UpdateSubtaskTool,
      RemoveSubtaskTool,
      ClearSubtasksTool,
      AddDependencyTool,
      RemoveDependencyTool,
      SetTaskStatusTool,
      NextTaskTool,
      ExpandTaskTool,
      ExpandAllTool,
      ValidateDependenciesTool,
      FixDependenciesTool,
    ],
  };
}

export {
  AddTaskTool,
  GetTaskTool,
  GetTasksTool,
  UpdateTaskTool,
  RemoveTaskTool,
  AddSubtaskTool,
  UpdateSubtaskTool,
  RemoveSubtaskTool,
  ClearSubtasksTool,
  AddDependencyTool,
  RemoveDependencyTool,
  SetTaskStatusTool,
  NextTaskTool,
  ExpandTaskTool,
  ExpandAllTool,
  ValidateDependenciesTool,
  FixDependenciesTool,
};

