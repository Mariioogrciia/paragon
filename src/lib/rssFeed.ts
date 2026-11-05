/**
 * RSS 2.0 sin dependencias (`rss-parser` solo lee, no escribe). Módulo
 * puro: `tests/rssFeed.test.ts`.
 */

export interface EntradaRss {
  guid: string;
  titulo: string;
  enlace: string;
  descripcion?: string;
  fecha: Date;
  imagen?: string | null;
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

export function rss(canal: { titulo: string; enlace: string; descripcion: string; propio: string; idioma: string }, entradas: EntradaRss[]): string {
  const items = entradas
    .map(
      (e) => `<item>
<title>${escapar(e.titulo)}</title>
<link>${escapar(e.enlace)}</link>
<guid isPermaLink="false">${escapar(e.guid)}</guid>
<pubDate>${e.fecha.toUTCString()}</pubDate>${e.descripcion ? `\n<description>${escapar(e.descripcion)}</description>` : ""}${
        e.imagen ? `\n<enclosure url="${escapar(e.imagen)}" type="image/${/\.png(\?|$)/i.test(e.imagen) ? "png" : "jpeg"}" length="0"/>` : ""
      }
</item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapar(canal.titulo)}</title>
<link>${escapar(canal.enlace)}</link>
<description>${escapar(canal.descripcion)}</description>
<language>${escapar(canal.idioma)}</language>
<atom:link href="${escapar(canal.propio)}" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
}

const GRADO: Record<string, Record<string, string>> = {
  es: { platinum: "Platino", gold: "Oro", silver: "Plata", bronze: "Bronce", otro: "Logro", titulo: "Trofeos de @{h} en Paragon", desc: "Los últimos trofeos y logros de @{h}, de todas sus plataformas." },
  en: { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze", otro: "Achievement", titulo: "@{h}'s trophies on Paragon", desc: "@{h}'s latest trophies and achievements, from every platform." },
  de: { platinum: "Platin", gold: "Gold", silver: "Silber", bronze: "Bronze", otro: "Erfolg", titulo: "Trophäen von @{h} auf Paragon", desc: "Die neuesten Trophäen und Erfolge von @{h}, von allen Plattformen." },
  fr: { platinum: "Platine", gold: "Or", silver: "Argent", bronze: "Bronze", otro: "Succès", titulo: "Trophées de @{h} sur Paragon", desc: "Les derniers trophées et succès de @{h}, sur toutes ses plateformes." },
  it: { platinum: "Platino", gold: "Oro", silver: "Argento", bronze: "Bronzo", otro: "Obiettivo", titulo: "Trofei di @{h} su Paragon", desc: "Gli ultimi trofei e obiettivi di @{h}, da tutte le piattaforme." },
  pt: { platinum: "Platina", gold: "Ouro", silver: "Prata", bronze: "Bronze", otro: "Conquista", titulo: "Troféus de @{h} no Paragon", desc: "Os últimos troféus e conquistas de @{h}, de todas as plataformas." },
};

export function textosRss(idioma: string) {
  return GRADO[idioma] ?? GRADO.es;
}
