/**
 * task-master-core.ts
 * Central module that imports and re-exports all direct function implementations
 * for improved organization and maintainability.
 */

// Import direct function implementations
import { listTasksDirect } from '../direct-functions/list-tasks';
import { getCacheStatsDirect } from '../direct-functions/cache-stats';
import { parsePRDDirect } from '../direct-functions/parse-prd';
import { updateTasksDirect } from '../direct-functions/update-tasks';
import { updateTaskByIdDirect } from '../direct-functions/update-task-by-id';
import { updateSubtaskByIdDirect } from '../direct-functions/update-subtask-by-id';
import { generateTaskFilesDirect } from '../direct-functions/generate-task-files';
import { setTaskStatusDirect } from '../direct-functions/set-task-status';
import { showTaskDirect } from '../direct-functions/show-task';
import { nextTaskDirect } from '../direct-functions/next-task';
import { expandTaskDirect } from '../direct-functions/expand-task';
import { addTaskDirect } from '../direct-functions/add-task';
import { addSubtaskDirect } from '../direct-functions/add-subtask';
import { removeSubtaskDirect } from '../direct-functions/remove-subtask';
import { analyzeTaskComplexityDirect } from '../direct-functions/analyze-task-complexity';
import { clearSubtasksDirect } from '../direct-functions/clear-subtasks';
import { expandAllTasksDirect } from '../direct-functions/expand-all-tasks';
import { removeDependencyDirect } from '../direct-functions/remove-dependency';
import { validateDependenciesDirect } from '../direct-functions/validate-dependencies';
import { fixDependenciesDirect } from '../direct-functions/fix-dependencies';
import { complexityReportDirect } from '../direct-functions/complexity-report';
import { addDependencyDirect } from '../direct-functions/add-dependency';
import { removeTaskDirect } from '../direct-functions/remove-task';
import { initializeProjectDirect } from '../direct-functions/initialize-project';

// Re-export utility functions
export { findTasksJsonPath } from '../utils/path-utils';

// Re-export AI client utilities
export {
  getAnthropicClientForTaskManager,
  getPerplexityClientForTaskManager,
  getModelConfig,
  getBestAvailableAIModel,
  handleClaudeError
} from '../utils/ai-client-utils';

// Use Map for potential future enhancements like introspection or dynamic dispatch
export const directFunctions = new Map([
  ['listTasksDirect', listTasksDirect],
  ['getCacheStatsDirect', getCacheStatsDirect],
  ['parsePRDDirect', parsePRDDirect],
  ['updateTasksDirect', updateTasksDirect],
  ['updateTaskByIdDirect', updateTaskByIdDirect],
  ['updateSubtaskByIdDirect', updateSubtaskByIdDirect],
  ['generateTaskFilesDirect', generateTaskFilesDirect],
  ['setTaskStatusDirect', setTaskStatusDirect],
  ['showTaskDirect', showTaskDirect],
  ['nextTaskDirect', nextTaskDirect],
  ['expandTaskDirect', expandTaskDirect],
  ['addTaskDirect', addTaskDirect],
  ['addSubtaskDirect', addSubtaskDirect],
  ['removeSubtaskDirect', removeSubtaskDirect],
  ['analyzeTaskComplexityDirect', analyzeTaskComplexityDirect],
  ['clearSubtasksDirect', clearSubtasksDirect],
  ['expandAllTasksDirect', expandAllTasksDirect],
  ['removeDependencyDirect', removeDependencyDirect],
  ['validateDependenciesDirect', validateDependenciesDirect],
  ['fixDependenciesDirect', fixDependenciesDirect],
  ['complexityReportDirect', complexityReportDirect],
  ['addDependencyDirect', addDependencyDirect],
  ['removeTaskDirect', removeTaskDirect]
]);

// Re-export all direct function implementations
export {
  listTasksDirect,
  getCacheStatsDirect,
  parsePRDDirect,
  updateTasksDirect,
  updateTaskByIdDirect,
  updateSubtaskByIdDirect,
  generateTaskFilesDirect,
  setTaskStatusDirect,
  showTaskDirect,
  nextTaskDirect,
  expandTaskDirect,
  addTaskDirect,
  addSubtaskDirect,
  removeSubtaskDirect,
  analyzeTaskComplexityDirect,
  clearSubtasksDirect,
  expandAllTasksDirect,
  removeDependencyDirect,
  validateDependenciesDirect,
  fixDependenciesDirect,
  complexityReportDirect,
  addDependencyDirect,
  removeTaskDirect,
  initializeProjectDirect
};

