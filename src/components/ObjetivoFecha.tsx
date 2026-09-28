"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, X } from "lucide-react";
import { setObjetivoFechaAction } from "@/app/actions";
import { planObjetivo } from "@/lib/objetivos";

/**
 * "Platinar antes del..." de un juego del Planificador: la fecha y, si hay
 * una, cuántos trofeos al día hacen falta frente a tu ritmo real de los
 * últimos 90 días. Ver lib/objetivos.ts.
 */
export function ObjetivoFecha({
  gameId,
  fecha: fechaInicial,
  faltan,
  ritmo,
  claro = false,
}: {
  gameId: string;
  fecha: string | null;
  faltan: number;
  ritmo: number | null;
  /** Sobre fondo oscuro (la tarjeta destacada), texto claro. */
  claro?: boolean;
}) {
  const t = useTranslations("Analitica.planificador.objetivo");
  const locale = useLocale();
  const [fecha, setFecha] = useState(fechaInicial);
  const [editando, setEditando] = useState(false);
  const [pendiente, startTransition] = useTransition();

  function guardar(nueva: string | null) {
    setFecha(nueva);
    setEditando(false);
    startTransition(() => setObjetivoFechaAction(gameId, nueva));
  }

  const hoyIso = new Date().toISOString().slice(0, 10);
  const texto = claro ? "text-white/80" : "text-muted";

  if (editando) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          min={hoyIso}
          defaultValue={fecha ?? ""}
          autoFocus
          aria-label={t("fijar")}
          onChange={(e) => e.target.value && guardar(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground"
        />
        <button type="button" onClick={() => setEditando(false)} className={`text-xs ${texto} hover:text-foreground`}>
          {t("cancelar")}
        </button>
      </div>
    );
  }

  if (!fecha) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className={`flex items-center gap-1 text-xs font-semibold ${texto} transition-colors hover:text-[var(--accent-text)]`}
      >
        <CalendarClock size={13} /> {t("fijar")}
      </button>
    );
  }

  const plan = planObjetivo(faltan, fecha, new Date(), ritmo);
  const fechaLegible = new Date(`${fecha}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const color = plan.alcanzable === true ? "var(--good, #4ec98a)" : plan.alcanzable === false ? "#f5a623" : undefined;
  const porDia = plan.porDia.toLocaleString(locale, { maximumFractionDigits: 1 });

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${texto}`} aria-busy={pendiente}>
      <button type="button" onClick={() => setEditando(true)} className="flex items-center gap-1 font-semibold transition-colors hover:text-[var(--accent-text)]">
        <CalendarClock size={13} /> {t("antesDe", { fecha: fechaLegible })}
      </button>
      {/* Depende de la fecha de hoy: el servidor (UTC) y el navegador pueden
          estar en días distintos cerca de medianoche. */}
      <span style={color ? { color } : undefined} suppressHydrationWarning>
        {faltan === 0
          ? t("conseguido")
          : plan.vencido
            ? t("vencido")
            : t("ritmoNecesario", { porDia, dias: plan.dias })}
        {!plan.vencido && faltan > 0 && ritmo !== null && ritmo > 0 && (
          <> · {t("tuRitmo", { ritmo: ritmo.toLocaleString(locale, { maximumFractionDigits: 1 }) })}</>
        )}
      </span>
      <button type="button" onClick={() => guardar(null)} aria-label={t("quitar")} className="transition-colors hover:text-danger">
        <X size={12} />
      </button>
    </div>
  );
}
