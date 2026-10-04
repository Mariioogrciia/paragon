import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ESTILO_REQUISITOS } from "@/lib/level";
import { getParagonLevel } from "@/lib/paragonLevel";

/**
 * Apariencia guardada en la cuenta (acento, color libre, paleta de juego,
 * estilo, tamaño de texto): la misma para la web (guardarAparienciaAction)
 * y la app Android (/api/mobile/appearance), para que lo que se elige en un
 * sitio salga igual en el otro (4 oct 2026). El modo (oscuro/claro/OLED/
 * contraste) NO se guarda aquí a propósito: depende del dispositivo (el
 * móvil puede seguir al sistema y el portátil no).
 */

export interface AparienciaCuenta {
  acento: string;
  acentoLibre: string;
  acentoJuego?: { id: string; color: string };
  estilo: string;
  tamanoTexto: string;
}

export const TAMANOS_TEXTO_VALIDOS = ["", "grande", "enorme", "pequeno"];

/**
 * Deja solo valores válidos (nada de clases o colores inventados por un
 * cliente) y quita un estilo por encima del nivel de la persona.
 */
export async function normalizarApariencia(userId: string, ap: Partial<Record<keyof AparienciaCuenta, unknown>>): Promise<AparienciaCuenta> {
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const acento = /^(accent-[a-z]+)?$/.test(texto(ap.acento)) ? texto(ap.acento) : "";
  const acentoLibre = /^(#[0-9a-f]{6})?$/i.test(texto(ap.acentoLibre)) ? texto(ap.acentoLibre).toLowerCase() : "";
  // Paleta "desde tu juego": id del juego (solo para marcar cuál está
  // elegido) y el color de su carátula; la paleta se recalcula al cargar.
  const juego = ap.acentoJuego as { id?: unknown; color?: unknown } | undefined;
  const acentoJuego =
    juego && typeof juego.id === "string" && typeof juego.color === "string" && /^[\w:.-]{1,120}$/.test(juego.id) && /^#[0-9a-f]{6}$/i.test(juego.color)
      ? { id: juego.id, color: juego.color }
      : undefined;
  let estilo = /^(estilo-[a-z0-9]+)?$/.test(texto(ap.estilo)) ? texto(ap.estilo) : "";
  const tamanoTexto = TAMANOS_TEXTO_VALIDOS.includes(texto(ap.tamanoTexto)) ? texto(ap.tamanoTexto) : "";
  if (estilo && ESTILO_REQUISITOS[estilo] !== undefined) {
    const nivel = await getParagonLevel(userId);
    if (nivel.level < ESTILO_REQUISITOS[estilo]) estilo = "";
  }
  return { acento, acentoLibre, ...(acentoJuego ? { acentoJuego } : {}), estilo, tamanoTexto };
}

export async function guardarAparienciaCuenta(userId: string, ap: AparienciaCuenta): Promise<void> {
  await getDb().update(users).set({ apariencia: ap }).where(eq(users.id, userId));
}

export async function leerAparienciaCuenta(userId: string): Promise<AparienciaCuenta | null> {
  const [fila] = await getDb().select({ apariencia: users.apariencia }).from(users).where(eq(users.id, userId)).limit(1);
  const ap = fila?.apariencia;
  if (!ap) return null;
  return {
    acento: ap.acento ?? "",
    acentoLibre: ap.acentoLibre ?? "",
    ...(ap.acentoJuego ? { acentoJuego: ap.acentoJuego } : {}),
    estilo: ap.estilo ?? "",
    tamanoTexto: ap.tamanoTexto ?? "",
  };
}
