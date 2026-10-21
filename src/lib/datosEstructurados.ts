/**
 * Datos estructurados (JSON-LD, schema.org) para Google y el resto de
 * buscadores (19 oct 2026). No cambian nada de lo que se ve: le dicen al
 * buscador qué es cada página —el sitio, la app, un perfil de jugador, la
 * ficha de un juego— para entenderla mejor y, cuando aplica, enseñarla con
 * mejor aspecto en los resultados. Se validan en
 * https://search.google.com/test/rich-results.
 *
 * Funciones puras (con tests en tests/datosEstructurados.test.ts); las pinta
 * `components/JsonLd.tsx`. Las URLs salen del dominio público
 * (`dominioPublico`, lib/site.ts), así que al cambiar de dominio cambian solas.
 * Solo se pone lo que es verdad: nada de notas o reseñas inventadas.
 */

type Json = Record<string, unknown>;

const NOMBRE = "Paragon";
const DESCRIPCION_ES = "Todos tus trofeos de PlayStation, Steam y Xbox en un solo sitio: progreso, platinos, ligas y amigos.";

/** El sitio y quien lo hace (en el layout raíz, todas las páginas). */
export function datosSitio(dominio: string, perfilesDelAutor: string[]): Json {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${dominio}/#sitio`,
        name: NOMBRE,
        url: `${dominio}/`,
        description: DESCRIPCION_ES,
        inLanguage: ["es", "en", "de", "fr", "it", "pt"],
        publisher: { "@id": `${dominio}/#autor` },
      },
      {
        "@type": "Person",
        "@id": `${dominio}/#autor`,
        name: "Mario García",
        sameAs: perfilesDelAutor,
      },
    ],
  };
}

/** La app (en la portada): gratis, web y móvil. */
export function datosAplicacion(dominio: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: NOMBRE,
    url: `${dominio}/`,
    description: DESCRIPCION_ES,
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Web, Android, iOS",
    image: `${dominio}/logo.png`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    author: { "@id": `${dominio}/#autor` },
  };
}

/** Perfil público de un jugador (/u/[handle]). */
export function datosPerfil(
  dominio: string,
  p: { handle: string; nombre: string | null; imagen: string | null; descripcion: string },
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${dominio}/u/${encodeURIComponent(p.handle)}`,
    description: p.descripcion,
    mainEntity: {
      "@type": "Person",
      name: p.nombre ?? p.handle,
      alternateName: `@${p.handle}`,
      identifier: p.handle,
      ...(p.imagen ? { image: p.imagen } : {}),
      url: `${dominio}/u/${encodeURIComponent(p.handle)}`,
    },
  };
}

/** Ficha de un juego (/juego/[id]). La nota solo si la han votado al menos 3 personas de Paragon. */
export function datosJuego(
  dominio: string,
  j: {
    id: string;
    titulo: string;
    imagen: string | null;
    descripcion: string | null;
    desarrolladora: string | null;
    editora: string | null;
    generos: string[];
    plataformas: string[];
    fechaSalida: string | null;
    nota: { media: number; votos: number } | null;
  },
): Json {
  const org = (nombre: string | null) => (nombre ? { "@type": "Organization", name: nombre } : undefined);
  const datos: Json = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: j.titulo,
    url: `${dominio}/juego/${encodeURIComponent(j.id)}`,
    image: j.imagen ?? undefined,
    description: j.descripcion ?? undefined,
    author: org(j.desarrolladora),
    publisher: org(j.editora),
    genre: j.generos.length ? j.generos : undefined,
    gamePlatform: j.plataformas.length ? j.plataformas : undefined,
    datePublished: j.fechaSalida ?? undefined,
  };
  if (j.nota && j.nota.votos >= 3) {
    datos.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(j.nota.media * 10) / 10,
      ratingCount: j.nota.votos,
      bestRating: 5,
      worstRating: 1,
    };
  }
  // Fuera los campos vacíos: un `undefined` en el JSON no aporta nada.
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined));
}

/**
 * JSON listo para meter en un <script type="application/ld+json">: `<` se
 * escapa para que un texto con "</script>" (un nombre de usuario, una
 * descripción) no pueda cerrar la etiqueta. Es lo que recomienda Next.
 */
export function serializarJsonLd(datos: Json): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
