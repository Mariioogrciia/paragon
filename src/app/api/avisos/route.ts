import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { avisosDe, marcarAvisosLeidos } from "@/lib/bandeja";
import { esIdioma } from "@/lib/idiomasTrofeo";

/**
 * Bandeja de avisos de la web (16 oct 2026, ver lib/bandeja.ts): la campana
 * de la cabecera (components/CampanaAvisos.tsx) la pide al abrir la página y
 * cada poco mientras la pestaña está a la vista. POST: todo leído.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ avisos: [], noLeidos: 0 }, { status: 401 });
  const locale = await getLocale();
  const datos = await avisosDe(session.user.id, esIdioma(locale) ? locale : "es");
  return NextResponse.json(datos, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  await marcarAvisosLeidos(session.user.id);
  return NextResponse.json({ ok: true });
}
