import { NextResponse } from "next/server";

/**
 * Diagnóstico TEMPORAL — para confirmar si `DATABASE_URL` en Vercel apunta
 * al mismo proyecto de Supabase que `.env.local` en desarrollo, sin
 * exponer nunca la contraseña. Borrar en cuanto se confirme (ver HANDOFF.md,
 * sesión del 17 de septiembre de 2026).
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = process.env.DATABASE_URL ?? "";
  const match = url.match(/^[^:]+:\/\/([^:@]+)(?::[^@]+)?@([^/]+)\/([^?]*)/);

  return NextResponse.json({
    user: match?.[1] ?? null,
    host: match?.[2] ?? null,
    db: match?.[3] ?? null,
  });
}
