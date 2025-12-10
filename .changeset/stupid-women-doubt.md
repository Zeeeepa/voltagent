---
"@voltagent/core": patch
---

feat: add Gmail actions to VoltOps SDK client

- Added `actions.gmail.sendEmail`, `replyToEmail`, `searchEmail`, `getEmail`, `getThread`
- Supports inline or stored credentials (OAuth refresh token or service account)

Usage:

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: "<public-key>",
  secretKey: "<secret-key>",
});

await voltops.actions.gmail.sendEmail({
  credential: { credentialId: "<gmail-credential-id>" },
  to: ["teammate@example.com"],
  cc: ["manager@example.com"],
  subject: "Status update",
  bodyType: "text",
  body: "All systems operational.",
  attachments: [
    {
      filename: "notes.txt",
      content: "YmFzZTY0LWNvbnRlbnQ=",
      contentType: "text/plain",
    },
  ],
});
```
