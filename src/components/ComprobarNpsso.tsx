"use client";

import { useState, useTransition } from "react";
import { comprobarNpssoAction, guardarNpssoAction } from "@/app/actions";

type Resultado = Awaited<ReturnType<typeof comprobarNpssoAction>>;
type Clave = NonNullable<Resultado>["resultado"];

/**
 * El NPSSO en Admin → Sistema.
 * - "Comprobar ahora" (21 oct 2026): dice al momento si Sony acepta el que
 *   hay, sin esperar a la siguiente pasada del cron.
 * - Pegar uno nuevo (15 nov 2026): se prueba con Sony y, si vale, se guarda
 *   cifrado en la base y PSN vuelve a sincronizar sin redesplegar nada.
 * Los textos llegan del servidor (namespace Admin).
 */
export function ComprobarNpsso({
  textos,
}: {
  textos: { boton: string; comprobando: string; pegar: string; guardar: string; guardando: string; guardadoOk: string; ayuda: string } & Record<Clave, string>;
}) {
  const [resultado, setResultado] = useState<Resultado>(null);
  const [guardado, setGuardado] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [pendiente, empezar] = useTransition();
  const [accion, setAccion] = useState<"comprobar" | "guardar">("comprobar");

  const comprobar = () => {
    setAccion("comprobar");
    setGuardado(false);
    empezar(async () => setResultado(await comprobarNpssoAction()));
  };
  const guardar = () => {
    if (!nuevo.trim()) return;
    setAccion("guardar");
    empezar(async () => {
      const r = await guardarNpssoAction(nuevo);
      setResultado(r);
      setGuardado(r?.resultado === "ok");
      if (r?.resultado === "ok") setNuevo("");
    });
  };

  return (
    <div className="mt-1.5 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={comprobar}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold transition-colors hover:border-accent disabled:opacity-50"
        >
          {pendiente && accion === "comprobar" ? textos.comprobando : textos.boton}
        </button>
        {resultado && !pendiente && (
          <span className={`text-xs ${resultado.resultado === "ok" ? "text-green-400" : "text-red-400"}`}>
            {guardado ? textos.guardadoOk : textos[resultado.resultado]}
          </span>
        )}
      </div>
      {/* Lo que dijo Sony y la forma del NPSSO (22 oct 2026): para saber si es
          la sesión, un pegado raro o un bloqueo, sin adivinar. */}
      {resultado?.detalle && !pendiente && <p className="font-mono text-[0.6875rem] text-muted [overflow-wrap:anywhere]">{resultado.detalle}</p>}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={textos.pegar}
          aria-label={textos.pegar}
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1 font-mono text-xs sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={pendiente || !nuevo.trim()}
          className="rounded-lg px-2.5 py-1 text-xs font-bold transition-opacity disabled:opacity-50"
          style={{ background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)", border: "1px solid rgb(var(--accent-rgb) / 0.4)" }}
        >
          {pendiente && accion === "guardar" ? textos.guardando : textos.guardar}
        </button>
      </form>
      <p className="text-[0.6875rem] text-muted">
        {textos.ayuda}{" "}
        <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" className="font-mono underline">
          ca.account.sony.com/api/v1/ssocookie
        </a>
      </p>
    </div>
  );
}
