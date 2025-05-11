import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createHooks, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { fetchRepoContributorsTool } from "./tools";
import { fetchRepoStarsTool } from "./tools";

// Create the stars fetcher agent
const starsFetcherAgent = new Agent({
  name: "Stars Fetcher",
  description: "Fetches the number of stars for a GitHub repository using the GitHub API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [fetchRepoStarsTool],
});

// Create the contributors fetcher agent
const contributorsFetcherAgent = new Agent({
  name: "Contributors Fetcher",
  description: "Fetches the list of contributors for a GitHub repository using the GitHub API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [fetchRepoContributorsTool],
});

// Create the analyzer agent
const analyzerAgent = new Agent({
  name: "Repo Analyzer",
  description: "Analyzes repository statistics and provides insights",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create the supervisor agent that coordinates all the sub-agents
const supervisorAgent = new Agent({
  name: "Supervisor",
  description: `You are a GitHub repository analyzer. When given a GitHub repository URL or owner/repo format, you will:
1. Use the StarsFetcher agent to get the repository's star count
2. Use the ContributorsFetcher agent to get the repository's contributors
3. Use the RepoAnalyzer agent to analyze this data and provide insights

Example input: https://github.com/vercel/ai-sdk or vercel/ai-sdk
`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [starsFetcherAgent, contributorsFetcherAgent, analyzerAgent],
});

// Initialize the VoltAgent with the agent hierarchy
new VoltAgent({
  agents: {
    supervisorAgent,
  },
});
