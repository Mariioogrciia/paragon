/**
 * Logo de un sitio web externo (los de "Sitios web" en la ficha de juego).
 *
 * Antes cada enlace era un circulo con la INICIAL de su nombre, y eso se
 * rompia solo: en Garry's Mod salian dos circulos con "S" ("Sitio oficial" y
 * "Steam") y dos con "T" ("Twitch" y "Twitter / X"). Con el logo se sabe a
 * donde va cada uno sin pasar el raton por encima.
 *
 * Las etiquetas las pone `lib/igdb/client.ts` a partir del tipo de sitio que
 * da IGDB, asi que aqui se reconocen por ese texto exacto. Lo que no se
 * reconozca cae en un icono de globo, no en un hueco vacio.
 */
export function SiteIcon({ label, size = 15 }: { label: string; size?: number }) {
  const l = label.toLowerCase();
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" } as const;

  if (l.includes("steam"))
    return (
      <svg {...p} aria-hidden>
        <path d="M11.98 2a10 10 0 0 0-9.96 9.02l5.35 2.21a2.83 2.83 0 0 1 1.6-.49h.14l2.38-3.45v-.05a3.77 3.77 0 1 1 3.77 3.77h-.09l-3.4 2.42v.12a2.84 2.84 0 0 1-5.6.6L2.35 14.6A10 10 0 1 0 11.98 2zm-3.7 13.17.71.3a2.15 2.15 0 1 0 1.22-2.83l.74.31a1.58 1.58 0 1 1-1.22 2.91l-1.45-.7zm9.5-6.9a2.51 2.51 0 1 0-2.5 2.52 2.51 2.51 0 0 0 2.5-2.52zm-4.39 0a1.89 1.89 0 1 1 1.89 1.89 1.88 1.88 0 0 1-1.89-1.89z" />
      </svg>
    );
  if (l.includes("youtube"))
    return (
      <svg {...p} aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z" />
      </svg>
    );
  if (l.includes("twitch"))
    return (
      <svg {...p} aria-hidden>
        <path d="M4.3 0 1.4 2.9v18.2h6.1V24l2.9-2.9h4.8l5.4-5.4V0zm15.4 14.7-3.4 3.4h-4.8L8.6 21v-2.9H4.8V1.9h14.9zM15.9 5.8h1.9v5.5h-1.9zm-5.1 0h1.9v5.5h-1.9z" />
      </svg>
    );
  if (l.includes("twitter") || l.includes(" x") || l === "x")
    return (
      <svg {...p} aria-hidden>
        <path d="M18.9 1.2h3.4l-7.5 8.5L23.6 22h-6.9l-5.4-7-6.2 7H1.7l8-9.1L.7 1.2h7.1l4.9 6.4zm-1.2 18.7h1.9L6.4 3.2H4.4z" />
      </svg>
    );
  if (l.includes("reddit"))
    return (
      <svg {...p} aria-hidden>
        <path d="M24 11.8a2.6 2.6 0 0 0-4.4-1.8 12.8 12.8 0 0 0-6.9-2.2l1.2-5.5 3.9.8a1.8 1.8 0 1 0 .2-1.1l-4.4-.9a.6.6 0 0 0-.7.4l-1.3 6.3a12.8 12.8 0 0 0-7 2.2 2.6 2.6 0 1 0-2.9 4.2 5 5 0 0 0 0 .8c0 4 4.6 7.2 10.3 7.2s10.3-3.2 10.3-7.2a5 5 0 0 0 0-.8 2.6 2.6 0 0 0 1.7-2.4zM6 13.6a1.8 1.8 0 1 1 1.8 1.9A1.8 1.8 0 0 1 6 13.6zm10.4 5a6.8 6.8 0 0 1-4.4 1.3 6.8 6.8 0 0 1-4.4-1.3.6.6 0 0 1 .8-.9 5.7 5.7 0 0 0 3.6 1 5.7 5.7 0 0 0 3.6-1 .6.6 0 1 1 .8.9zm-.2-3.1a1.8 1.8 0 1 1 1.8-1.9 1.8 1.8 0 0 1-1.8 1.9z" />
      </svg>
    );
  if (l.includes("discord"))
    return (
      <svg {...p} aria-hidden>
        <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.3.5a18.3 18.3 0 0 1 4.4 1.4 15.6 15.6 0 0 0-13-.6c-.3.1-.6.3-.9.4A18.3 18.3 0 0 1 9 3.5L8.7 3a19.8 19.8 0 0 0-5 1.4C.7 8.9-.2 13.3.3 17.6A19.9 19.9 0 0 0 6.3 20.6l.8-1.1a13 13 0 0 1-2-1c.2-.1.3-.2.5-.3a14.2 14.2 0 0 0 12.1 0l.5.3a13 13 0 0 1-2 1l.8 1.1a19.9 19.9 0 0 0 6-3c.6-5-.8-9.4-2.7-13.2zM8.1 15c-1.2 0-2.2-1.1-2.2-2.4S6.9 10.2 8.1 10.2s2.2 1.1 2.2 2.4S9.3 15 8.1 15zm7.8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4S17.1 15 15.9 15z" />
      </svg>
    );
  if (l.includes("wikipedia") || l.includes("wikia") || l.includes("fandom"))
    return (
      <svg {...p} aria-hidden>
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 1.5a8.5 8.5 0 0 1 8.5 8.5H12zM6.9 6.4h2l1.7 5.2 1.8-5.2h1.4l1.8 5.2 1.7-5.2h1.9l-2.8 8h-1.5l-1.8-5-1.8 5H9.7z" />
      </svg>
    );
  if (l.includes("instagram"))
    return (
      <svg {...p} aria-hidden>
        <path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.9c-.1 3.2-1.6 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-3.3-.2-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.9s0-3.5.1-4.8C2.3 4 3.8 2.4 7.1 2.3c1.3-.1 1.7-.1 4.9-.1zm0 5.6A4.2 4.2 0 1 0 16.2 12 4.2 4.2 0 0 0 12 7.8zm0 6.9A2.7 2.7 0 1 1 14.7 12 2.7 2.7 0 0 1 12 14.7zm5.4-8.2a1 1 0 1 0 1 1 1 1 0 0 0-1-1z" />
      </svg>
    );
  if (l.includes("facebook"))
    return (
      <svg {...p} aria-hidden>
        <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6a18 18 0 0 1 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z" />
      </svg>
    );
  if (l.includes("epic"))
    return (
      <svg {...p} aria-hidden>
        <path d="M3.5 0h17A1.5 1.5 0 0 1 22 1.5v15.9c0 .6-.2.9-.9 1.2l-8.4 5.2a1.5 1.5 0 0 1-1.4 0l-8.4-5.2c-.7-.3-.9-.6-.9-1.2V1.5A1.5 1.5 0 0 1 3.5 0zm5.2 5.2v2h-2v9.6h2v-2h2.1v2h2V7.2h-2v-2zm7.4 0v11.6h2V5.2z" />
      </svg>
    );
  if (l.includes("gog"))
    return (
      <svg {...p} aria-hidden>
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-2.4 5.6h2.8v1.6H10.6v3.2h1.8v-1h-.9v-1.5h2.5v4.1H9.6a1.3 1.3 0 0 1-1.3-1.3V8.9a1.3 1.3 0 0 1 1.3-1.3zm5.7 0h3.1a1.3 1.3 0 0 1 1.3 1.3v3.8a1.3 1.3 0 0 1-1.3 1.3h-3.1z" />
      </svg>
    );
  if (l.includes("android") || l.includes("google play"))
    return (
      <svg {...p} aria-hidden>
        <path d="M3.6 1.8a1.5 1.5 0 0 0-.5 1.1v18.2a1.5 1.5 0 0 0 .5 1.1l.1.1 10.2-10.2v-.2zm12 6.6L5.4 2.5l8.6 8.6zm0 7.2-1.6-1.6-8.6 8.6zm1.3-.7 2.7-1.5c.8-.5.8-1.3 0-1.8l-2.7-1.5-2.2 2.4z" />
      </svg>
    );
  if (l.includes("ios") || l.includes("app store") || l.includes("apple"))
    return (
      <svg {...p} aria-hidden>
        <path d="M17.1 12.7a4.4 4.4 0 0 1 2.1-3.7 4.5 4.5 0 0 0-3.6-1.9c-1.5-.2-3 .9-3.8.9s-2-.9-3.2-.9a4.8 4.8 0 0 0-4 2.5c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4s1.6-.7 3.1-.7 1.9.7 3.2.7 2.2-1.2 3-2.4a10.4 10.4 0 0 0 1.3-2.8 4.3 4.3 0 0 1-2.3-3.9zM14.7 5.2A4.3 4.3 0 0 0 15.7 2a4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1 3.6 3.6 0 0 0 2.9-1.4z" />
      </svg>
    );

  // Sitio oficial y cualquier otro: un globo.
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" />
    </svg>
  );
}
