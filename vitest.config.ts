import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/game/**", "src/server/**", "src/app/api/**"],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
      reporter: ["text", "html"],
    },
  },
});
