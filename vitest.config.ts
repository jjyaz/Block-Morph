import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": "/workspace/src",
      "@blockmorph/sdk": "/workspace/packages/blockmorph-sdk/src/index.ts",
    },
  },
});
