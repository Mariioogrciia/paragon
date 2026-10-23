import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { urlSinIssDelProveedor } from "@/lib/authIss";
import { destinoFalloEpic } from "@/lib/epicVuelta";

export const { POST } = handlers;

/**
 * Ver lib/authIss.ts: la vuelta de Discord (y quizá Epic) llega con un `iss` que Auth.js no espera.
 * Y lib/epicVuelta.ts: si la vuelta de Epic falla, a Ajustes con el motivo en vez de a /entrar.
 */
export async function GET(req: NextRequest) {
  const limpia = urlSinIssDelProveedor(new URL(req.url));
  const respuesta = await handlers.GET(limpia ? new NextRequest(limpia, { headers: req.headers }) : req);
  const destino = destinoFalloEpic(new URL(req.url), respuesta, req.headers.get("cookie"));
  if (!destino) return respuesta;
  // Mismas cabeceras (ahí van las cookies que Auth.js borra del intento), otro destino.
  const cabeceras = new Headers(respuesta.headers);
  cabeceras.set("location", destino);
  return new Response(null, { status: respuesta.status, headers: cabeceras });
}
