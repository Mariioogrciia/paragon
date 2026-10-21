"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Selector } from "@/components/ui/Selector";

/** "Comparar con": elige un amigo y la página enseña su mes al lado del tuyo (?con=<handle>). */
export function CompararCon({ mes, con, amigos }: { mes: string; con: string | null; amigos: { handle: string; nombre: string }[] }) {
  const t = useTranslations("Analitica.ritmoPage");
  const router = useRouter();
  return (
    <Selector
      value={con ?? ""}
      ariaLabel={t("compararCon")}
      className="min-w-[14rem]"
      buscable={amigos.length > 8}
      onChange={(h) => router.push(`/ritmo?mes=${mes}${h ? `&con=${encodeURIComponent(h)}` : ""}`)}
      options={[
        { value: "", label: t("sinComparar") },
        ...amigos.map((a) => ({ value: a.handle, label: a.nombre, detalle: `@${a.handle}` })),
      ]}
    />
  );
}
