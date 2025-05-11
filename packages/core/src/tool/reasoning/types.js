"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasoningStepSchema = exports.NextAction = void 0;
const zod_1 = require("zod");
/**
 * Enum defining the next action to take after a reasoning step.
 */
var NextAction;
(function (NextAction) {
  NextAction["CONTINUE"] = "continue";
  NextAction["VALIDATE"] = "validate";
  NextAction["FINAL_ANSWER"] = "final_answer";
})(NextAction || (exports.NextAction = NextAction = {}));
/**
 * Zod schema for the ReasoningStep data structure.
 */
exports.ReasoningStepSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(), // Unique ID for the step
  type: zod_1.z.enum(["thought", "analysis"]), // Type of step
  title: zod_1.z.string(), // Concise title for the step
  reasoning: zod_1.z.string(), // The detailed thought or analysis
  action: zod_1.z.string().optional(), // The action planned based on the thought (for 'thought' type)
  result: zod_1.z.string().optional(), // The result being analyzed (for 'analysis' type)
  next_action: zod_1.z.nativeEnum(NextAction).optional(), // What to do next (for 'analysis' type)
  confidence: zod_1.z.number().min(0).max(1).optional().default(0.8), // Confidence level
  timestamp: zod_1.z.string().datetime(), // Timestamp of the step creation
  historyEntryId: zod_1.z.string(), // Link to the main history entry
  agentId: zod_1.z.string(), // ID of the agent performing the step
});
//# sourceMappingURL=types.js.map
