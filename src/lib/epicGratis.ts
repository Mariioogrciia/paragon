import "server-only";

/**
 * Juegos gratis de la Epic Games Store: el endpoint público que usa la
 * propia tienda para su sección "Gratis" (sin clave). Es lo único propio de
 * Epic que se puede enseñar: no tiene feed de noticias ni catálogo abierto
 * (ver la nota de platformTiles.epicGamesNote).
 *
 * Probado contra la API real (1 oct 2026): `promotions.promotionalOffers`
 * trae la promoción en curso y `upcomingPromotionalOffers` la siguiente; un
 * juego gratis de verdad tiene `discountPercentage: 0` en su oferta (precio
 * final 0). Los que vienen sin promoción son relleno de la tienda y se
 * descartan.
 */

const URL_EPIC = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=es-ES&country=ES&allowCountries=ES";

export interface JuegoGratisEpic {
  titulo: string;
  imagen: string | null;
  /** Apaisada, para el banner del destacado. */
  imagenAncha: string | null;
  url: string;
  inicio: string;
  fin: string;
}

interface Oferta {
  startDate: string;
  endDate: string;
  discountSetting?: { discountPercentage?: number };
}

interface Elemento {
  title: string;
  productSlug?: string | null;
  catalogNs?: { mappings?: { pageSlug: string }[] | null };
  offerMappings?: { pageSlug: string }[] | null;
  keyImages?: { type: string; url: string }[];
  promotions?: {
    promotionalOffers?: { promotionalOffers: Oferta[] }[];
    upcomingPromotionalOffers?: { promotionalOffers: Oferta[] }[];
  } | null;
}

function aJuego(e: Elemento, o: Oferta): JuegoGratisEpic {
  const slug = (e.offerMappings?.[0]?.pageSlug || e.catalogNs?.mappings?.[0]?.pageSlug || e.productSlug || "").replace(/\/home$/, "");
  const imagen = e.keyImages?.find((k) => k.type === "OfferImageTall")?.url ?? e.keyImages?.find((k) => k.type === "Thumbnail")?.url ?? null;
  const imagenAncha = e.keyImages?.find((k) => k.type === "OfferImageWide")?.url ?? e.keyImages?.find((k) => k.type === "featuredMedia")?.url ?? null;
  return {
    titulo: e.title,
    imagen,
    imagenAncha,
    url: slug ? `https://store.epicgames.com/es-ES/p/${slug}` : "https://store.epicgames.com/es-ES/free-games",
    inicio: o.startDate,
    fin: o.endDate,
  };
}

export async function getEpicGratis(): Promise<{ ahora: JuegoGratisEpic[]; proximos: JuegoGratisEpic[] }> {
  try {
    const res = await fetch(URL_EPIC, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { ahora: [], proximos: [] };
    const datos = await res.json();
    const elementos: Elemento[] = datos?.data?.Catalog?.searchStore?.elements ?? [];
    const ahoraMs = Date.now();
    const ahora: JuegoGratisEpic[] = [];
    const proximos: JuegoGratisEpic[] = [];
    for (const e of elementos) {
      const actual = e.promotions?.promotionalOffers?.[0]?.promotionalOffers?.find((o) => o.discountSetting?.discountPercentage === 0);
      const siguiente = e.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.find((o) => o.discountSetting?.discountPercentage === 0);
      // La respuesta se cachea una hora: una promoción que ya acabó o que ya
      // empezó se recoloca aquí con la hora real, no con la del caché.
      for (const o of [actual, siguiente]) {
        if (!o) continue;
        const inicio = new Date(o.startDate).getTime();
        const fin = new Date(o.endDate).getTime();
        if (fin <= ahoraMs) continue;
        (inicio <= ahoraMs ? ahora : proximos).push(aJuego(e, o));
      }
    }
    const porInicio = (a: JuegoGratisEpic, b: JuegoGratisEpic) => a.inicio.localeCompare(b.inicio);
    return { ahora: ahora.sort(porInicio), proximos: proximos.sort(porInicio) };
  } catch {
    return { ahora: [], proximos: [] };
  }
}
