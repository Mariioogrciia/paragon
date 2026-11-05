"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

/**
 * "Tu firma" en Ajustes: vista previa de /api/firma/<handle> y los códigos
 * listos para pegar en foros (BBCode), Reddit/Discord (Markdown) o una web
 * (HTML).
 */
export function FirmaCompartible({ handle, origen }: { handle: string; origen: string }) {
  const t = useTranslations("Onboarding.firma");
  const imagen = `${origen}/api/firma/${handle}.png`;
  const perfil = `${origen}/u/${handle}`;
  const formatos = [
    { id: "url", etiqueta: t("enlace"), valor: imagen },
    { id: "bbcode", etiqueta: "BBCode", valor: `[url=${perfil}][img]${imagen}[/img][/url]` },
    { id: "markdown", etiqueta: "Markdown", valor: `[![Paragon](${imagen})](${perfil})` },
    { id: "html", etiqueta: "HTML", valor: `<a href="${perfil}"><img src="${imagen}" alt="Paragon" width="600" height="150"></a>` },
    // Overlay para directos (ver /api/overlay/[handle]): en OBS, "Fuente de
    // navegador" con esta URL, 480×190 (el hueco de arriba es para la
    // alerta de trofeo).
    { id: "obs", etiqueta: "OBS", valor: `${origen}/api/overlay/${handle}` },
  ];
  // Para streamers y webs ajenas (5 nov 2026): comando de chat sin bot
  // propio (/api/texto), insignia SVG ligera (/api/insignia) y RSS.
  const insignia = `${origen}/api/insignia/${handle}.svg`;
  const texto = `${origen}/api/texto/${handle}`;
  const extras = [
    { id: "insignia", etiqueta: t("insignia"), valor: `[![Paragon](${insignia})](${perfil})` },
    { id: "nightbot", etiqueta: "Nightbot", valor: `!commands add !paragon $(urlfetch ${texto})` },
    { id: "streamelements", etiqueta: "StreamElements", valor: `!cmd add paragon \${customapi.${texto}}` },
    { id: "rss", etiqueta: "RSS", valor: `${origen}/api/rss/u/${handle}` },
  ];
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiar(id: string, valor: string) {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      // Sin permiso de portapapeles: el campo se puede seleccionar a mano.
    }
  }

  return (
    <section className="ajustes-grupo">
      <h2 className="mb-1 font-semibold">{t("titulo")}</h2>
      <p className="mb-4 text-sm text-muted">{t("descripcion")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada por nuestra propia ruta, con su propia caché */}
      <img src={`/api/firma/${handle}.png`} alt={t("titulo")} width={600} height={150} className="h-auto w-full max-w-[600px] rounded-[14px]" />
      <p className="mt-3 text-xs text-muted">{t("obs")}</p>
      <div className="mt-4 grid gap-2">
        {formatos.map((f) => fila(f))}
      </div>

      <h3 className="mt-8 mb-1 font-semibold">{t("streamersTitulo")}</h3>
      <p className="mb-3 text-sm text-muted">{t("streamersDescripcion")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG de nuestra propia ruta */}
      <img src={`/api/insignia/${handle}.svg`} alt={t("insignia")} height={20} className="mb-3 h-5 w-auto" />
      <div className="grid gap-2">
        {extras.map((f) => fila(f))}
      </div>
      <p className="mt-3 text-xs text-muted">{t("streamersAyuda")}</p>
    </section>
  );

  function fila(f: { id: string; etiqueta: string; valor: string }) {
    return (
      <div key={f.id} className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-xs font-semibold text-muted">{f.etiqueta}</span>
        <input
          readOnly
          value={f.valor}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={f.etiqueta}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => copiar(f.id, f.valor)}
          aria-label={`${t("copiar")} ${f.etiqueta}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:border-accent hover:text-[var(--accent-text)]"
        >
          {copiado === f.id ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    );
  }
}
