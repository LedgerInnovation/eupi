import { defineConfig } from "vitest/config";

// Only the plain-TypeScript tests under test/ run here. The React Native
// surface is covered by typecheck and lint rather than by a native test
// runtime.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
