---
title: Agent Middleware
slug: agent-middleware
authors: necatiozmen
description: Agent middleware for AI agents. Control input, verify output, and stop unsafe calls before they ship.
image: https://cdn.voltagent.dev/2026-01-20-agent-middleware/social.png
---

Agent middleware gives developers a clean, programmable checkpoint around every model call. With VoltAgent, you can intercept input, validate output, and stop unsafe responses without touching core logic. If you build AI agents or LLM apps, this is the fastest way to make behavior consistent and safe.

## TL;DR

- Add input middleware to normalize, enrich, or reject prompts.
- Add output middleware to validate, format, or block responses.
- Retries are built in with `maxMiddlewareRetries` and `abort({ retry: true })`.
- Works with existing agent flows and tools in VoltAgent.

## What Is Agent Middleware

Agent middleware is a pre and post processing layer that runs before guardrails and hooks on each agent call. Think of it as LLM middleware that lets you change the request or response, or stop the call with a typed error.

## Where Middleware Runs In The Agent Flow

For `generateText` and `generateObject`, the order is:

1. Input middleware
2. Input guardrails
3. Hooks (`onStart`)
4. Model call (with retries and fallback)
5. Output middleware
6. Output guardrails
7. Hooks (`onEnd`)

For `streamText` and `streamObject`, middleware runs only before the stream starts. Output middleware does not run after streaming begins.

## Input Middleware: Normalize And Enrich

Input middleware is where you clean, standardize, or enrich the request before it reaches the model. Common patterns:

- Trim whitespace and normalize casing
- Add a prefix like `Customer:` or a routing tag
- Reject inputs that do not match a required format

## Output Middleware: Validate And Block

Output middleware runs after the model call and is ideal for validation. Typical use cases:

- Enforce a response signature
- Block unsafe or out of policy replies
- Fix formatting before returning to the user

If needed, you can `abort` with a typed error and optionally retry.

## Middleware Retries

Middleware retries are controlled by `maxMiddlewareRetries`. If a middleware calls `abort("reason", { retry: true })`, VoltAgent retries the full attempt, including input middleware and model selection. This is separate from model retries (`maxRetries`).

## Example: Normalize Input And Require Signature

```ts
import { Agent, createInputMiddleware, createOutputMiddleware } from "@voltagent/core";

const normalizeInput = createInputMiddleware({
  name: "NormalizeInput",
  handler: ({ input }) => (typeof input === "string" ? input.trim() : input),
});

const requireSignature = createOutputMiddleware<string>({
  name: "RequireSignature",
  handler: ({ output, abort }) => {
    if (!output.includes("-- Support")) {
      abort("Missing signature", { retry: true, metadata: { reason: "signature" } });
    }
    return output;
  },
});

const agent = new Agent({
  name: "Support",
  model: "openai/gpt-4o-mini",
  maxMiddlewareRetries: 1,
  inputMiddlewares: [normalizeInput],
  outputMiddlewares: [requireSignature],
});
```

This trims the input before the model runs, then enforces a signature on the output. If the signature is missing, the call aborts and retries once.

## When To Use Agent Middleware

- You want predictable input across all agent calls
- You need consistent output formatting for UI or downstream tools
- You want a lightweight safety gate without custom wrappers

## Learn More

Read the full docs and API details here: https://voltagent.dev/docs/agents/middleware
