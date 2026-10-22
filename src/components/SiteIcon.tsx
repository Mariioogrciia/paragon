import type { ComponentType } from "react";
import {
  SiAppstore,
  SiBattledotnet,
  SiBluesky,
  SiDiscord,
  SiEa,
  SiEpicgames,
  SiFacebook,
  SiFandom,
  SiGamejolt,
  SiGogdotcom,
  SiGoogleplay,
  SiHumblebundle,
  SiInstagram,
  SiItchdotio,
  SiPlaystation,
  SiReddit,
  SiSteam,
  SiTwitch,
  SiUbisoft,
  SiWikipedia,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { FaMicrosoft, FaXbox } from "react-icons/fa6";
import { BsNintendoSwitch } from "react-icons/bs";

type Logo = ComponentType<{ size?: number; title?: string; "aria-hidden"?: boolean }>;

/**
 * Logo de un sitio web externo: los de "Sitios web" en la ficha de juego y
 * las tiendas de la lista de precios.
 *
 * Antes cada enlace era un circulo con la INICIAL de su nombre, y eso se
 * rompia solo: en Garry's Mod salian dos circulos con "S" ("Sitio oficial" y
 * "Steam") y dos con "T" ("Twitch" y "Twitter / X"). Luego fueron SVG
 * dibujados a mano, y Xbox, PlayStation, Nintendo e itch.io salian con el
 * globo. Desde el 22 oct 2026 son los logos oficiales (Simple Icons; Xbox,
 * Microsoft y Nintendo, que Simple Icons ya no tiene, de react-icons).
 *
 * Las etiquetas las pone `lib/igdb/client.ts` a partir del tipo de sitio que
 * da IGDB (y las tiendas, ITAD/CheapShark), asi que aqui se reconocen por el
 * texto. Lo que no se reconozca (el sitio oficial, sobre todo) cae en un
 * globo, no en un hueco vacio.
 */
const LOGOS: [RegExp, Logo][] = [
  [/steam/, SiSteam],
  [/youtube/, SiYoutube],
  [/twitch/, SiTwitch],
  [/twitter|^x$|\bx\b/, SiX],
  [/reddit/, SiReddit],
  [/discord/, SiDiscord],
  [/wikipedia/, SiWikipedia],
  [/wikia|fandom/, SiFandom],
  [/itch\.io|^itch/, SiItchdotio],
  [/epic/, SiEpicgames],
  [/gog/, SiGogdotcom],
  [/playstation|psn/, SiPlaystation],
  [/xbox/, FaXbox],
  [/microsoft/, FaMicrosoft],
  [/nintendo/, BsNintendoSwitch],
  [/instagram/, SiInstagram],
  [/facebook/, SiFacebook],
  [/bluesky/, SiBluesky],
  [/google play|android/, SiGoogleplay],
  [/app store|\bios\b|iphone|ipad|apple/, SiAppstore],
  [/humble/, SiHumblebundle],
  [/ubisoft|uplay/, SiUbisoft],
  [/\bea\b|ea app|origin/, SiEa],
  [/battle\.?net|blizzard/, SiBattledotnet],
  [/game ?jolt/, SiGamejolt],
];

export function SiteIcon({ label, size = 15 }: { label: string; size?: number }) {
  const l = label.toLowerCase();
  const Logo = LOGOS.find(([patron]) => patron.test(l))?.[1];
  if (Logo) return <Logo size={size} title="" aria-hidden />;

  // Sitio oficial y cualquier otro: un globo.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" />
    </svg>
  );
}
