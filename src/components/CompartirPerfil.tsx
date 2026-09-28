"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2, Check } from "lucide-react";

/**
 * "Compartir" en la cabecera del perfil: menú nativo del sistema donde lo
 * hay (móvil) y, si no, copiar el enlace. Antes solo se podía compartir la
 * imagen del Wrap — el perfil en sí no tenía forma directa de mandarse.
 */
export function CompartirPerfil({ handle, nombre }: { handle: string; nombre: string }) {
  const t = useTranslations("Perfil.PerfilPage");
  const [copiado, setCopiado] = useState(false);
  // Último recurso si el navegador no deja escribir en el portapapeles: se
  // enseña el enlace para copiarlo a mano, en vez de no hacer nada.
  const [enlaceVisible, setEnlaceVisible] = useState<string | null>(null);

  async function compartir() {
    const url = `${window.location.origin}/u/${handle}`;
    const texto = t("compartirTexto", { nombre });
    if (navigator.share) {
      try {
        await navigator.share({ title: `${nombre} · Paragon`, text: texto, url });
      } catch {
        // Cancelado desde el menú del sistema: no es un error.
      }
      return;
    }
    if (await copiar(url)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } else {
      setEnlaceVisible(url);
    }
  }

  if (enlaceVisible) {
    return (
      <input
        readOnly
        value={enlaceVisible}
        onFocus={(e) => e.currentTarget.select()}
        autoFocus
        aria-label={t("compartir")}
        className="w-[240px] rounded-[10px] border border-accent bg-surface px-3 py-2.5 text-[0.8125rem]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={compartir}
      className="flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold transition-all hover:-translate-y-0.5 hover:border-accent hover:text-[var(--accent-text)]"
      style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
    >
      {copiado ? <Check size={15} /> : <Share2 size={15} />}
      <span aria-live="polite">{copiado ? t("enlaceCopiado") : t("compartir")}</span>
    </button>
  );
}

/** Portapapeles moderno y, si lo bloquea el navegador, el método antiguo. */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}
