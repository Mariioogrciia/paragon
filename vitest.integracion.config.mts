import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Pruebas de integración contra un Postgres de verdad (5 nov 2026): las
 * consultas SQL que ninguna prueba pura puede comprobar (la «trampa
 * recurrente» de docs/HANDOFF.md: cosas que compilan y no hacen nada).
 *
 *   DATABASE_URL=postgres://…/base_de_prueba npx drizzle-kit push --force
 *   DATABASE_URL=postgres://…/base_de_prueba npm run test:integracion
 *
 * NUNCA contra la base de producción: las pruebas insertan y borran filas.
 * En la CI va contra un Postgres de servicio vacío (comprobaciones.yml).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only-vacio.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integracion/**/*.integracion.ts"],
    environment: "node",
    // Una sola conexión compartida (db/index.ts) y datos que se pisan: en serie.
    fileParallelism: false,
    testTimeout: 20_000,
    setupFiles: ["tests/integracion/preparar.ts"],
  },
});
