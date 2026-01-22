---
title: Views
---

# Trace Views

When you open a trace, the drawer shows three tabs. Each tab answers a different question.

## Waterfall

Use Waterfall to understand timing and execution order. It shows spans as a hierarchy so you can see where time is spent, how retries fan out, and which step failed first.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/observability/tracing/waterfall.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Use Waterfall to answer three core questions: what failed, what was slow, and what the model actually saw. The details panel gives the context you need to confirm tool usage, memory behavior, and LLM settings without digging through logs.

Key signals to check:

- **Failure path**: error badges + child spans to see the first break and its causes.
- **Latency hotspots**: duration bars and timing to find the slowest steps.
- **Model context**: input/output and UI vs model messages to verify prompts and responses.
- **Configuration**: LLM config, memory config, and knowledge base usage for this span.

## Logs

Use Logs to review structured events tied to the trace and span context. This is the fastest way to inspect errors and metadata without opening each span.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/observability/tracing/logs-2.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Logs are best when you need a fast answer to “what happened and why.” Start with errors, then follow the trace/span context to the exact step, and use attributes to see the payload that caused it.

## Feedback

Use Feedback to capture human signals for a trace. It helps you compare agent behavior with user sentiment and track quality over time.

<img
src="https://cdn.voltagent.dev/docs/observability/tracing/feedback.gif"
alt="Trace filters overview"
style={{ width: "520px", maxWidth: "100%", borderRadius: "12px" }}
/>

What to look at:

- **Feedback history**: see if this trace has already been rated and by which source.
- **Active key**: understand which signal you are recording (for example, satisfaction).
- **Helpful / Not helpful**: capture a simple quality signal for fast triage.
- **Comments**: add short context that explains why a trace felt good or bad.

:::note Add visuals
Add the Feedback screenshot or GIF here.
:::
