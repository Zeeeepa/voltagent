---
"assistant-ui-starter": patch
"voltagent-copilotkit-client": patch
"voltagent-with-copilotkit-server": patch
"with-jwt-auth": patch
"example-with-live-evals": patch
"@voltagent/a2a-server": patch
"@voltagent/ag-ui": patch
"@voltagent/cli": patch
"@voltagent/core": patch
"create-voltagent-app": patch
"@voltagent/docs-mcp": patch
"@voltagent/evals": patch
"@voltagent/internal": patch
"@voltagent/langfuse-exporter": patch
"@voltagent/libsql": patch
"@voltagent/logger": patch
"@voltagent/mcp-server": patch
"@voltagent/postgres": patch
"@voltagent/rag": patch
"@voltagent/scorers": patch
"@voltagent/sdk": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/serverless-hono": patch
"@voltagent/supabase": patch
"@voltagent/vercel-ai-exporter": patch
"@voltagent/voice": patch
"@voltagent/voltagent-memory": patch
---

feat: VoltAgent 2.x (AI SDK v6)

VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

Migration summary (1.x -> 2.x):

1. Update VoltAgent packages

- `npm run volt update`
- If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`

2. Align AI SDK packages

- `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
- If you use UI hooks, upgrade `@ai-sdk/react` to `^3`

3. Structured output

- `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
- Use `generateText` / `streamText` with `Output.object(...)`

Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/
