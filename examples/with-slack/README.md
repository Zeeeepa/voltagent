# VoltAgent Slack Example

This example wires a Slack-aware agent that listens for `app_mention` events and replies in the same channel/thread using VoltOps Slack actions.

## Prerequisites

- Node 18+
- A VoltOps project with keys
  - `VOLTAGENT_PUBLIC_KEY`
  - `VOLTAGENT_SECRET_KEY`
- A VoltOps Slack credential (`credentialId`) created via Console → Integrations → Slack
- Slack app with Event Subscriptions Request URL pointing to your VoltOps webhook (e.g. `https://api.voltagent.dev/hooks/slack`) and the app added to the target channel

## Setup

```bash
pnpm install
```

Create a `.env` file:

```
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
SLACK_CREDENTIAL_ID=<your VoltOps Slack credential id>
PORT=3003
```

## Run

```bash
pnpm dev
```

Mention your bot in Slack; the agent will respond in the same thread using the Slack action.
