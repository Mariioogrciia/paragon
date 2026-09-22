import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { linkAccount, PlatformAccountAlreadyLinkedError, unlinkAccount } from "@/lib/profiles";
import type { PlataformaVinculable } from "@/lib/types";
import { PsnProfileNotFoundError } from "@/lib/psn/client";
import { PsnAuthError, PsnNotConfiguredError } from "@/lib/psn/auth";
import { SteamNotConfiguredError, SteamPrivateProfileError, SteamProfileNotFoundError } from "@/lib/steam/client";
import { XblNotConfiguredError, XblProfileNotFoundError } from "@/lib/xbl/client";
import { EpicPrivateProfileError, EpicProfileNotFoundError } from "@/lib/epic/client";

const PLATAFORMAS: PlataformaVinculable[] = ["psn", "steam", "xbox", "epic"];

function esPlataformaVinculable(value: string): value is PlataformaVinculable {
  return (PLATAFORMAS as string[]).includes(value);
}

/** Mismos tipos de error que ya traduce actions.ts (describeError) para la web — mismo criterio, JSON en vez de string suelto. */
function describeError(error: unknown): string {
  if (error instanceof PsnNotConfiguredError) return "El servidor no tiene configurado el acceso a PSN.";
  if (error instanceof PsnAuthError) return error.message;
  if (error instanceof PsnProfileNotFoundError) return error.message;
  if (error instanceof SteamNotConfiguredError) return error.message;
  if (error instanceof SteamProfileNotFoundError) return error.message;
  if (error instanceof SteamPrivateProfileError) return error.message;
  if (error instanceof XblNotConfiguredError) return error.message;
  if (error instanceof XblProfileNotFoundError) return error.message;
  if (error instanceof EpicProfileNotFoundError) return error.message;
  if (error instanceof EpicPrivateProfileError) return error.message;
  if (error instanceof PlatformAccountAlreadyLinkedError) return error.message;
  return "No se ha podido contactar con la plataforma. Inténtalo en un momento.";
}

/** Vincular PSN/Steam/Xbox: `{ "input": "tu-online-id" }` — ver GamerCard/SteamID/Gamertag según la plataforma. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { platform } = await params;
  if (!esPlataformaVinculable(platform)) {
    return NextResponse.json({ error: "Plataforma no válida" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  if (!input) {
    return NextResponse.json({ error: "Falta el identificador de la cuenta" }, { status: 400 });
  }

  try {
    const cuenta = await linkAccount(userId, platform, input);
    return NextResponse.json({
      username: cuenta.username,
      legible: cuenta.legible,
      juegos: cuenta.juegos,
    });
  } catch (error) {
    return NextResponse.json({ error: describeError(error) }, { status: 422 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { platform } = await params;
  if (!esPlataformaVinculable(platform)) {
    return NextResponse.json({ error: "Plataforma no válida" }, { status: 400 });
  }

  await unlinkAccount(userId, platform);
  return NextResponse.json({ ok: true });
}
