"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { crearSesionAction, trofeosSesionAction } from "@/app/actions";

interface Juego {
  id: string;
  titulo: string;
  platform: string;
  /** "PS5", "PS4", "PC"...: distingue el mismo juego en varias consolas. */
  deviceLabel: string;
  progreso: number;
}

type Trofeo = Awaited<ReturnType<typeof trofeosSesionAction>>[number];

const PLATAFORMAS: Record<string, string> = { psn: "PlayStation", xbox: "Xbox", steam: "Steam", epic: "Epic Games", ubisoft: "Ubisoft", google: "Google Play" };
const METAL: Record<string, string> = { platinum: "🏆", gold: "🥇", silver: "🥈", bronze: "🥉" };
/** Valor del selector para "lo escribo yo" (juegos sin lista o trofeos que no salen). */
const OTRO = "__otro__";

/** Formulario para organizar una sesión — ver lib/sesiones.ts. */
export function NuevaSesion({ juegos }: { juegos: Juego[] }) {
  const t = useTranslations("Shell.Sesiones");
  const router = useRouter();
  const [gameId, setGameId] = useState(juegos[0]?.id ?? "");
  // Lista de trofeos y de qué juego es: mientras no coincida con `gameId`, está cargando.
  const [cargados, setCargados] = useState<{ gameId: string; lista: Trofeo[] } | null>(null);
  const trofeos = cargados?.gameId === gameId ? cargados.lista : null;
  const [trophyId, setTrophyId] = useState("");
  const [trofeoLibre, setTrofeoLibre] = useState("");
  const [cuando, setCuando] = useState("");
  const [plazas, setPlazas] = useState(4);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  // Agrupados por plataforma, y dentro por título y consola: así "GTA V"
  // de PS3, PS4 y PS5 salen como tres opciones distinguibles.
  const grupos = useMemo(() => {
    const porPlataforma = new Map<string, Juego[]>();
    for (const j of juegos) porPlataforma.set(j.platform, [...(porPlataforma.get(j.platform) ?? []), j]);
    return [...porPlataforma.entries()]
      .map(([platform, lista]) => ({
        platform,
        lista: lista.sort((a, b) => a.titulo.localeCompare(b.titulo) || a.deviceLabel.localeCompare(b.deviceLabel)),
      }))
      .sort((a, b) => (PLATAFORMAS[a.platform] ?? "~").localeCompare(PLATAFORMAS[b.platform] ?? "~"));
  }, [juegos]);

  useEffect(() => {
    if (!gameId) return;
    let vigente = true;
    trofeosSesionAction(gameId)
      .catch((): Trofeo[] => [])
      .then((lista) => {
        if (!vigente) return;
        setCargados({ gameId, lista });
        // Sin lista no hay nada que elegir: directo a escribirlo.
        if (lista.length === 0) setTrophyId(OTRO);
      });
    return () => {
      vigente = false;
    };
  }, [gameId]);

  if (juegos.length === 0) return <p className="text-sm text-muted">{t("sinJuegos")}</p>;

  const gruposTrofeo = (trofeos ?? []).reduce<{ grupo: string | null; lista: Trofeo[] }[]>((acc, tr) => {
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.grupo === tr.grupo) ultimo.lista.push(tr);
    else acc.push({ grupo: tr.grupo, lista: [tr] });
    return acc;
  }, []);
  const escribeAMano = trophyId === OTRO;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // `datetime-local` da la hora local del navegador sin zona: se pasa a
    // ISO aquí, donde se conoce la zona de quien la escribe.
    const fecha = new Date(cuando);
    if (Number.isNaN(fecha.getTime())) return;
    if (!trophyId) {
      setError(t("eligeTrofeo"));
      return;
    }
    startTransition(async () => {
      const r = await crearSesionAction({
        gameId,
        trophyId: escribeAMano ? null : trophyId,
        trofeo: escribeAMano ? trofeoLibre : "",
        descripcion,
        fechaHora: fecha.toISOString(),
        plazasTotales: plazas,
      });
      if (r.error) setError(r.error);
      else if (r.id) router.push(`/sesiones/${r.id}`);
    });
  }

  const campo = "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none";
  const etiqueta = "mb-1 block text-xs font-semibold text-muted";
  const libres = Math.max(0, plazas - 1);

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={etiqueta}>{t("juego")}</span>
        <select
          value={gameId}
          onChange={(e) => {
            setGameId(e.target.value);
            setTrophyId("");
          }}
          className={campo}
        >
          {grupos.map((g) => (
            <optgroup key={g.platform} label={PLATAFORMAS[g.platform] ?? t("otrasPlataformas")}>
              {g.lista.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.titulo} · {j.deviceLabel} · {j.progreso}%
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className={etiqueta}>{t("trofeo")}</span>
        <select
          value={trophyId}
          onChange={(e) => setTrophyId(e.target.value)}
          disabled={trofeos === null}
          required
          className={campo}
        >
          <option value="" disabled>
            {trofeos === null ? t("cargandoTrofeos") : t("eligeTrofeo")}
          </option>
          {gruposTrofeo.map((g) => {
            const opciones = g.lista.map((tr) => (
              <option key={tr.trophyId} value={tr.trophyId}>
                {tr.grade ? `${METAL[tr.grade] ?? ""} ` : ""}
                {tr.name}
              </option>
            ));
            return g.grupo ? (
              <optgroup key={g.grupo} label={g.grupo}>
                {opciones}
              </optgroup>
            ) : (
              opciones
            );
          })}
          <option value={OTRO}>{t("trofeoOtro")}</option>
        </select>
        {trofeos !== null && trofeos.length === 0 && <span className="mt-1 block text-xs text-muted">{t("sinListaTrofeos")}</span>}
      </label>
      {escribeAMano && (
        <label className="sm:col-span-2">
          <span className={etiqueta}>{t("trofeoEscrito")}</span>
          <input value={trofeoLibre} onChange={(e) => setTrofeoLibre(e.target.value)} maxLength={120} required placeholder={t("trofeoPlaceholder")} className={campo} />
        </label>
      )}
      <label>
        <span className={etiqueta}>{t("cuando")}</span>
        <input type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} required className={campo} />
      </label>
      <label>
        <span className={etiqueta}>{t("plazas")}</span>
        <input type="number" min={2} max={16} value={plazas} onChange={(e) => setPlazas(Number(e.target.value))} required className={campo} />
        <span className="mt-1 block text-xs text-muted">{t("plazasAyuda", { libres })}</span>
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
