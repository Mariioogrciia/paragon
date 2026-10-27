import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `_prev`/`_formData` los exige la firma de useActionState aunque no
      // se usen: el prefijo `_` es la convención para "a propósito".
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El vídeo de promoción es un proyecto aparte (Remotion, ver video/README.md).
    "video/**",
    // Las copias de trabajo de Claude (.claude/worktrees) son otros checkouts
    // del repo: sin esto, `npm run lint` las revisaba también (11.571 avisos).
    ".claude/**",
  ]),
]);

export default eslintConfig;
