/**
 * AI Coordination
 * 
 * Main exports for AI coordination modules
 */

// Task Router
export {
  TaskRouter,
  type TaskRequest,
  type RoutingDecision,
  type AgentCapability,
  type TaskRequirements,
  TaskType,
  TaskPriority,
  AgentType
} from './task-router.js';

// Dual Agent Manager
export {
  DualAgentManager,
  type AgentSession,
  type HandoffRequest,
  type AgentResponse,
  type CoordinationMetrics,
  AgentStatus
} from './dual-agent-manager.js';

