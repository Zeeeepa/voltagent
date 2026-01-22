---
title: Overview
---

# VoltOps Tracing

Tracing shows you exactly what happened in a single user request, end to end. Use it to find where a flow failed, which step is slow, or why a user got a specific response. It is most useful for agent debugging, performance and cost tuning, QA checks, and audit trails.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/voltops-observability.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

When you select a trace from the list, you can open its [detailed views](https://voltagent.dev/observability-docs/tracing/views/).

## Trace Filters

The trace list includes filters so you can narrow down the exact runs you care about before opening details.

![Trace filters overview](https://cdn.voltagent.dev/docs/observability/tracing/overview-trace-filters.gif)

- **Status**: isolate failed or retry-heavy runs.
- **Agent ID**: compare behavior across agents.
- **Entity type**: focus on agent/tool/llm steps at scale.
- **Token usage**: find expensive runs by input/output size.
- **Cost**: spot budget spikes quickly.
- **Duration**: isolate slow traces and latency outliers.
- **Feedback source / key**: review user or model feedback by source.
- **User ID / Conversation ID**: drill into a specific user journey.
