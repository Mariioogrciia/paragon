import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { getProfileByHandle } from "@/lib/profiles";
import { desgloseDelMes, esMesValido, trofeosDelMes } from "@/lib/history";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * El mes de alguien al lado del tuyo, día a día (9 oct 2026): para comparar
 * en su perfil de la app cuántos trofeos sacó cada uno cada día. `?mes=YYYY-MM`
 * (por defecto el actual en UTC). Mismo cálculo que /api/mobile/stats/month,
 * así que tu columna cuadra con tu "Mes a mes". En tu propio perfil `yo` es
 * `null` (no hay con quién comparar).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("perfil", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return errorMovil(req, "No existe ese usuario", 404);

  const hoy = new Date();
  const actual = `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}`;
  const pedido = new URL(req.url).searchParams.get("mes");
  const mes = pedido && esMesValido(pedido) ? pedido : actual;
  const esMio = profile.userId === userId;

  const [suyo, susTrofeos, mio, misTrofeos] = await Promise.all([
    desgloseDelMes(profile.userId, mes),
    trofeosDelMes(profile.userId, mes),
    esMio ? Promise.resolve(null) : desgloseDelMes(userId, mes),
    esMio ? Promise.resolve(null) : trofeosDelMes(userId, mes),
  ]);

  const lado = (d: Awaited<ReturnType<typeof desgloseDelMes>>, trofeos: Awaited<ReturnType<typeof trofeosDelMes>>) => ({
    total: d.total,
    porDia: d.porDia,
    porJuego: d.porJuego,
    trofeos,
  });

  return NextResponse.json({
    mes,
    ellos: lado(suyo, susTrofeos),
    yo: mio && misTrofeos ? lado(mio, misTrofeos) : null,
  });
}
