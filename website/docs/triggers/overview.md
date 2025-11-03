# Overview

Triggers determine when your agents and workflows start running. They connect agents to external services or time-based schedules, responding to messages, emails, database changes, or recurring events.

## Key Concepts

**Trigger**: A connection to an external service (Slack, Gmail, Airtable, GitHub) or a cron schedule

**Binding**: Configuration of a trigger instance (which channel to monitor, which label to filter, what schedule to use)

**Target**: The agent or workflow that executes when the trigger fires

## How Triggers Work

```
External Event → Trigger Fires → Binding Evaluates → Target(s) Execute
```

## Supported Trigger Types

| Type         | Description                                         | Delivery Method |
| ------------ | --------------------------------------------------- | --------------- |
| **Slack**    | Monitor workspace messages and channels             | Webhook         |
| **Gmail**    | Watch for emails with specific labels               | Polling         |
| **Airtable** | Detect record changes in bases and tables           | Polling         |
| **GitHub**   | Respond to repository events (PRs, issues, commits) | Webhook         |
| **Schedule** | Execute on cron expressions                         | Time-based      |

## Examples

**Customer Support**
New Slack message arrives in #support → Sentiment analysis agent runs

**Email Processing**
Email arrives with 'urgent' label → Categorization workflow executes

**Database Sync**
Airtable record updated → Data processing workflow executes every 5 minutes

**CI/CD Integration**
PR opens on GitHub → Code review agent runs

**Scheduled Reports**
Daily at 9am → Report generation agent runs

## Next Steps

See [usage documentation](./usage.md) for step-by-step instructions on creating and managing triggers.
