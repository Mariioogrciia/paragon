"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Send, Sparkles } from "lucide-react";
import Link from "@/components/Enlace";
import { preguntarAction } from "@/app/actions/asistente";

interface Turno {
  rol: "user" | "assistant";
  texto: string;
}

/** Enlaces internos (/u/…) del texto del asistente, como enlaces de verdad; el resto, texto tal cual. */
function ConEnlaces({ texto }: { texto: string }) {
  const partes = texto.split(/(\/u\/[^\s)]+)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("/u/") ? (
          <Link key={i} href={p} className="font-semibold text-[var(--accent-text)] underline-offset-2 hover:underline">
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** El chat de «Pregúntale a Paragon» (lib/asistente.ts). La conversación vive solo en esta pestaña. */
export function ChatParagon({ ejemplos }: { ejemplos: string[] }) {
  const t = useTranslations("Biblioteca.asistente");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [pensando, empezar] = useTransition();
  const fin = useRef<HTMLDivElement>(null);

  function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || pensando) return;
    const historial = turnos;
    setTurnos([...historial, { rol: "user", texto: limpia }]);
    setTexto("");
    setAviso("");
    empezar(async () => {
      const r = await preguntarAction(limpia, historial);
      if (r.ok) setTurnos((ts) => [...ts, { rol: "assistant", texto: r.texto }]);
      else setAviso(t(`error.${r.motivo}`));
      requestAnimationFrame(() => fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {turnos.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {ejemplos.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => enviar(e)}
              className="rounded-full border border-border bg-surface px-3.5 py-2 text-left text-[0.8125rem] transition-colors hover:border-accent hover:text-[var(--accent-text)]"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3" aria-live="polite">
        {turnos.map((turno, i) => (
          <div
            key={i}
            className={`max-w-[88%] whitespace-pre-wrap rounded-[16px] px-4 py-3 text-sm leading-relaxed ${turno.rol === "user" ? "self-end" : "self-start"}`}
            style={turno.rol === "user" ? { background: "var(--accent-soft)", border: "1px solid var(--accent-line)" } : { background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {turno.rol === "assistant" ? <ConEnlaces texto={turno.texto} /> : turno.texto}
          </div>
        ))}
        {pensando && (
          <div className="flex items-center gap-2 self-start text-sm text-muted">
            <Sparkles size={14} className="animate-pulse" /> {t("pensando")}
          </div>
        )}
        <div ref={fin} />
      </div>

      {aviso && <p className="text-sm text-danger">{aviso}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={pensando || !texto.trim()}
          aria-label={t("enviar")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-background transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: "var(--accent-grad)" }}
        >
          <Send size={16} />
        </button>
      </form>
      <p className="text-xs text-muted">{t("aviso")}</p>
    </div>
  );
}
