---
title: Trace Inspectors
---

When you open a trace, the drawer shows three tabs. Each tab helps you answer a different debugging question.

## Waterfall

Use Waterfall to understand timing and execution order. It shows spans as a hierarchy so you can see where time is spent, how retries fan out, and which step failed first.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/observability/tracing/waterfall.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Use Waterfall when you need the root cause of a failure or a latency spike. The details panel gives the context you need to confirm tool usage, memory behavior, and LLM settings without digging through logs.

Key signals to check:

- **Failure path**: error badges + child spans to see the first break and its causes.
- **Latency hotspots**: duration bars and timing to find the slowest steps.
- **Model context**: input/output and UI vs model messages to verify prompts and responses.
- **Configuration**: LLM config, memory config, and knowledge base usage for this span.

## Logs

Use Logs to review structured events tied to the trace and span context. This is the fastest way to inspect errors and metadata without opening each span.

Logs are best when you need a fast answer to “what happened and why.” Start with errors, then use search or level filters to narrow down, and follow the trace/span context to the exact step.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/observability/tracing/logs-2.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

## Feedback

Use Feedback to tie human judgment to a specific trace so you can validate fixes and catch regressions early. It turns “this felt wrong” into a trackable signal you can compare across runs.

What to look at:

- **History and source**: confirm the trace was rated and where it came from (app, API, model).
- **Key and score**: keep signals consistent (for example, satisfaction) so you can compare runs.
- **Comments**: capture short context that explains why the output was good or bad.

<img
src="https://cdn.voltagent.dev/docs/observability/tracing/feedback.gif"
alt="Trace filters overview"
style={{ width: "520px", maxWidth: "100%", borderRadius: "12px", display: "block", margin: "0 auto" }}
/>

<br/>
