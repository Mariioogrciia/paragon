/**
 * Antes de las pruebas de integración: que DATABASE_URL apunte a una base de
 * PRUEBA. Se niega a correr contra algo que parezca producción (Supabase).
 */
const url = process.env.DATABASE_URL ?? "";
if (!url) throw new Error("Las pruebas de integración necesitan DATABASE_URL (una base de prueba vacía).");
if (/supabase\.(co|com)|pooler\./i.test(url) && process.env.PERMITIR_BASE_REMOTA !== "si") {
  throw new Error("DATABASE_URL parece la base de producción (Supabase). Usa una base de prueba.");
}
process.env.AUTH_SECRET ??= "secreto-de-prueba";
