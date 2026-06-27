import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.ts",
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/worker-configuration.d.ts"],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
    globals: false,
    include: ["test/**/*.spec.ts"],
    setupFiles: ["test/setup.ts"],
  },
});
