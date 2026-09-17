import { NextResponse } from "next/server";
import { fetchLibrary as fetchPsnLibrary } from "@/lib/psn/client";
import { fetchLibrary as fetchSteamLibrary } from "@/lib/steam/client";
import { fetchLibrary as fetchXblLibrary } from "@/lib/xbl/client";

/**
 * Diagnóstico TEMPORAL — para confirmar si `DATABASE_URL` en Vercel apunta
 * al mismo proyecto de Supabase que `.env.local` en desarrollo (sin exponer
 * nunca la contraseña), y si las credenciales de PSN/Steam/Xbox en
 * producción de verdad funcionan (el cron real lleva ~2h sin avanzar pese a
 * que las mismas cuentas responden bien en local). Borrar en cuanto se
 * confirme (ver HANDOFF.md, sesión del 17 de septiembre de 2026).
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = process.env.DATABASE_URL ?? "";
  const match = url.match(/^[^:]+:\/\/([^:@]+)(?::[^@]+)?@([^/]+)\/([^?]*)/);

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const accountId = searchParams.get("accountId");

  let libraryCheck: { ok: boolean; games?: number; error?: string; ms: number } | null = null;
  if (platform && accountId) {
    const start = Date.now();
    try {
      const lib =
        platform === "psn" ? await fetchPsnLibrary(accountId) :
        platform === "steam" ? await fetchSteamLibrary(accountId) :
        platform === "xbox" ? await fetchXblLibrary(accountId) :
        null;
      if (lib === null) throw new Error(`platform desconocida: ${platform}`);
      libraryCheck = { ok: true, games: lib.length, ms: Date.now() - start };
    } catch (error) {
      libraryCheck = { ok: false, error: error instanceof Error ? error.message : String(error), ms: Date.now() - start };
    }
  }

  return NextResponse.json({
    db: { user: match?.[1] ?? null, host: match?.[2] ?? null, name: match?.[3] ?? null },
    libraryCheck,
  });
}
