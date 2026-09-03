import type { Game, Player } from "@/lib/types";

/**
 * Perfil de ejemplo de la portada.
 *
 * Datos inventados a mano, sin tocar la base ni ninguna API: la portada la ve
 * gente sin cuenta, y enseñarles el perfil real de un usuario de verdad para
 * "ver cómo queda" es meter a alguien de escaparate sin haberlo pedido.
 *
 * Las cifras están puestas para que se parezcan a una biblioteca real: algún
 * platino, cosas a medias, algo sin empezar y un juego de PC con horas. Si
 * fuera todo al 100%, la pantalla no enseñaría lo que la app hace de verdad,
 * que es decirte lo que te falta.
 */

const HOY = Date.now();
const DIA = 86_400_000;

/** Fecha relativa a hoy, para que el ejemplo no envejezca solo. */
function haceDias(dias: number): string {
  return new Date(HOY - dias * DIA).toISOString();
}

export const DEMO_HANDLE = "ejemplo";

/**
 * Lo del año en curso, aparte porque los juegos de aquí no llevan fecha por
 * trofeo. Va en este fichero, junto a los juegos, para que no se descuadre de
 * ellos: si el "este año" supera al total del perfil, el ejemplo se
 * contradice solo en la misma pantalla.
 */
export const DEMO_ANIO = { trofeos: 96, juegos: 5 };

export const DEMO_JUGADOR: Player = {
  id: "demo",
  name: "Alex Cazatrofeos",
  accounts: [],
  trophyLevel: 312,
};

export const DEMO_JUEGOS: Game[] = [
  {
    id: "psn-DEMO0001",
    platform: "psn",
    title: "Elden Ring",
    deviceLabel: "PS5",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
    lastPlayedAt: haceDias(2),
    progressPercent: 76,
    definedTotal: 42,
    earnedTotal: 32,
    defined: { platinum: 1, gold: 6, silver: 12, bronze: 23 },
    earned: { platinum: 0, gold: 4, silver: 9, bronze: 19 },
    service: "trophy2",
    rating: 5,
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    genres: ["Rol", "Acción"],
  },
  {
    id: "psn-DEMO0002",
    platform: "psn",
    title: "Bloodborne",
    deviceLabel: "PS4",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/cob99l.jpg",
    lastPlayedAt: haceDias(28),
    progressPercent: 100,
    definedTotal: 40,
    earnedTotal: 40,
    defined: { platinum: 1, gold: 5, silver: 8, bronze: 26 },
    earned: { platinum: 1, gold: 5, silver: 8, bronze: 26 },
    service: "trophy",
    rating: 5,
    developer: "FromSoftware",
    publisher: "Sony Interactive Entertainment",
    genres: ["Rol", "Acción"],
  },
  {
    id: "psn-DEMO0003",
    platform: "psn",
    title: "God of War Ragnarök",
    deviceLabel: "PS5",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/coba3d.jpg",
    lastPlayedAt: haceDias(64),
    progressPercent: 100,
    definedTotal: 36,
    earnedTotal: 36,
    defined: { platinum: 1, gold: 3, silver: 9, bronze: 23 },
    earned: { platinum: 1, gold: 3, silver: 9, bronze: 23 },
    service: "trophy2",
    rating: 5,
    developer: "Santa Monica Studio",
    publisher: "Sony Interactive Entertainment",
    genres: ["Acción", "Aventura"],
  },
  {
    id: "psn-DEMO0004",
    platform: "psn",
    title: "Returnal",
    deviceLabel: "PS5",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3wc1.jpg",
    lastPlayedAt: haceDias(9),
    progressPercent: 39,
    definedTotal: 31,
    earnedTotal: 12,
    defined: { platinum: 1, gold: 4, silver: 7, bronze: 19 },
    earned: { platinum: 0, gold: 1, silver: 2, bronze: 9 },
    service: "trophy2",
    rating: 4,
    developer: "Housemarque",
    publisher: "Sony Interactive Entertainment",
    genres: ["Acción", "Roguelike"],
  },
  {
    id: "steam-DEMO0005",
    platform: "steam",
    title: "Hollow Knight",
    deviceLabel: "PC",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/cobfzp.jpg",
    lastPlayedAt: haceDias(5),
    progressPercent: 62,
    definedTotal: 63,
    earnedTotal: 39,
    playtimeMinutes: 5_580,
    rating: 5,
    developer: "Team Cherry",
    publisher: "Team Cherry",
    genres: ["Metroidvania", "Acción"],
  },
  {
    id: "psn-DEMO0006",
    platform: "psn",
    title: "Ghost of Tsushima",
    deviceLabel: "PS5",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2crj.jpg",
    lastPlayedAt: haceDias(120),
    progressPercent: 100,
    definedTotal: 55,
    earnedTotal: 55,
    defined: { platinum: 1, gold: 3, silver: 10, bronze: 41 },
    earned: { platinum: 1, gold: 3, silver: 10, bronze: 41 },
    service: "trophy",
    rating: 4,
    developer: "Sucker Punch",
    publisher: "Sony Interactive Entertainment",
    genres: ["Acción", "Aventura"],
  },
  {
    id: "psn-DEMO0007",
    platform: "psn",
    title: "Silksong",
    deviceLabel: "PS5",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/cobebu.jpg",
    lastPlayedAt: haceDias(1),
    progressPercent: 4,
    definedTotal: 45,
    earnedTotal: 2,
    defined: { platinum: 1, gold: 4, silver: 11, bronze: 29 },
    earned: { platinum: 0, gold: 0, silver: 0, bronze: 2 },
    service: "trophy2",
    developer: "Team Cherry",
    publisher: "Team Cherry",
    genres: ["Metroidvania", "Acción"],
  },
  {
    id: "manual-DEMO0008:switch",
    platform: "manual",
    title: "The Legend of Zelda: Tears of the Kingdom",
    deviceLabel: "Switch",
    iconUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg",
    lastPlayedAt: haceDias(46),
    progressPercent: 100,
    definedTotal: 1,
    earnedTotal: 1,
    rating: 5,
    developer: "Nintendo EPD",
    publisher: "Nintendo",
    genres: ["Aventura"],
  },
];
