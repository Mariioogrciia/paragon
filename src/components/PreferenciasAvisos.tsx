"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { setAvisosActivosAction } from "@/app/actions";

function Guardar() {
  const { pending } = useFormStatus();
  const t = useTranslations("Onboarding");
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 self-start rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[var(--background)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50"
      style={{ background: "var(--accent-grad)" }}
    >
      {t("forms.common.save")}
    </button>
  );
}

/** Qué categorías de aviso llegan (lib/avisosPreferencias.ts). Marcada = activa. */
export function PreferenciasAvisos({ categorias, desactivadas }: { categorias: readonly { clave: string; label: string }[]; desactivadas: string[] }) {
  const t = useTranslations("Onboarding");
  return (
    <section className="rounded-[18px] border border-white/10 bg-surface-2/30 p-6">
      <h2 className="mb-1 font-semibold">{t("avisos.titulo")}</h2>
      <p className="mb-4 text-xs text-muted">{t("avisos.descripcion")}</p>
      <form action={setAvisosActivosAction} className="flex flex-col gap-1">
        {categorias.map((c) => (
          <label
            key={c.clave}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-surface-2"
          >
            <span className="text-sm font-semibold">{c.label}</span>
            <input type="checkbox" name="categoria" value={c.clave} defaultChecked={!desactivadas.includes(c.clave)} className="h-4 w-4 accent-[rgb(var(--accent-rgb))]" />
          </label>
        ))}
        <Guardar />
      </form>
    </section>
  );
}
