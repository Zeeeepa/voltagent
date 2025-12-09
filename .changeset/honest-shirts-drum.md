---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/cli": patch
---

feat: add CLI announcements system for server startup

VoltAgent server now displays announcements during startup, keeping developers informed about new features and updates.

## How It Works

When the server starts, it fetches announcements from a centralized GitHub-hosted JSON file and displays them in a minimal, non-intrusive format:

```
  ⚡ Introducing VoltOps Deployments → https://console.voltagent.dev/deployments
```

## Key Features

- **Dynamic updates**: Announcements are fetched from GitHub at runtime, so new announcements appear without requiring a package update
- **Non-blocking**: Uses a 3-second timeout and fails silently to never delay server startup
- **Minimal footprint**: Single-line format inspired by Next.js, doesn't clutter the console
- **Toggle support**: Each announcement has an `enabled` flag for easy control

## Technical Details

- Announcements source: `https://raw.githubusercontent.com/VoltAgent/voltagent/main/announcements.json`
- New `showAnnouncements()` function exported from `@voltagent/server-core`
- Integrated into both `BaseServerProvider` and `HonoServerProvider` startup flow
