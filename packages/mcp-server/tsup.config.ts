import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin/server.ts"],
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "es2020",
  outDir: "dist",
  minify: false,
  dts: true,
  esbuildOptions(options) {
    options.keepNames = true;
    return options;
  },
  banner: {
    js: "#!/usr/bin/env node",
  },
});

