import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { listPendingRequests, sendFriendRequest } from "@/lib/profiles";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Amigos en la app (5 oct 2026): hasta ahora solo se podían VER
 * (/api/mobile/social); añadir, aceptar y rechazar solo existía en la web.
 * GET → solicitudes que te han enviado y aún no has respondido.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const pendientes = await listPendingRequests(userId);
  return NextResponse.json({
    pendientes: pendientes.map((p) => ({ userId: p.userId, handle: p.handle, name: p.displayName, image: p.avatarUrl ?? p.image })),
  });
}

/** `{ "handle": "mario" }` (con o sin @). Si esa persona ya te la había enviado, quedáis como amigos. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }
  const body = await req.json().catch(() => null);
  const handle = String(body?.handle ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!handle) return errorMovil(req, "Escribe el usuario de tu amigo.", 400);
  const r = await sendFriendRequest(userId, handle);
  if (!r.ok) return errorMovil(req, r.error, 409);
  return NextResponse.json({ ok: true, amigos: r.accepted });
}
