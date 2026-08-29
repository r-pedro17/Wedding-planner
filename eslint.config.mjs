import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import next from "eslint-config-next";

export default tseslint.config(
  { ignores: [".next/**", ".eve/**", "convex/_generated/**", "node_modules/**", "_tmp/**", ".claude/**", ".agents/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
