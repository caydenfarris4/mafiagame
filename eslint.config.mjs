import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma clients and Cloudflare build output.
    "src/generated/**",
    ".open-next/**",
    ".wrangler/**",
    // Build-time tooling, not shipped app code.
    "scripts/**",
  ]),
]);

export default eslintConfig;
