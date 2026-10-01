"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { borrarVitrinaAction, crearVitrinaAction } from "@/app/actions";

type Tipo = "manual" | "desarrolladora" | "raros";

/** Editor de vitrinas en Ajustes — ver lib/vitrinas.ts. */
export function EditorVitrinas({
  vitrinas,
  estudios,
  juegos,
  maximo,
}: {
  vitrinas: { id: string; titulo: string; tipo: Tipo }[];
  estudios: string[];
  juegos: { id: string; titulo: string }[];
  maximo: number;
}) {
  const t = useTranslations("Perfil.Vitrinas");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<Tipo>("manual");
  const [estudio, setEstudio] = useState(estudios[0] ?? "");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (q ? juegos.filter((j) => j.titulo.toLowerCase().includes(q)) : juegos).slice(0, 40);
  }, [juegos, busqueda]);

  function alternar(id: string) {
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 6 ? prev : [...prev, id]));
  }

  function crear() {
    setError(null);
    startTransition(async () => {
      const r = await crearVitrinaAction({ titulo, tipo, filtro: estudio, gameIds: elegidos });
      if (r.error) setError(r.error);
      else {
        setTitulo("");
        setElegidos([]);
      }
    });
  }

  const campo = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none";

  return (
    <section className="ajustes-grupo">
      <h2 className="mb-1 font-semibold">{t("titulo")}</h2>
      <p className="mb-4 text-sm text-muted">{t("descripcion")}</p>

      {vitrinas.length > 0 && (
        <ul className="mb-5 grid gap-2">
          {vitrinas.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="truncate">
                <strong>{v.titulo}</strong> <span className="text-muted">· {t(`tipos.${v.tipo}`)}</span>
              </span>
              <button
                type="button"
                disabled={pendiente}
                onClick={() => startTransition(() => borrarVitrinaAction(v.id))}
                aria-label={t("borrar")}
                className="shrink-0 text-muted transition-colors hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {vitrinas.length >= maximo ? (
        <p className="text-xs text-muted">{t("maximo", { n: maximo })}</p>
      ) : (
        <div className="grid gap-3">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={60} placeholder={t("tituloPlaceholder")} className={campo} />
          <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className={campo} aria-label={t("tipo")}>
            <option value="manual">{t("tipos.manual")}</option>
            <option value="desarrolladora" disabled={estudios.length === 0}>
              {t("tipos.desarrolladora")}
            </option>
            <option value="raros">{t("tipos.raros")}</option>
          </select>

          {tipo === "desarrolladora" && (
            <select value={estudio} onChange={(e) => setEstudio(e.target.value)} className={campo} aria-label={t("estudio")}>
              {estudios.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          )}

          {tipo === "manual" && (
            <div>
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={t("buscar")} className={campo} />
              <p className="mt-1 text-xs text-muted">{t("elegidos", { n: elegidos.length })}</p>
              <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
                {filtrados.map((j) => (
                  <label key={j.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface">
                    <input type="checkbox" checked={elegidos.includes(j.id)} onChange={() => alternar(j.id)} />
                    <span className="truncate">{j.titulo}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm font-semibold text-danger">{error}</p>}
          <button
            type="button"
            disabled={pendiente || titulo.trim().length < 2}
            onClick={crear}
            className="w-fit rounded-lg px-5 py-2.5 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)] disabled:opacity-50"
            style={{ background: "var(--accent-grad)" }}
          >
            {t("crear")}
          </button>
        </div>
      )}
    </section>
  );
}
