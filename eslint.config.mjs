import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: { allowDefaultProject: ["*.mjs"] }, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-empty": ["error", { "allowEmptyCatch": false }],
      "no-console": "error",
      "eqeqeq": ["error", "always"],
      "no-restricted-syntax": [
        "error",
        { "selector": "CatchClause[param=null]", "message": "Handle the error or rethrow; no bare catch." },
        { "selector": "TSTypeAliasDeclaration > TSTypeReference", "message": "No type aliases that only rename another type (coding standards)." }
      ]
    },
  },
  {
    files: ["**/*.mjs", "**/*.config.ts", "e2e/**", "tests/**", "scripts/**"],
    rules: { "no-console": "off" },
  },
]);
