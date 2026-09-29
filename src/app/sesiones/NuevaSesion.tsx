"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { crearSesionAction } from "@/app/actions";

/** Formulario para organizar una sesión — ver lib/sesiones.ts. */
export function NuevaSesion({ juegos }: { juegos: { id: string; titulo: string; platform: string }[] }) {
  const t = useTranslations("Shell.Sesiones");
  const [gameId, setGameId] = useState(juegos[0]?.id ?? "");
  const [trofeo, setTrofeo] = useState("");
  const [cuando, setCuando] = useState("");
  const [plazas, setPlazas] = useState(3);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  if (juegos.length === 0) return <p className="text-sm text-muted">{t("sinJuegos")}</p>;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // `datetime-local` da la hora local del navegador sin zona: se pasa a
    // ISO aquí, donde se conoce la zona de quien la escribe.
    const fecha = new Date(cuando);
    if (Number.isNaN(fecha.getTime())) return;
    startTransition(async () => {
      const r = await crearSesionAction({ gameId, trofeo, descripcion, fechaHora: fecha.toISOString(), plazas });
      if (r.error) setError(r.error);
      else {
        setTrofeo("");
        setDescripcion("");
        setCuando("");
      }
    });
  }

  const campo = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none";
  const etiqueta = "mb-1 block text-xs font-semibold text-muted";

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={etiqueta}>{t("juego")}</span>
        <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={campo}>
          {juegos.map((j) => (
            <option key={j.id} value={j.id}>
              {j.titulo} ({j.platform.toUpperCase()})
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className={etiqueta}>{t("trofeo")}</span>
        <input value={trofeo} onChange={(e) => setTrofeo(e.target.value)} maxLength={120} required placeholder={t("trofeoPlaceholder")} className={campo} />
      </label>
      <label>
        <span className={etiqueta}>{t("cuando")}</span>
        <input type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} required className={campo} />
      </label>
      <label>
        <span className={etiqueta}>{t("plazas")}</span>
        <input type="number" min={1} max={16} value={plazas} onChange={(e) => setPlazas(Number(e.target.value))} required className={campo} />
      </label>
      <label className="sm:col-span-2">
        <span className={etiqueta}>{t("descripcion")}</span>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} rows={2} placeholder={t("descripcionPlaceholder")} className={campo} />
      </label>
      {error && <p className="text-sm font-semibold text-danger sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg px-5 py-2.5 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)] disabled:opacity-50"
          style={{ background: "var(--accent-grad)" }}
        >
          {t("crear")}
        </button>
      </div>
    </form>
  );
}
