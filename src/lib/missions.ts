import "server-only";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, gameTrophies, userTrophies } from "@/db/schema";

export interface WeeklyMission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xp: number;
}

function inicioSemana(hoy = new Date()): Date {
  const dia = hoy.getUTCDay();
  const distancia = dia === 0 ? 6 : dia - 1;
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - distancia));
}

/** "2026-W36" — la misma semana natural que usa `inicioSemana()`, en texto
 * para poder convertirla en una semilla estable. */
function claveDeSemana(hoy = new Date()): string {
  const inicio = inicioSemana(hoy);
  // Nº de semana ISO aproximado: de sobra para que cambie una vez a la
  // semana y nunca se repita en años distintos (el año entra en la clave).
  const dias = Math.floor((inicio.getTime() - Date.UTC(inicio.getUTCFullYear(), 0, 1)) / 86_400_000);
  return `${inicio.getUTCFullYear()}-W${Math.floor(dias / 7)}`;
}

function hashCadena(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** PRNG determinista (mulberry32): misma semilla, misma secuencia siempre —
 * es lo que permite que TODO el mundo vea los mismos 4 retos esta semana
 * (comparables entre amigos) y que cambien solos la semana que viene, sin
 * que nadie tenga que inventar nada a mano. */
function mulberry32(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Agregados {
  trofeos: number;
  platinos: number;
  raros: number;
  ultraRaros: number;
  dias: number;
  finde: number;
  juegosDistintos: number;
  generosDistintos: number;
  plataformasDistintas: number;
  oro: number;
  plata: number;
  bronce: number;
}

interface Plantilla {
  id: string;
  title: string;
  description: string;
  target: number;
  xp: number;
  valor: (a: Agregados) => number;
}

/**
 * El catálogo entero de retos posibles — 12 de momento. Cada semana se
 * eligen 4 al azar (con semilla fija por semana, ver `mulberry32`), así que
 * no son siempre "Ritmo de caza"/"Una joya semanal"/... como al principio:
 * hay variedad real sin que nadie tenga que mantenerlo.
 */
const CATALOGO: Plantilla[] = [
  { id: "trofeos", title: "Ritmo de caza", description: "Consigue 5 trofeos esta semana.", target: 5, xp: 100, valor: (a) => a.trofeos },
  { id: "platino", title: "Una joya semanal", description: "Consigue 1 platino esta semana.", target: 1, xp: 250, valor: (a) => a.platinos },
  { id: "raros", title: "Cazador de rarezas", description: "Consigue 2 trofeos con 10% de rareza o menos.", target: 2, xp: 150, valor: (a) => a.raros },
  { id: "ultra-raros", title: "Ultra raro", description: "Consigue 1 trofeo con 5% de rareza o menos.", target: 1, xp: 175, valor: (a) => a.ultraRaros },
  { id: "dias", title: "Constancia", description: "Consigue logros en 3 días distintos.", target: 3, xp: 125, valor: (a) => a.dias },
  { id: "finde", title: "Sesión de fin de semana", description: "Consigue algún logro en sábado o domingo.", target: 1, xp: 75, valor: (a) => a.finde },
  { id: "juegos", title: "Doble ración", description: "Consigue trofeos en 2 juegos distintos.", target: 2, xp: 100, valor: (a) => a.juegosDistintos },
  { id: "generos", title: "Explorador", description: "Consigue trofeos en juegos de 2 géneros distintos.", target: 2, xp: 125, valor: (a) => a.generosDistintos },
  { id: "plataformas", title: "Multiplataforma", description: "Consigue trofeos en 2 plataformas distintas.", target: 2, xp: 150, valor: (a) => a.plataformasDistintas },
  { id: "oro", title: "Racha de oro", description: "Consigue 3 trofeos de oro.", target: 3, xp: 125, valor: (a) => a.oro },
  { id: "plata", title: "Cosecha de plata", description: "Consigue 4 trofeos de plata.", target: 4, xp: 110, valor: (a) => a.plata },
  { id: "bronce", title: "Bronce a montones", description: "Consigue 8 trofeos de bronce.", target: 8, xp: 100, valor: (a) => a.bronce },
];

const RETOS_POR_SEMANA = 4;

/** Los 4 elegidos esta semana, en orden estable — mismo resultado para
 * cualquier usuario que llame a esto el mismo día. */
function retosDeLaSemana(hoy = new Date()): Plantilla[] {
  const azar = mulberry32(hashCadena(claveDeSemana(hoy)));
  const barajado = [...CATALOGO];
  // Fisher-Yates con el PRNG con semilla, no Math.random(): tiene que salir
  // igual cada vez que se llama la misma semana.
  for (let i = barajado.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [barajado[i], barajado[j]] = [barajado[j], barajado[i]];
  }
  return barajado.slice(0, RETOS_POR_SEMANA);
}

export async function getWeeklyMissions(userId: string): Promise<WeeklyMission[]> {
  const hoy = new Date();
  const desde = inicioSemana(hoy);

  const filas = await db
    .select({
      gameId: userTrophies.gameId,
      grade: gameTrophies.grade,
      rarity: userTrophies.rarityPercent,
      dia: sql<string>`date(${userTrophies.earnedAt})`,
      diaSemana: sql<number>`extract(dow from ${userTrophies.earnedAt})`,
      platform: games.platform,
      genres: games.genres,
    })
    .from(userTrophies)
    .leftJoin(
      gameTrophies,
      and(
        eq(gameTrophies.gameId, userTrophies.gameId),
        eq(gameTrophies.trophyId, userTrophies.trophyId),
      ),
    )
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        gte(userTrophies.earnedAt, desde),
      ),
    );

  const generos = new Set<string>();
  for (const fila of filas) {
    for (const genero of (fila.genres as string[] | null) ?? []) generos.add(genero);
  }

  const agregados: Agregados = {
    trofeos: filas.length,
    platinos: filas.filter((f) => f.grade === "platinum").length,
    raros: filas.filter((f) => f.rarity !== null && Number(f.rarity) <= 10).length,
    ultraRaros: filas.filter((f) => f.rarity !== null && Number(f.rarity) <= 5).length,
    dias: new Set(filas.map((f) => f.dia)).size,
    // domingo = 0, sábado = 6 en `extract(dow from ...)`.
    finde: filas.some((f) => Number(f.diaSemana) === 0 || Number(f.diaSemana) === 6) ? 1 : 0,
    juegosDistintos: new Set(filas.map((f) => f.gameId)).size,
    generosDistintos: generos.size,
    plataformasDistintas: new Set(filas.map((f) => f.platform)).size,
    oro: filas.filter((f) => f.grade === "gold").length,
    plata: filas.filter((f) => f.grade === "silver").length,
    bronce: filas.filter((f) => f.grade === "bronze").length,
  };

  return retosDeLaSemana(hoy).map((plantilla) => ({
    id: `weekly-${plantilla.id}`,
    title: plantilla.title,
    description: plantilla.description,
    progress: plantilla.valor(agregados),
    target: plantilla.target,
    xp: plantilla.xp,
  }));
}
