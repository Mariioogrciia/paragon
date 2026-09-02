import { NextResponse } from "next/server";

export async function GET() {
  // En un entorno de producción, aquí conectarías con la API de IGDB o RAWG
  // mediante un Client ID y Client Secret para obtener datos en tiempo real.
  // const res = await fetch("https://api.igdb.com/v4/games", { ... });

  const upcomingGames = [
    {
      id: "1",
      title: "Grand Theft Auto VI",
      releaseDate: "Otoño 2025",
      platforms: ["PS5", "Xbox Series X|S"],
      cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7ihz.jpg",
    },
    {
      id: "2",
      title: "Monster Hunter Wilds",
      releaseDate: "28 Feb 2025",
      platforms: ["PS5", "PC", "Xbox Series X|S"],
      cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7d62.jpg",
    },
    {
      id: "3",
      title: "DOOM: The Dark Ages",
      releaseDate: "2025",
      platforms: ["PS5", "PC", "Xbox Series X|S"],
      cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co8d8g.jpg",
    },
    {
      id: "4",
      title: "Death Stranding 2: On the Beach",
      releaseDate: "2025",
      platforms: ["PS5"],
      cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7in4.jpg",
    },
  ];

  return NextResponse.json(upcomingGames);
}
