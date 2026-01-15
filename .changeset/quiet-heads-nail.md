---
"@voltagent/core": patch
---

feat: add feedback tokens + metadata support in the core agent runtime.

VoltAgent can create feedback tokens via VoltOps and attach feedback metadata to assistant messages (including streaming), so UIs can render ratings later.

```ts
const result = await agent.generateText("Rate this answer", {
  feedback: true,
});

console.log(result.feedback);
```

```ts
const stream = await agent.streamText("Explain this trace", {
  feedback: true,
});

for await (const _chunk of stream.textStream) {
  // consume stream output
}

console.log(stream.feedback);
```

useChat (AI SDK compatible):

```ts
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const transport = new DefaultChatTransport({
  api: `${apiUrl}/agents/${agentId}/chat`,
  prepareSendMessagesRequest({ messages }) {
    const lastMessage = messages[messages.length - 1];
    return {
      body: {
        input: [lastMessage],
        options: {
          feedback: {
            key: "satisfaction",
            feedbackConfig: {
              type: "categorical",
              categories: [
                { value: 1, label: "Satisfied" },
                { value: 0, label: "Unsatisfied" },
              ],
            },
          },
        },
      },
    };
  },
});

const { messages } = useChat({ transport });

async function submitFeedback(message: any, score: number) {
  const feedback = message?.metadata?.feedback;
  if (!feedback?.url) return;

  await fetch(feedback.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      score,
      comment: "Helpful response",
      feedback_source_type: "app",
    }),
  });
}
```

REST API (token + ingest):

```bash
curl -X POST "https://api.voltagent.dev/api/public/feedback/tokens" \
  -H "X-Public-Key: $VOLTAGENT_PUBLIC_KEY" \
  -H "X-Secret-Key: $VOLTAGENT_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "trace-id",
    "feedback_key": "satisfaction",
    "expires_in": { "hours": 6 },
    "feedback_config": {
      "type": "categorical",
      "categories": [
        { "value": 1, "label": "Satisfied" },
        { "value": 0, "label": "Unsatisfied" }
      ]
    }
  }'
```

```bash
curl -X POST "https://api.voltagent.dev/api/public/feedback/ingest/token-id" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 1,
    "comment": "Resolved my issue",
    "feedback_source_type": "app"
  }'
```
