/**
 * Parte "pura" de los banners de plataforma: claves, tipos y el (de)codificado
 * del valor especial que se guarda en `profileBannerUrl` (`"preset:<clave>"`).
 * Deliberadamente SIN "use client" — a diferencia de `BannerPresets.tsx` (que
 * sí lo lleva, porque `BannerPresetPicker` tiene `onClick`), estas funciones
 * las llama tanto código de servidor (`u/[handle]/page.tsx`, un Server
 * Component) como de cliente (`ProfileForm.tsx`). Un módulo "use client" solo
 * puede cruzar al servidor como componente (JSX) — llamar a una de sus
 * funciones sueltas desde un Server Component revienta en tiempo de
 * ejecución, no en compilación, así que esta separación importa de verdad.
 */

export const BANNER_PRESETS = [
  { key: "ps5", label: "PS5" },
  { key: "xbox", label: "Xbox" },
  { key: "steam", label: "Steam" },
  { key: "switch", label: "Switch" },
  { key: "retro", label: "Retro" },
  { key: "paragon", label: "Paragon" },
] as const;

export type BannerPresetKey = (typeof BANNER_PRESETS)[number]["key"];

const PRESET_PREFIX = "preset:";

export function bannerPresetKey(bannerUrl?: string | null): BannerPresetKey | null {
  if (!bannerUrl || !bannerUrl.startsWith(PRESET_PREFIX)) return null;
  const key = bannerUrl.slice(PRESET_PREFIX.length);
  return BANNER_PRESETS.some((p) => p.key === key) ? (key as BannerPresetKey) : null;
}

export function bannerPresetValue(key: BannerPresetKey): string {
  return `${PRESET_PREFIX}${key}`;
}
