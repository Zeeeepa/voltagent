---
id: airtable-agent
title: Airtable Agent
description: Listen to Airtable record events, enrich rows, and write back via VoltOps.
hide_table_of_contents: true
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ApiKeyButton from '@site/src/components/docs-widgets/ApiKeyButton';

Build an Airtable-facing agent that reacts to new records, summarizes them, and writes status/next steps back into the same row. <a href="/docs/triggers/usage" target="_blank" rel="noreferrer">Triggers</a> deliver Airtable events into your agent, and <a href="/docs/actions/overview" target="_blank" rel="noreferrer">Actions</a> let the agent push updates. Follow the steps in order with your own base, table, and credential. <a href="https://github.com/voltagent/voltagent/tree/main/examples/with-airtable" target="_blank" rel="noreferrer">Source Code</a>

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

## Step 1 - Create the project

<div className="recipe-step" style={{ width: "100%" }}>

```bash
npm create voltagent-app@latest
```

Open the generated folder. If you skipped API key entry, add it to `.env` now.

</div>

## Step 2 - Configure and start

<div className="recipe-step" style={{ width: "100%" }}>

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

You should see the VoltAgent server startup message (HTTP server + Swagger UI).

</div>

## Step 3 - Set up the Airtable trigger in VoltOps Console

<div className="recipe-step" style={{ width: "100%" }}>

- Console → **Triggers** → **Create Trigger** (<a href="https://console.voltagent.dev/triggers" target="_blank" rel="noreferrer">open console</a>).
- Choose **Airtable → Record created**.
- Select your base + table and save the trigger.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-1.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

</div>

## Step 4 - Expose your local agent with Volt Tunnel

<div className="recipe-step" style={{ width: "100%" }}>

```bash
pnpm volt tunnel 3141
```

Copy the tunnel URL and set it as the trigger destination in Console (Endpoint URL). See [Local tunnel docs](/docs/deployment/local-tunnel/).

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-2.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

</div>

## Step 5 - Wire the Airtable trigger to your agent

<div className="recipe-step" style={{ width: "100%" }}>

Start with a trigger + agent skeleton. It listens for new rows and drafts the fields you want to update, but it doesn’t write back yet (tool comes next).

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-3.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTriggers } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { safeStringify } from "@voltagent/internal";

type AirtableRecordCreatedPayload = {
  record?: {
    id?: string;
    fields?: Record<string, unknown>;
  };
  baseId?: string;
  tableId?: string;
};

const logger = createPinoLogger({ name: "with-airtable", level: "info" });

const airtableAgent = new Agent({
  name: "airtable-agent",
  instructions: `You process newly created Airtable rows.
Draft a summary, a priority (High/Medium/Low), a status (New/In Progress/Blocked/Done), and next steps as bullet text.
You will get a tool to write back in the next step; for now just return the proposed values clearly.`,
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { airtableAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.airtable.recordCreated(async ({ payload, agents }) => {
      const { record, baseId, tableId } =
        (payload as AirtableRecordCreatedPayload | undefined) ?? {};
      if (!record?.id) {
        logger.warn("Missing recordId in Airtable payload");
        return;
      }

      await agents.airtableAgent.generateText(`Airtable record created.
Base: ${baseId ?? "unknown-base"}
Table: ${tableId ?? "unknown-table"}
Record ID: ${record.id}

Existing fields (JSON): ${safeStringify(record.fields ?? {})}

Propose updates (no tool calls yet):
- Summary (1-2 sentences)
- Priority (High | Medium | Low)
- Status (New | In Progress | Blocked | Done)
- Next steps (short bullet list as a single string)`);
    });
  }),
});
```

Make sure your Airtable table has the field names above (`Summary`, `Priority`, `Status`, `Next steps`), or change the prompt to match your schema.

</div>

## Step 6 - Add the Airtable action and update tool

<div className="recipe-step" style={{ width: "100%" }}>

- Console → **Actions** → **Create Action** (<a href="https://console.voltagent.dev/actions" target="_blank" rel="noreferrer">open console</a>).
- Choose Airtable and the same credential.
- Select **Update record**, base, and table; save.
- Update your code to include the VoltOps client + `updateAirtableRecord` tool, then attach it to the agent:

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool, createTriggers } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/sdk";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { safeStringify } from "@voltagent/internal";
import { z } from "zod";

type AirtableRecordCreatedPayload = {
  record?: {
    id?: string;
    fields?: Record<string, unknown>;
  };
  baseId?: string;
  tableId?: string;
};

const logger = createPinoLogger({ name: "with-airtable", level: "info" });

const voltOps = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY ?? "",
  secretKey: process.env.VOLTAGENT_SECRET_KEY ?? "",
});

const updateAirtableRecord = createTool({
  name: "updateAirtableRecord",
  description: "Update an Airtable record with summary/priority/status/next steps.",
  parameters: z.object({
    recordId: z.string(),
    fields: z.record(z.unknown()),
    baseId: z.string().optional(),
    tableId: z.string().optional(),
  }),
  execute: async ({ recordId, fields, baseId, tableId }) => {
    const credentialId = process.env.AIRTABLE_CREDENTIAL_ID;
    if (!credentialId) {
      throw new Error("AIRTABLE_CREDENTIAL_ID is not set");
    }

    return voltOps.actions.airtable.updateRecord({
      credential: { credentialId },
      baseId: baseId,
      tableId: tableId,
      recordId,
      fields,
    });
  },
});

const airtableAgent = new Agent({
  name: "airtable-agent",
  instructions: `You process newly created Airtable rows.
Create a short summary, assign a priority (High/Medium/Low), pick a status (New/In Progress/Blocked/Done), and list next steps.
Always write updates via updateAirtableRecord using the exact Airtable field names.`,
  tools: [updateAirtableRecord],
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { airtableAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.airtable.recordCreated(async ({ payload, agents }) => {
      const { record, baseId, tableId } =
        (payload as AirtableRecordCreatedPayload | undefined) ?? {};
      if (!record?.id) {
        logger.warn("Missing recordId in Airtable payload");
        return;
      }

      await agents.airtableAgent.generateText(`Airtable record created.
Base: ${baseId ?? "unknown-base"}
Table: ${tableId ?? "unknown-table"}
Record ID: ${record.id}

Existing fields (JSON): ${safeStringify(record.fields ?? {})}

Update the same record with:
- Summary (1-2 sentences) -> field name: Summary
- Priority (High | Medium | Low) -> field name: Priority
- Status (New | In Progress | Blocked | Done) -> field name: Status
- Next steps (short bullet list as a single string) -> field name: Next steps

Call updateAirtableRecord with recordId and the new fields using those exact names.`);
    });
  }),
});
```

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-4.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

</div>

## Step 7 - Test end-to-end

<div className="recipe-step" style={{ width: "100%" }}>

- Tunnel running, server running.
- Insert a new row in the chosen Airtable table (e.g., `Title`, `Description` filled).
- The trigger fires, the agent assigns summary/priority/status/next steps, and VoltOps writes those fields back onto the same record.
- Check Volt → **Actions → Runs** to see the request/response and any provider errors.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/airtable-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

</div>

## Environment variables to keep in `.env`

```bash
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
AIRTABLE_CREDENTIAL_ID=cred_...
```

Use the [Triggers usage doc](/docs/triggers/usage) and [Airtable Actions doc](/docs/actions/airtable) for deeper configuration options.
