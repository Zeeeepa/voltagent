---
"@voltagent/server-hono": patch
---

fix: correct CORS middleware detection to use actual function name 'cors2'

Fixed a critical bug where custom CORS middleware was not being properly detected, causing both custom and default CORS to be applied simultaneously. This resulted in the default CORS (`origin: "*"`) overwriting custom CORS headers on actual POST/GET requests, while OPTIONS (preflight) requests worked correctly.

## The Problem

The middleware detection logic was checking for `middleware.name === "cors"`, but Hono's cors middleware function is actually named `"cors2"`. This caused:

- Detection to always fail → `userConfiguredCors` stayed `false`
- Default CORS (`app.use("*", cors())`) was applied even when users configured custom CORS
- **Both** middlewares executed: custom CORS on specific paths + default CORS on `"*"`
- OPTIONS requests returned correct custom CORS headers ✅
- POST/GET requests had custom headers **overwritten** by default CORS (`*`) ❌

## The Solution

Updated the detection logic to check for the actual function name:

```typescript
// Before: middleware.name === "cors"
// After:  middleware.name === "cors2"
```

Now when users configure custom CORS in `configureApp`, it's properly detected and default CORS is skipped entirely.

## Impact

- Custom CORS configurations now work correctly for **all** request types (OPTIONS, POST, GET, etc.)
- No more default CORS overwriting custom CORS headers
- Fixes browser CORS errors when using custom origins with credentials
- Maintains backward compatibility - default CORS still applies when no custom CORS is configured

## Example

This now works as expected:

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { cors } from "hono/cors";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    configureApp: (app) => {
      app.use(
        "/agents/*",
        cors({
          origin: "http://localhost:3001",
          credentials: true,
        })
      );
    },
  }),
});
```

Both OPTIONS and POST requests now return:

- `Access-Control-Allow-Origin: http://localhost:3001` ✅
- `Access-Control-Allow-Credentials: true` ✅
