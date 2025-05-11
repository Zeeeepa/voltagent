import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

(async () => {
  try {
    const mcpConfig = new MCPConfiguration({
      servers: {
        composio: {
          type: "http",
          url: "https://mcp.composio.dev/composio/server/YOUR-SERVER-ID",
        },
      },
    });

    const agent = new Agent({
      name: "Composio MCP Agent",
      description: "A helpful assistant using a lightweight provider",
      tools: await mcpConfig.getTools(),
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });

    new VoltAgent({
      agents: {
        agent,
      },
    });
  } catch (error) {
    console.error("Failed to initialize VoltAgent:", error);
  }
})();
