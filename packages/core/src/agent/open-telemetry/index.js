"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOperationSpan = startOperationSpan;
exports.endOperationSpan = endOperationSpan;
exports.startToolSpan = startToolSpan;
exports.endToolSpan = endToolSpan;
const api_1 = require("@opentelemetry/api");
// Get a tracer instance for this library
const tracer = api_1.trace.getTracer("voltagent-core", "0.1.0"); // Use your package name and version
function startOperationSpan(options) {
  const {
    agentId,
    agentName,
    operationName,
    userId,
    sessionId,
    parentAgentId,
    parentHistoryEntryId,
    modelName,
  } = options;
  const parentContext = api_1.context.active();
  const attributes = {
    "voltagent.agent.id": agentId,
    "voltagent.agent.name": agentName,
    ...(userId && { "enduser.id": userId }),
    ...(sessionId && { "session.id": sessionId }),
    ...(parentAgentId && { "voltagent.parent.agent.id": parentAgentId }),
    ...(parentHistoryEntryId && { "voltagent.parent.history.id": parentHistoryEntryId }),
    ...(modelName && { "ai.model.name": modelName }),
  };
  const otelSpan = tracer.startSpan(
    operationName,
    {
      kind: api_1.SpanKind.INTERNAL,
      attributes,
    },
    parentContext,
  );
  return otelSpan;
}
function endOperationSpan(options) {
  const { span, status, data } = options;
  if (!span || !span.isRecording()) {
    return;
  }
  try {
    const attributes = {};
    if (data.input) {
      attributes["ai.prompt.messages"] =
        typeof data.input === "string" ? data.input : JSON.stringify(data.input);
    }
    if (data.output) {
      attributes["ai.response.text"] =
        typeof data.output === "string" ? data.output : JSON.stringify(data.output);
    }
    if (data.usage && typeof data.usage === "object") {
      const usageInfo = data.usage;
      if (usageInfo.promptTokens != null)
        attributes["gen_ai.usage.prompt_tokens"] = usageInfo.promptTokens;
      if (usageInfo.completionTokens != null)
        attributes["gen_ai.usage.completion_tokens"] = usageInfo.completionTokens;
      if (usageInfo.totalTokens != null) attributes["ai.usage.tokens"] = usageInfo.totalTokens;
    }
    // Simplified metadata handling - exporter should handle prefixing if needed
    if (data.metadata && typeof data.metadata === "object") {
      for (const [key, value] of Object.entries(data.metadata)) {
        if (value != null && typeof key === "string" && !key.startsWith("internal.")) {
          // Avoid internal metadata
          attributes[`metadata.${key}`] =
            typeof value === "string" || typeof value === "number" || typeof value === "boolean"
              ? value
              : JSON.stringify(value);
        }
      }
    }
    span.setAttributes(attributes);
    if (status === "completed") {
      span.setStatus({ code: api_1.SpanStatusCode.OK });
    } else if (status === "error") {
      span.setStatus({
        code: api_1.SpanStatusCode.ERROR,
        message: String(data.errorMessage || "Agent operation failed"),
      });
      if (data.error) {
        const errorObj = data.error instanceof Error ? data.error : new Error(String(data.error));
        span.recordException(errorObj);
      } else if (data.errorMessage) {
        span.recordException(new Error(String(data.errorMessage)));
      }
    }
  } catch (e) {
    console.error("[VoltAgentCore OTEL] Error enriching operation span:", e);
    try {
      span.setAttribute("otel.enrichment.error", true);
      span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: "Span enrichment failed" });
    } catch (safeSetError) {
      console.error("[VoltAgentCore OTEL] Error setting enrichment error status:", safeSetError);
    }
  } finally {
    span.end();
  }
}
function startToolSpan(options) {
  const { toolName, toolCallId, toolInput, agentId, parentSpan } = options;
  const parentOtelContext = parentSpan
    ? api_1.trace.setSpan(api_1.context.active(), parentSpan)
    : api_1.context.active();
  const toolSpan = tracer.startSpan(
    `tool.execution:${toolName}`,
    {
      kind: api_1.SpanKind.CLIENT,
      attributes: {
        "tool.call.id": toolCallId,
        "tool.name": toolName,
        "tool.arguments": toolInput ? JSON.stringify(toolInput) : undefined,
        "voltagent.agent.id": agentId,
      },
    },
    parentOtelContext,
  );
  return toolSpan;
}
function endToolSpan(options) {
  const { span, resultData } = options;
  if (!span || !span.isRecording()) {
    return;
  }
  try {
    const toolResultContent = resultData.result ?? resultData.content;
    const toolError = resultData.result?.error ?? resultData.error;
    const isError = Boolean(toolError);
    span.setAttribute("tool.result", JSON.stringify(toolResultContent));
    if (isError) {
      const errorMessage = toolError?.message || String(toolError || "Unknown tool error");
      span.setAttribute("tool.error.message", errorMessage);
      const errorObj = toolError instanceof Error ? toolError : new Error(errorMessage);
      span.recordException(errorObj);
      span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: errorObj.message });
    } else {
      span.setStatus({ code: api_1.SpanStatusCode.OK });
    }
  } catch (e) {
    console.error("[VoltAgentCore OTEL] Error enriching tool span:", e);
    try {
      span.setAttribute("otel.enrichment.error", true);
      span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: "Tool span enrichment failed" });
    } catch (safeSetError) {
      console.error(
        "[VoltAgentCore OTEL] Error setting tool enrichment error status:",
        safeSetError,
      );
    }
  } finally {
    span.end();
  }
}
//# sourceMappingURL=index.js.map
