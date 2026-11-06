import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { errorMovil } from "@/lib/mensajesApi";
import { eventoAnterior, eventoDelMes } from "@/lib/eventos";
import { clasificacionEvento } from "@/lib/eventosComunidad";

/**
 * Evento del mes para la app (6 nov 2026): lo mismo que /ligas/evento en la
 * web. `categoria` es la clave del género (la app la traduce), los días que
 * quedan, el ranking de este mes y el podio del anterior.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const ahora = new Date();
  const evento = eventoDelMes(ahora);
  const anterior = eventoAnterior(ahora);
  const [ranking, podio] = await Promise.all([clasificacionEvento(evento).catch(() => []), clasificacionEvento(anterior, 3).catch(() => [])]);
  const fila = (p: (typeof ranking)[number]) => ({
    handle: p.handle,
    nombre: p.name,
    imagen: p.image,
    puntos: Number(p.puntos),
    trofeos: Number(p.trofeos),
    platinos: Number(p.platinos),
    soyYo: p.userId === userId,
  });
  return NextResponse.json({
    mes: evento.clave,
    categoria: evento.categoria,
    diasRestantes: Math.max(0, Math.ceil((evento.fin.getTime() - ahora.getTime()) / 86_400_000)),
    ranking: ranking.map(fila),
    anterior: { mes: anterior.clave, categoria: anterior.categoria, podio: podio.map(fila) },
  });
}
