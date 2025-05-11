import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LangfuseExporter } from "@voltagent/langfuse-exporter";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

const agent = new Agent({
  name: "Base Agent",
  instructions: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, searchTool, checkCalendarTool, addCalendarEventTool],
});

new VoltAgent({
  agents: {
    agent,
  },
  telemetryExporter: new LangfuseExporter({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
  }),
});
