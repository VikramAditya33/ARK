import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".ark/**",
      ".private/**",
      ".turbo/**",
      "**/artifacts/**",
      "**/coverage/**",
      "**/dist/**",
      "examples/**",
      "**/node_modules/**",
      "**/recordings/**",
      "**/reports/**",
      "**/screenshots/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/**/*.ts", "packages/**/*.ts", "tools/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
