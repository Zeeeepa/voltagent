---
title: Users
---

# Users

The Users page groups traces by user so you can quickly see who is affected by errors, high latency, or unusual cost and then jump into details.

:::note Add visuals
Add the Users list screenshot or video here.
:::

## Users List

Each row represents a user. Use this list to find users that need attention and open their detail view.

## User Detail View

The detail page follows the same top-to-bottom layout as the UI.

### Profile and Metadata

Shows user identity and metadata (plan, tier, region) so you can segment behavior and compare cohorts. Use this to spot plan-based issues or regional latency differences.

:::note Add visuals
Add the user header and metadata screenshot here.
:::

### Key Metrics

Gives a quick read of volume, success rate, latency, and cost. Use this to decide whether to investigate quality, performance, or spend first.

:::note Add visuals
Add the metrics cards screenshot here.
:::

### Trends and Model Usage

Time-range charts show changes over time; model usage shows which model versions the user saw. This helps connect regressions to releases or model switches.

:::note Add visuals
Add the trends and model usage charts here.
:::

### User Feedback (Optional)

Shows ratings and comments with the related traces so you can compare behavior with user feedback. Use it to validate fixes and track perceived quality.

:::note Add visuals
Add the user feedback section screenshots here.
:::

Each chart answers a specific question:

- **Feedback Summary**: Quick snapshot of volume, average score, and coverage.
- **Feedback Trends**: How feedback volume and sentiment change over time.
- **Score Distribution**: Where scores cluster to spot polarization or drift.
- **Top Feedback Keys**: Which feedback signals dominate for this user.
- **Comment Momentum**: When users leave comments, not just scores.

### Conversations

Groups traces into user journeys; selecting one filters the trace list below. This is useful when a problem spans multiple steps instead of a single trace.

:::note Add visuals
Add the conversations section screenshot here.
:::

### Traces

Lists all runs for the user; filtered by conversation when selected.

:::note Add visuals
Add the user trace table screenshot here.
:::
