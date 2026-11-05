import { getProfileByHandle } from "@/lib/profiles";
import { ultimosTrofeos } from "@/lib/history";
import { dominioPublico } from "@/lib/site";
import { esIdioma } from "@/lib/idiomasTrofeo";
import { rss, textosRss } from "@/lib/rssFeed";

/**
 * RSS de los últimos trofeos de un perfil (`/api/rss/u/<handle>`), para
 * lectores de feeds, bots de foros o IFTTT/Zapier ("cuando salga un platino,
 * publícalo en…"). Mismos datos públicos que "Últimos trofeos" del perfil.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle: bruto } = await params;
  const handle = bruto.replace(/\.(xml|rss)$/i, "").toLowerCase();
  const idiomaPedido = new URL(request.url).searchParams.get("idioma");
  const idioma = esIdioma(idiomaPedido) ? idiomaPedido : "es";

  const profile = await getProfileByHandle(handle);
  if (!profile) return new Response("No existe ese perfil.", { status: 404 });

  const web = dominioPublico();
  const t = textosRss(idioma);
  const trofeos = await ultimosTrofeos(profile.userId, 30, idioma);
  const xml = rss(
    {
      titulo: t.titulo.replace("{h}", handle),
      enlace: `${web}/u/${handle}`,
      descripcion: t.desc.replace("{h}", handle),
      propio: `${web}/api/rss/u/${handle}`,
      idioma,
    },
    trofeos.map((tr) => ({
      guid: `${tr.gameId}:${tr.trophyId}`,
      titulo: `${t[tr.grade ?? "otro"] ?? t.otro} · ${tr.nombre} — ${tr.juego}`,
      enlace: `${web}/u/${handle}/${encodeURIComponent(tr.gameId)}`,
      descripcion: tr.detalle || undefined,
      fecha: new Date(tr.earnedAt),
      imagen: tr.iconUrl ?? tr.gameIconUrl,
    })),
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
