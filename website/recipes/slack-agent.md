---
id: slack-agent
title: Slack Agent
description: Build a Slack-facing agent that listens to mentions and replies through VoltOps.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ApiKeyButton from '@site/src/components/docs-widgets/ApiKeyButton';

Build a Slack bot that listens to channel messages, fetches weather, and replies through VoltOps Slack actions. <a href="/docs/triggers/usage" target="_blank" rel="noreferrer">Triggers</a> deliver Slack events into your agent, and <a href="/docs/actions/overview" target="_blank" rel="noreferrer">Actions</a> let the agent send data back out. Follow the steps in order with your own keys and workspace.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Step 1 - Create the project

```bash
npm create voltagent-app@latest
```

Open the generated folder. If you skipped API key entry, add it to `.env` now (e.g. `OPENAI_API_KEY=...`).

## Step 2 - Configure and start

If you skipped API key entry during setup, create or edit the `.env` file in your project root and add your API key:

<Tabs>
  <TabItem value="openai" label="OpenAI" default>

```bash
OPENAI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="OpenAI" href="https://platform.openai.com/api-keys" />

  </TabItem>
  <TabItem value="anthropic" label="Anthropic">

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Anthropic" href="https://console.anthropic.com/settings/keys" />

  </TabItem>
  <TabItem value="google" label="Google Gemini">

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Google" href="https://aistudio.google.com/app/apikey" />

  </TabItem>
  <TabItem value="groq" label="Groq">

```bash
GROQ_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Groq" href="https://console.groq.com/keys" />

  </TabItem>
  <TabItem value="mistral" label="Mistral">

```bash
MISTRAL_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Mistral" href="https://console.mistral.ai/api-keys" />

  </TabItem>
</Tabs>

Now start the development server:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm run dev
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn dev
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm dev
```

  </TabItem>
</Tabs>

You should see the VoltAgent server startup message:

```bash
═══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
═══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/docs/deployment/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
═══════════════════════════════════════════════════
```

## Step 3 - Set up the Slack trigger in VoltOps Console

- Console → **Triggers** → **Create Trigger** (<a href="https://console.voltagent.dev/triggers" target="_blank" rel="noreferrer">open console</a>).
- Choose **Slack → Message posted to channel**.
- Use the managed VoltOps Slack app when prompted, and create a Slack credential. Keep the `credentialId`.
<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>
  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-1.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Step 4 - Expose your local agent with Volt Tunnel

```bash
pnpm volt tunnel 3141
```

Copy the tunnel URL and set it as the trigger destination in Console (Endpoint URL). See [Local tunnel docs](/docs/deployment/local-tunnel/).  
<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-2.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Step 5 - Update the agent (Slack trigger + weather)

Wire the Slack trigger and weather tool first:

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTriggers } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { weatherTool } from "./tools/weather";

type SlackMessagePayload = {
  channel?: string;
  thread_ts?: string;
  ts?: string;
  text?: string;
  user?: string;
};

const logger = createPinoLogger({ name: "with-slack", level: "info" });

const slackAgent = new Agent({
  name: "slack-agent",
  instructions: "You are a Slack assistant.",
  tools: [weatherTool],
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { slackAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.slack.messagePosted(async ({ payload, agents }) => {
      const event = (payload as SlackMessagePayload | undefined) ?? {};
      const channelId = event.channel;
      const threadTs = event.thread_ts ?? event.ts;
      const text = event.text ?? "";
      const userId = event.user ?? "unknown-user";

      if (!channelId || !text) {
        logger.warn("Missing channel or text in Slack payload");
        return;
      }

      await agents.slackAgent.generateText(`Slack channel: ${channelId}
Thread: ${threadTs ?? "new thread"}
User: <@${userId}>
Message: ${text}
If the user asks for weather, call getWeather.`);
    });
  }),
});
```

Weather tool (mock) reference:

```ts
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherOutputSchema = z.object({
  weather: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
    windSpeed: z.number(),
  }),
  message: z.string(),
});

