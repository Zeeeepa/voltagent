# Packaging and Deployment Strategy

This document outlines the packaging and deployment strategy for VoltAgent, ensuring it can be published to npm and used as a dependency.

## Package Structure

VoltAgent is organized as a monorepo using pnpm workspaces and Lerna. The repository contains the following packages:

- `@voltagent/core`: The core agent framework
- `@voltagent/mcp-server`: The Model Context Protocol (MCP) server implementation
- `@voltagent/task-manager`: The task management system
- Various provider packages (anthropic-ai, google-ai, etc.)

## Build Process

### Build Tools

VoltAgent uses [tsup](https://github.com/egoist/tsup) for building packages. tsup is a fast, zero-config TypeScript bundler powered by esbuild.

Each package has its own `tsup.config.ts` file that defines the build configuration:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],  // Build both CommonJS and ES Modules
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "es2020",
  outDir: "dist",
  minify: false,
  dts: true,  // Generate TypeScript declaration files
});
```

### Building Packages

To build all packages:

```bash
pnpm build
```

To build a specific package:

```bash
pnpm build --filter @voltagent/core
```

## Package Configuration

### package.json

Each package has a `package.json` file with the following key configurations:

```json
{
  "name": "@voltagent/package-name",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ]
}
```

This configuration ensures:

1. **Dual Package Support**: Both CommonJS (`require`) and ES Modules (`import`) are supported
2. **TypeScript Support**: TypeScript declaration files are included
3. **Package Size Optimization**: Only the `dist` directory is included in the published package

## Versioning and Release Process

VoltAgent uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing packages.

### Creating a Changeset

When making changes that should be released:

```bash
pnpm changeset
```

This will prompt you to:
1. Select the packages that have changed
2. Choose the semver bump type (patch, minor, major)
3. Write a summary of the changes

### Releasing Packages

To prepare a release:

```bash
pnpm version-packages
```

This will:
1. Update the version numbers in package.json files
2. Update the CHANGELOG.md files
3. Create a new commit with these changes

To publish the packages:

```bash
pnpm release
```

## Publishing to npm

### Configuration

The root `package.json` includes the following publishing configuration:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

This ensures that scoped packages (`@voltagent/*`) are published as public packages.

### Publishing Process

1. Ensure you're logged in to npm:
   ```bash
   npm login
   ```

2. Build all packages:
   ```bash
   pnpm build
   ```

3. Publish packages:
   ```bash
   pnpm release
   ```

## CI/CD Integration

VoltAgent uses GitHub Actions for continuous integration and deployment:

1. **Pull Request Workflow**: Runs tests and builds packages to ensure changes don't break the build
2. **Release Workflow**: Automatically publishes packages to npm when changes are merged to the main branch

## Development Workflow

1. Clone the repository:
   ```bash
   git clone https://github.com/Zeeeepa/voltagent.git
   cd voltagent
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

4. Run tests:
   ```bash
   pnpm test
   ```

5. Start development mode:
   ```bash
   pnpm dev
   ```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**: Ensure all dependencies are installed with `pnpm install`
2. **Build Errors**: Check that TypeScript is properly configured and all imports are correct
3. **Publishing Errors**: Verify that you're logged in to npm and have the correct permissions

### Cleaning the Build

To clean all build artifacts:

```bash
pnpm clean
```

To completely reset the environment:

```bash
pnpm nuke
```

