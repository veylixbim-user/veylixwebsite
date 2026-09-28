import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // tests/e2e are plain Node scripts run against a live server (see tests/e2e/README.md).
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "tests/e2e/**"]),
]);
