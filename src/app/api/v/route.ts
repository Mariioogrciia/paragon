import { auth } from "@/auth";
import { registrarVista } from "@/lib/trafico";
import { esBot, esMovil, normalizarRuta, origenDe } from "@/lib/traficoRutas";

/**
 * Contador de páginas vistas (21 oct 2026, ver lib/trafico.ts). Lo llama
 * `ContadorVisitas` con `sendBeacon` en cada cambio de página. Responde
 * siempre 204 y deprisa: es estadística, no puede molestar ni fallar en voz
 * alta. No se guarda la IP ni el navegador; solo el tipo de página, si era
 * la primera de la visita y de qué dominio venía, y si era un móvil.
 */
export async function POST(req: Request) {
  const nada = new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent");
  if (esBot(ua)) return nada;
  const texto = await req.text().catch(() => "");
  if (texto.length > 2000) return nada;
  let cuerpo: { r?: unknown; ref?: unknown; e?: unknown };
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return nada;
  }
  const ruta = typeof cuerpo.r === "string" ? normalizarRuta(cuerpo.r) : null;
  if (!ruta) return nada;
  const entrada = cuerpo.e === true;
  const origen = entrada ? origenDe(typeof cuerpo.ref === "string" ? cuerpo.ref : null) : null;
  const session = await auth().catch(() => null);
  await registrarVista({
    ruta,
    // Solo es entrada si además viene de fuera (o directa): recargar o volver no cuenta.
    entrada: entrada && origen !== null,
    origen,
    movil: esMovil(ua),
    userId: session?.user?.id ?? null,
  });
  return nada;
}
