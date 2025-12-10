---
"@voltagent/core": patch
---

fix: schema serialization for workflows and tools when projects use Zod 4.

## The Problem

Zod 4 changed its internal `_def` shape (e.g., `type` instead of `typeName`, `shape` as an object, `element` for arrays). Our lightweight `zodSchemaToJsonUI` only understood the Zod 3 layout, so Zod 4 workflows/tools exposed `inputSchema`/`resultSchema` as `{ type: "unknown" }` in `/workflows/{id}` and tool metadata.

## The Solution

Teach `zodSchemaToJsonUI` both v3 and v4 shapes: look at `_def.type` as well as `_def.typeName`, handle v4 object `shape`, array `element`, enum entries, optional/default unwrap, and record value types. Default values are picked up whether they’re stored as a function (v3) or a raw value (v4).

## Impact

API consumers and UIs now see real input/result/output schemas for Zod 4-authored workflows and tools instead of `{ type: "unknown" }`, restoring schema-driven rendering and validation.
