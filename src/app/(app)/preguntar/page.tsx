import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { BackButton } from "@/components/BackButton";
import { ChatParagon } from "@/components/ChatParagon";
import { asistenteActivo } from "@/lib/asistente";

export const metadata = { title: "Pregúntale a Paragon · Paragon" };

/** «Pregúntale a Paragon»: preguntas sobre tu biblioteca con IA (lib/asistente.ts). */
export default async function PreguntarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  const t = await getTranslations("Biblioteca.asistente");

  return (
    <div className="mx-auto max-w-[760px] px-5 py-10">
      <BackButton fallbackHref="/" />
      <h1 className="font-heading mt-4 text-[clamp(1.75rem,5vw,2.5rem)] font-bold uppercase leading-tight">{t("titulo")}</h1>
      <p className="mb-6 mt-2 text-sm text-muted">{t("descripcion")}</p>
      {asistenteActivo() ? (
        <ChatParagon ejemplos={[t("ejemplo1"), t("ejemplo2"), t("ejemplo3"), t("ejemplo4")]} />
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">{t("inactivo")}</p>
      )}
    </div>
  );
}
