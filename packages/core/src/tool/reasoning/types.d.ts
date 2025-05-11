import { z } from "zod";
import type { ToolExecuteOptions } from "../../agent/providers/base/types";
/**
 * Enum defining the next action to take after a reasoning step.
 */
export declare enum NextAction {
  CONTINUE = "continue",
  VALIDATE = "validate",
  FINAL_ANSWER = "final_answer",
}
/**
 * Zod schema for the ReasoningStep data structure.
 */
export declare const ReasoningStepSchema: z.ZodObject<
  {
    id: z.ZodString;
    type: z.ZodEnum<["thought", "analysis"]>;
    title: z.ZodString;
    reasoning: z.ZodString;
    action: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodString>;
    next_action: z.ZodOptional<z.ZodNativeEnum<typeof NextAction>>;
    confidence: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    timestamp: z.ZodString;
    historyEntryId: z.ZodString;
    agentId: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    type: "thought" | "analysis";
    id: string;
    title: string;
    timestamp: string;
    reasoning: string;
    confidence: number;
    historyEntryId: string;
    agentId: string;
    action?: string | undefined;
    result?: string | undefined;
    next_action?: NextAction | undefined;
  },
  {
    type: "thought" | "analysis";
    id: string;
    title: string;
    timestamp: string;
    reasoning: string;
    historyEntryId: string;
    agentId: string;
    action?: string | undefined;
    result?: string | undefined;
    next_action?: NextAction | undefined;
    confidence?: number | undefined;
  }
>;
/**
 * TypeScript type inferred from the ReasoningStepSchema.
 */
export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;
/**
 * Options specific to reasoning tool execution, extending base ToolExecuteOptions.
 */
export interface ReasoningToolExecuteOptions extends ToolExecuteOptions {
  agentId: string;
  historyEntryId: string;
}
