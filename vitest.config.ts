import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` lanza a propósito si se importa fuera de un Server
      // Component; en los tests no hay ni servidor ni cliente de React.
      "server-only": fileURLToPath(new URL("./tests/server-only-vacio.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
