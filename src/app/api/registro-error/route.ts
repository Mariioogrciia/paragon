import { createHash } from "node:crypto";
import { registrar } from "@/lib/registro";
import { limitar } from "@/lib/rateLimit";
import { esBot, normalizarRuta } from "@/lib/traficoRutas";

/**
 * Errores que ve alguien en la web (21 oct 2026): `error.tsx` y
 * `global-error.tsx` los mandan aquí y quedan en Admin → Registro, en vez de
 * perderse en la consola del navegador de esa persona. Con tope por
 * conexión (la IP solo se usa, resumida, como clave del límite; no se guarda
 * en el registro) y textos recortados.
 */
export async function POST(req: Request) {
  const nada = new Response(null, { status: 204 });
  if (esBot(req.headers.get("user-agent"))) return nada;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
  const clave = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  if (!(await limitar("registroCliente", clave))) return nada;
  const texto = await req.text().catch(() => "");
  if (texto.length > 4000) return nada;
  try {
    const { mensaje, digest, ruta } = JSON.parse(texto) as { mensaje?: unknown; digest?: unknown; ruta?: unknown };
    await registrar("error", "cliente", typeof mensaje === "string" ? mensaje.slice(0, 300) : "Error sin mensaje", {
      digest: typeof digest === "string" ? digest.slice(0, 40) : null,
      ruta: typeof ruta === "string" ? normalizarRuta(ruta) : null,
    });
  } catch {
    // Cuerpo raro: nada que apuntar.
  }
  return nada;
}