export const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("City or location to get weather for (e.g., San Francisco)"),
  }),
  outputSchema: weatherOutputSchema,
  execute: async ({ location }) => {
    // Mocked weather data for demo purposes; replace with a real API if desired.
    const mockWeatherData = {
      location,
      temperature: Math.floor(Math.random() * 30) + 5,
      condition: ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"][
        Math.floor(Math.random() * 5)
      ],
      humidity: Math.floor(Math.random() * 60) + 30,
      windSpeed: Math.floor(Math.random() * 30),
    };

    return {
      weather: mockWeatherData,
      message: `Current weather in ${location}: ${mockWeatherData.temperature}°C and ${mockWeatherData.condition.toLowerCase()} with ${mockWeatherData.humidity}% humidity and wind speed of ${mockWeatherData.windSpeed} km/h.`,
    };
  },
});
```

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-3.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Step 6 - Add Slack action in VoltOps

- Console → **Actions** → **Create Action** (<a href="https://console.voltagent.dev/actions" target="_blank" rel="noreferrer">open console</a>) (see [Actions overview](/docs/actions/overview))
- Choose Slack and the same credential.
- Save.  
<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>
  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-4.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Step 7 - Add `sendSlackMessage` to reply via VoltOps Actions

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool, createTriggers } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/sdk";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";
import { weatherTool } from "./tools/weather";

type SlackMessagePayload = {
  channel?: string;
  thread_ts?: string;
  ts?: string;
  text?: string;
  user?: string;
};

const logger = createPinoLogger({ name: "with-slack", level: "info" });

const voltOps = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY ?? "",
  secretKey: process.env.VOLTAGENT_SECRET_KEY ?? "",
});

const sendSlackMessage = createTool({
  name: "sendSlackMessage",
  description: "Send a message to a Slack channel or thread via VoltOps.",
  parameters: z.object({
    channelId: z.string(),
    text: z.string(),
    threadTs: z.string().optional(),
  }),
  execute: async ({ channelId, text, threadTs }) => {
    const credentialId = process.env.SLACK_CREDENTIAL_ID;
    if (!credentialId) {
      throw new Error("SLACK_CREDENTIAL_ID is not set");
    }
    return voltOps.actions.slack.postMessage({
      credential: { credentialId },
      channelId,
      text,
      threadTs,
      linkNames: true,
    });
  },
});

const slackAgent = new Agent({
  name: "slack-agent",
  instructions: [
    "You are a Slack assistant.",
    "Use sendSlackMessage to reply in the same channel/thread.",
    "Use getWeather for weather questions.",
  ].join(" "),
  tools: [weatherTool, sendSlackMessage],
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { slackAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.slack.messagePosted(async ({ payload, agents }) => {
      const event = (payload as SlackMessagePayload | undefined) ?? {};
      const channelId = event.channel;
      const threadTs = event.thread_ts ?? event.ts;
      const text = event.text ?? "";
      const userId = event.user ?? "unknown-user";

      if (!channelId || !text) {
        logger.warn("Missing channel or text in Slack payload");
        return;
      }

      await agents.slackAgent.generateText(`Slack channel: ${channelId}
Thread: ${threadTs ?? "new thread"}
User: <@${userId}>
Message: ${text}
Respond in Slack via sendSlackMessage; use getWeather for weather questions.`);
    });
  }),
});
```

Ensure `SLACK_CREDENTIAL_ID` is set in `.env`.

## Step 8 - Test end-to-end

- Tunnel running, server running.
- Mention the bot or post a message in the channel.
- The agent should handle the Slack event, call `getWeather` when asked, and reply via `sendSlackMessage`.  
<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>
  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Notes

- Shared Slack app Request URL: `https://api.voltagent.dev/hooks/slack` (or your host).
- Invite the bot to the channel (`/invite @your-bot`).
- Keep `VOLTAGENT_PUBLIC_KEY`, `VOLTAGENT_SECRET_KEY`, and `SLACK_CREDENTIAL_ID` in `.env`.
- Use Volt Tunnel locally; switch to your deployed URL later.
- More on actions: [Actions overview](/docs/actions/overview)
- More on triggers: [Triggers usage](/docs/triggers/usage)
