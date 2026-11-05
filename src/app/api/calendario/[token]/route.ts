import { verificarEnlace } from "@/lib/enlaceFirmado";
import { calendarioDe } from "@/lib/calendarioPersonal";
import { dentroDelLimite, ipDe } from "@/lib/rateLimit";

/**
 * Calendario personal para suscribirse desde Google Calendar, Apple o
 * Outlook (`webcal://…/api/calendario/<token>.ics`). El token es un enlace
 * firmado (lib/enlaceFirmado.ts) que se enseña en Ajustes → Avisos: no hay
 * cookie de sesión porque quien lo pide es el servidor de Google, no tú.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const userId = verificarEnlace("calendario", token.replace(/\.ics$/i, ""));
  if (!userId) return new Response("Enlace de calendario no válido.", { status: 404 });

  // Google refresca cada pocas horas; esto solo frena a quien lo pida en bucle.
  if (!(await dentroDelLimite(`calendario:${ipDe(request.headers)}`, 30, 600))) {
    return new Response("Demasiadas peticiones.", { status: 429 });
  }

  const ics = await calendarioDe(userId);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="paragon.ics"',
      // Privado: es el calendario de una persona, no lo guarda la CDN.
      "Cache-Control": "private, max-age=1800",
      "X-Robots-Tag": "noindex",
    },
  });
}
