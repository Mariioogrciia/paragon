import { useTranslations } from "next-intl";
import { TITULO_POR_CLAVE } from "@/lib/titulos";

/** Título especial (lib/titulos.ts) con su color: perfil, Comunidad y ajustes. */
export function TituloEspecial({ clave, pequeno = false }: { clave: string | null | undefined; pequeno?: boolean }) {
  const t = useTranslations("Perfil");
  const titulo = clave ? TITULO_POR_CLAVE.get(clave) : undefined;
  if (!titulo) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wide ${
        pequeno ? "px-1.5 py-px text-[0.5625rem]" : "px-2.5 py-0.5 text-[0.6875rem]"
      }`}
      style={{
        color: titulo.color,
        borderColor: `color-mix(in srgb, ${titulo.color} 45%, transparent)`,
        background: `color-mix(in srgb, ${titulo.color} 12%, transparent)`,
      }}
    >
      {t(`Titulos.${titulo.clave}`)}
    </span>
  );
}
