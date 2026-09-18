import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { isHandleTaken, setHandle } from "@/lib/profiles";

// Misma regla que HANDLE_RE en src/app/actions.ts (chooseHandleAction) —
// duplicada a propósito, no importada, porque ese archivo es "use server"
// de la web y no se puede tirar de él desde una API route sin acoplar las
// dos cosas.
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/**
 * Paso 1 del alta en dos pasos (ver src/app/bienvenida/page.tsx, la versión
 * web) para quien entra por la app nativa: sin esto, un login nuevo por
 * Google/Discord se queda con `profile.handle` vacío para siempre y
 * `/api/mobile/panel` devuelve 409 en bucle sin ningún sitio desde el que
 * arreglarlo — la app solo tenía el botón "Reintentar" del ErrorGate.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const handle = String(body?.handle ?? "").trim().toLowerCase();

  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json(
      { error: "Entre 3 y 20 caracteres, solo minúsculas, números y guion bajo." },
      { status: 400 },
    );
  }

  if (await isHandleTaken(handle, userId)) {
    return NextResponse.json({ error: "Ese nombre de usuario ya está cogido." }, { status: 409 });
  }

  await setHandle(userId, handle);

  return NextResponse.json({ ok: true, handle });
}
