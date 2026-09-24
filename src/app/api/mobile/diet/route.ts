import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { dietaGamer } from "@/lib/dietaGamer";

/**
 * "Dieta Gamer" — aviso amistoso si tus últimos 3 juegos terminados
 * comparten género y suman muchas horas (ver `dietaGamer()` en
 * lib/dietaGamer.ts para los umbrales exactos). `null` cuando no aplica —
 * es el estado normal la mayoría de las veces, no un error.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
  }

  const { games } = await getLibrary(profile);
  const dieta = dietaGamer(games);

  return NextResponse.json({ dieta });
}
