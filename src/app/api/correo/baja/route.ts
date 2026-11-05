import { verificarEnlace } from "@/lib/enlaceFirmado";
import { cambiarSuscripcion } from "@/lib/correo";
import { dominioPublico } from "@/lib/site";

/**
 * Baja del resumen semanal por correo (lib/correo.ts). GET desde el enlace
 * del correo (lleva a Ajustes → Avisos con el resultado) y POST de un clic
 * (`List-Unsubscribe-Post`, el botón "Cancelar suscripción" de Gmail).
 */
async function darDeBaja(request: Request): Promise<boolean> {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const userId = verificarEnlace("baja-correo", token);
  if (!userId) return false;
  await cambiarSuscripcion(userId, false);
  return true;
}

export async function GET(request: Request) {
  const ok = await darDeBaja(request);
  return Response.redirect(`${dominioPublico()}/ajustes/avisos?correo=${ok ? "baja" : "enlace-roto"}`, 303);
}

export async function POST(request: Request) {
  const ok = await darDeBaja(request);
  return new Response(null, { status: ok ? 200 : 400 });
}
