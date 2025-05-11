import { Agent, VoltAgent } from "@voltagent/core";
import { XsAIProvider } from "@voltagent/xsai";

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new XsAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
  model: "gpt-4o-mini",
});

new VoltAgent({
  agents: {
    agent,
  },
});
