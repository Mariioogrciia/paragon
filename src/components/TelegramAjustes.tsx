import { getTranslations } from "next-intl/server";
import { Send } from "lucide-react";
import { desvincularTelegramAction } from "@/app/actions/correo";

/** Ajustes → Avisos → Telegram (lib/telegram.ts): conectar con un enlace al bot o desconectar. */
export async function TelegramAjustes({ vinculado, enlace }: { vinculado: boolean; enlace: string | null }) {
  const t = await getTranslations("Onboarding.telegram");
  return (
    <section className="ajustes-grupo">
      <h2 className="mb-1 font-semibold">{t("titulo")}</h2>
      <p className="mb-4 text-sm text-muted">{t("descripcion")}</p>
      {vinculado ? (
        <form action={desvincularTelegramAction} className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">✅ {t("conectado")}</span>
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-danger hover:text-danger">
            {t("desconectar")}
          </button>
        </form>
      ) : enlace ? (
        <>
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#229ED9" }}
          >
            <Send size={16} /> {t("conectar")}
          </a>
          <p className="mt-2 text-xs text-muted">{t("ayuda")}</p>
        </>
      ) : null}
    </section>
  );
}
