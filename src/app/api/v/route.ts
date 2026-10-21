import { auth } from "@/auth";
import { registrar404, registrarBot, registrarRendimiento, registrarVista } from "@/lib/trafico";
import {
  METRICAS_WEB_VITALS,
  campanaDe,
  dispositivoDe,
  esBot,
  esMovil,
  idiomaDe,
  navegadorDe,
  nombreBot,
  normalizarRuta,
  origenDe,
  paisDe,
  pantallaDe,
  sistemaDe,
} from "@/lib/traficoRutas";

/**
 * Contador de tráfico propio (21 oct 2026, ver lib/trafico.ts). Lo llama
 * `ContadorVisitas` con `sendBeacon`. Responde siempre 204 y deprisa: es
 * estadística, no puede molestar ni fallar en voz alta.
 *
 * Tres tipos de aviso (`k`):
 * - sin `k`: una página vista. En la primera de la visita llegan además el
 *   idioma, el ancho de pantalla, el tema y la campaña (utm_source); el país
 *   sale de la cabecera de Vercel y el navegador/sistema del User-Agent,
 *   reducidos a una etiqueta (lib/traficoRutas.ts). No se guarda la IP.
 * - `wv`: una medida de Web Vitals (22 oct 2026).
 * - `404`: una dirección que no existe (22 oct 2026).
 *
 * Los bots no cuentan como visitas, pero se apunta su familia.
 */
export async function POST(req: Request) {
  const nada = new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent");
  if (esBot(ua)) {
    await registrarBot(nombreBot(ua));
    return nada;
  }
  const texto = await req.text().catch(() => "");
  if (texto.length > 2000) return nada;
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return nada;
  }
  if (!cuerpo || typeof cuerpo !== "object") return nada;

  if (cuerpo.k === "wv") {
    const metrica = METRICAS_WEB_VITALS.find((m) => m === cuerpo.n);
    const valor = typeof cuerpo.v === "number" && Number.isFinite(cuerpo.v) && cuerpo.v >= 0 && cuerpo.v < 120_000 ? cuerpo.v : null;
    const nota = cuerpo.c === "good" || cuerpo.c === "needs-improvement" || cuerpo.c === "poor" ? cuerpo.c : null;
    if (metrica && valor !== null && nota) await registrarRendimiento(metrica, valor, nota);
    return nada;
  }

  if (cuerpo.k === "404") {
    const ruta = typeof cuerpo.r === "string" ? cuerpo.r.split(/[?#]/)[0] : "";
    if (ruta.startsWith("/") && !ruta.startsWith("/_next")) await registrar404(ruta);
    return nada;
  }

  const ruta = typeof cuerpo.r === "string" ? normalizarRuta(cuerpo.r) : null;
  if (!ruta) return nada;
  const origen = cuerpo.e === true ? origenDe(typeof cuerpo.ref === "string" ? cuerpo.ref : null) : null;
  // Solo es entrada si además viene de fuera (o directa): recargar o volver no cuenta.
  const entrada = cuerpo.e === true && origen !== null;
  const session = await auth().catch(() => null);
  await registrarVista({
    ruta,
    entrada,
    origen,
    movil: esMovil(ua),
    userId: session?.user?.id ?? null,
    visita: entrada
      ? {
          pais: paisDe(req.headers.get("x-vercel-ip-country")),
          navegador: navegadorDe(ua),
          sistema: sistemaDe(ua),
          dispositivo: dispositivoDe(ua),
          idioma: idiomaDe(cuerpo.l),
          pantalla: pantallaDe(cuerpo.w),
          tema: cuerpo.t === "oscuro" || cuerpo.t === "claro" ? cuerpo.t : null,
          campana: campanaDe(cuerpo.u),
        }
      : null,
  });
  return nada;
}
