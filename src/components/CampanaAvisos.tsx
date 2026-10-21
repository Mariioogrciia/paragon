"use client";

/* eslint-disable @next/next/no-img-element -- carátulas de CDNs externos (PSN, Steam, Xbox...), como en el resto de la web: next/image gastaría la cuota de optimización del plan Hobby */
import Link from "@/components/Enlace";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, X } from "lucide-react";
import { relativeDate } from "@/lib/design";

/**
 * Campana de avisos de la cabecera (16 oct 2026, ver lib/bandeja.ts). Pide
 * la bandeja al cargar y cada poco mientras la pestaña está a la vista; lo
 * que llega nuevo con la página abierta sale además como aviso flotante
 * arriba a la derecha (solicitudes de amistad, adelantos en la liga,
 * trofeos, platinos de amigos...). Al abrir la lista, todo pasa a leído.
 *
 * Sondeo y no tiempo real: en Vercel no hay conexiones abiertas baratas, y
 * una consulta pequeña cada 45 s solo con la pestaña visible es de sobra
 * para avisos que no son un chat.
 */

interface Aviso {
  id: string;
  titulo: string;
  texto: string;
  ruta: string | null;
  imagen: string | null;
  leido: boolean;
  createdAt: string;
}

// Cada 2 minutos (antes 45 s, 21 oct 2026): cada vuelta es una llamada a Vercel por pestaña abierta. Al volver a la pestaña se mira al momento.
const CADA_MS = 120_000;
const TOAST_MS = 7_000;
const MAX_TOASTS = 3;

export function CampanaAvisos() {
  const t = useTranslations("Shell.Header");
  const locale = useLocale();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [noLeidos, setNoLeidos] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [toasts, setToasts] = useState<Aviso[]>([]);
  const conocidos = useRef<Set<string> | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/avisos", { cache: "no-store" });
      if (!res.ok) return;
      const datos = (await res.json()) as { avisos: Aviso[]; noLeidos: number };
      setAvisos(datos.avisos);
      setNoLeidos(datos.noLeidos);
      // La primera carga solo apunta lo que ya había: los flotantes son
      // para lo que llega con la página abierta, no para lo de ayer.
      if (conocidos.current === null) {
        conocidos.current = new Set(datos.avisos.map((a) => a.id));
        return;
      }
      const nuevos = datos.avisos.filter((a) => !a.leido && !conocidos.current!.has(a.id));
      for (const a of datos.avisos) conocidos.current.add(a.id);
      if (nuevos.length > 0) setToasts((previos) => [...nuevos, ...previos].slice(0, MAX_TOASTS));
    } catch {
      // Sin red: ya se intentará en la siguiente vuelta.
    }
  }, []);

  useEffect(() => {
    // La primera carga va en un temporizador (y no directa en el efecto)
    // para no encadenar renders al montar; luego, cada CADA_MS.
    const primera = setTimeout(cargar, 0);
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, CADA_MS);
    // Volver a la pestaña solo pregunta si hace rato de la última vez: cada
    // cambio de pestaña era una función de Vercel (21 oct 2026).
    let ultimo = Date.now();
    const alVolver = () => {
      if (document.visibilityState !== "visible" || Date.now() - ultimo < 30_000) return;
      ultimo = Date.now();
      void cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(primera);
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  // Cada flotante se va solo a los pocos segundos.
  useEffect(() => {
    if (toasts.length === 0) return;
    const fuera = setTimeout(() => setToasts((previos) => previos.slice(0, -1)), TOAST_MS);
    return () => clearTimeout(fuera);
  }, [toasts]);

  // Cerrar la lista al pulsar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  function alternar() {
    const abrir = !abierto;
    setAbierto(abrir);
    if (abrir && noLeidos > 0) {
      setNoLeidos(0);
      setToasts([]);
      void fetch("/api/avisos", { method: "POST" }).catch(() => {});
    }
  }

  return (
    <>
      <div className="relative" ref={panel}>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={abierto}
          aria-label={noLeidos > 0 ? `${t("avisos.abrir")} · ${t("avisos.sinLeer", { n: noLeidos })}` : t("avisos.abrir")}
          title={t("avisos.titulo")}
          className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:text-foreground"
          style={
            abierto
              ? { border: "1px solid rgb(var(--accent-rgb) / 0.4)", color: "var(--accent-text)", background: "rgb(var(--accent-rgb) / 0.12)" }
              : { border: "1px solid var(--border)", color: "var(--muted)" }
          }
        >
          <Bell size={16} aria-hidden="true" />
          {noLeidos > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[0.625rem] font-bold text-white"
              style={{ background: "var(--danger)" }}
              aria-hidden="true"
            >
              {noLeidos > 9 ? "9+" : noLeidos}
            </span>
          )}
        </button>

        {abierto && (
          <div
            className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[380px]"
            style={{ border: "1px solid var(--border)", background: "var(--background)" }}
          >
            <p className="px-3 pb-2 pt-1.5 font-heading text-sm font-bold">{t("avisos.titulo")}</p>
            {avisos.length === 0 ? (
              <p className="px-3 pb-3 text-[0.8125rem] text-muted">{t("avisos.vacio")}</p>
            ) : (
              <ul className="flex flex-col">
                {avisos.map((a) => (
                  <li key={a.id}>
                    <FilaAviso aviso={a} locale={locale} onClick={() => setAbierto(false)} />
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/ajustes/avisos"
              onClick={() => setAbierto(false)}
              className="mt-1 block rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-[var(--surface-2)] hover:text-foreground"
            >
              {t("avisos.ajustes")} →
            </Link>
          </div>
        )}
      </div>

      {toasts.length > 0 && (
        <div className="fixed right-3 top-20 z-[60] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2" aria-live="polite">
          {toasts.map((a) => (
            <div
              key={a.id}
              className="relative rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
              style={{ border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "linear-gradient(160deg, var(--surface), var(--background))" }}
            >
              <FilaAviso aviso={a} locale={locale} onClick={() => setToasts((p) => p.filter((x) => x.id !== a.id))} />
              <button
                type="button"
                onClick={() => setToasts((p) => p.filter((x) => x.id !== a.id))}
                aria-label={t("avisos.cerrar")}
                className="absolute right-2 top-2 rounded-md p-1 text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FilaAviso({ aviso, locale, onClick }: { aviso: Aviso; locale: string; onClick: () => void }) {
  const contenido = (
    <div className="flex gap-3 rounded-xl px-3 py-2.5 pr-8 transition-colors hover:bg-[var(--surface-2)]">
      {aviso.imagen ? (
        <img src={aviso.imagen} alt="" loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-muted">
          <Bell size={16} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-bold leading-snug">{aviso.titulo}</p>
        <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted">{aviso.texto}</p>
        <p className="mt-1 text-[0.6875rem] text-muted">{relativeDate(aviso.createdAt, locale) ?? ""}</p>
      </div>
      {!aviso.leido && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
    </div>
  );
  // Solo rutas de la propia web: un aviso nunca lleva fuera.
  return aviso.ruta?.startsWith("/") && !aviso.ruta.startsWith("//") ? (
    <Link href={aviso.ruta} onClick={onClick} className="block">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}
