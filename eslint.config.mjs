import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  js.configs.recommended,
  nextPlugin.flatConfig.coreWebVitals,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    files: ["next.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
      },
    },
  },
];
