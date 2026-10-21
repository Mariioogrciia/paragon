import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AsistenteVincular } from "@/components/AsistenteVincular";
import { BackButton } from "@/components/BackButton";
import { getProfileByUserId } from "@/lib/profiles";

export async function generateMetadata() {
  const t = await getTranslations("Onboarding");
  return { title: `${t("asistente.titulo")} · Paragon` };
}

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

/**
 * Asistente para vincular una cuenta (16 oct 2026), a pantalla propia: se
 * llega desde Ajustes → Plataformas ("¿No sabes qué poner?"). En la
 * bienvenida va el mismo componente dentro del paso 2.
 */
export default async function VincularPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [profile, t] = await Promise.all([getProfileByUserId(session.user.id), getTranslations("Onboarding")]);
  if (!profile?.handle) redirect("/bienvenida");

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8">
      <BackButton fallbackHref="/ajustes/plataformas" />
      <h1 className="font-heading mt-4 text-[2rem] font-bold leading-tight">{t("asistente.titulo")}</h1>
      <p className="mt-2 text-[0.9375rem] text-muted">{t("asistente.subtitulo")}</p>
      <div className="mt-6 rounded-[18px] p-5 sm:p-6" style={CARD}>
        <AsistenteVincular vinculadas={profile.accounts.map((a) => a.platform)} handle={profile.handle} />
      </div>
    </div>
  );
}
