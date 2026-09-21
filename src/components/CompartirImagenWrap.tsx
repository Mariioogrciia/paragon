"use client";

import { useTranslations } from "next-intl";
import { CompartirImagen } from "@/components/CompartirImagen";

/**
 * Botón "Compartir imagen" del Wrap — envoltorio fino sobre el componente
 * genérico (CompartirImagen.tsx, que también usa la tarjeta de platino).
 */
export function CompartirImagenWrap({ handle }: { handle: string }) {
  const t = useTranslations("Perfil");
  return (
    <CompartirImagen
      url={`/api/wrap/${handle}`}
      nombreArchivo={`paragon-wrap-${handle}.png`}
      tituloCompartir={t("CompartirImagenWrap.tituloCompartir")}
    />
  );
}
