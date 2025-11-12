---
"@voltagent/server-core": patch
---

fix: prevent NoOutputSpecifiedError when experimental_output is not provided

## The Problem

When `experimental_output` parameter was added to HTTP text endpoints but not provided in requests, accessing `result.experimental_output` would throw `AI_NoOutputSpecifiedError`. This happened because AI SDK's `experimental_output` getter throws an error when the output schema is not defined.

## The Solution

Wrapped `experimental_output` access in a try-catch block in `handleGenerateText()` to safely handle cases where the parameter is not provided:

```typescript
// Safe access pattern
...(() => {
  try {
    return result.experimental_output ? { experimental_output: result.experimental_output } : {};
  } catch {
    return {};
  }
})()
```

## Impact

- **No Breaking Changes:** Endpoints work correctly both with and without `experimental_output`
- **Better Error Handling:** Gracefully handles missing output schemas instead of throwing errors
- **Backward Compatible:** Existing API calls continue to work without modification
