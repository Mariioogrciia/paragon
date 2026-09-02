import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit corre fuera de Next, así que .env.local no se carga solo.
config({ path: ".env.local" });

/**
 * Las migraciones van por la conexión directa, no por el pooler de
 * transacciones: el pooler no mantiene sesión entre sentencias y el DDL de
 * drizzle-kit falla ahí. La app sí usa el pooler, que es lo que quiere Vercel.
 */
function connectionString(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;

  // Un host suelto no es una cadena de conexión, y el error que da postgres.js
  // en ese caso ("Invalid URL") no dice cuál de las dos variables está mal.
  if (!/^postgres(ql)?:\/\//.test(value)) {
    throw new Error(
      `${name} no es una cadena de conexión: empieza por "postgresql://usuario:contraseña@host:puerto/base". Lo que hay ahora parece solo el host.`,
    );
  }

  return value;
}

const url = connectionString("DIRECT_URL") ?? connectionString("DATABASE_URL");

if (!url) {
  throw new Error(
    "Falta DATABASE_URL en .env.local. En Supabase: Connect -> Connection string.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
