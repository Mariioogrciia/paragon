import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HandleForm } from "@/components/forms/Forms";
import { AsistenteVincular } from "@/components/AsistenteVincular";
import { getProfileByUserId } from "@/lib/profiles";
import { getTranslations } from "next-intl/server";
import { CompletarSteamSiHaceFalta } from "@/components/CompletarSteamSiHaceFalta";

export const metadata = { title: "Bienvenida · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

/**
 * Alta en dos pasos. Se enseñan los dos a la vez, pero el segundo solo se
 * activa cuando hay handle: sin él no existes para los demás.
 */
export default async function BienvenidaPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);

  // Si ya está todo, no hay nada que hacer aquí. Basta con una plataforma:
  // las demás se pueden añadir después desde ajustes.
  if (profile?.handle && profile.accounts.length > 0) {
    redirect(`/u/${profile.handle}`);
  }

  const t = await getTranslations("Onboarding");

  return (
    <div className="mx-auto max-w-[560px]">
      <h1 className="font-heading text-[2.625rem] font-bold uppercase leading-none">
        {t("bienvenida.title")}
      </h1>
      <p className="mt-2.5 text-[0.9375rem] text-muted">{t("bienvenida.subtitle")}</p>

      <div className="mt-5">
        <CompletarSteamSiHaceFalta userId={session.user.id} />
      </div>

      <section className="mt-7 rounded-[18px] p-6" style={CARD}>
        <div className="flex items-center gap-3">
          <span
            className="font-heading flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-sm font-bold"
            style={{ background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
          >
            1
          </span>
          <h2 className="font-heading text-[1.0625rem] font-bold tracking-[0.03em]">{t("bienvenida.step1.title")}</h2>
        </div>

        <p className="mb-4 mt-3 text-sm text-muted">
          {t("bienvenida.step1.description")}
        </p>

        <HandleForm current={profile?.handle} hasImage={!!session.user.image} />
      </section>

      <section
        className={`mt-3.5 rounded-[18px] p-6 ${profile?.handle ? "" : "pointer-events-none opacity-40"}`}
        style={CARD}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-heading flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-sm font-bold"
            style={{ background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
          >
            2
          </span>
          <h2 className="font-heading text-[1.0625rem] font-bold tracking-[0.03em]">
            {t("bienvenida.step2.title")}
          </h2>
        </div>

        <p className="mb-5 mt-3 text-sm text-muted">
          {t("bienvenida.step2.description")}
        </p>

        {/* Asistente (16 oct 2026): antes eran los tres formularios uno
            debajo de otro, sin decir dónde está cada ID ni comprobar nada. */}
        <AsistenteVincular vinculadas={profile?.accounts.map((a) => a.platform) ?? []} handle={profile?.handle ?? null} />
      </section>
    </div>
  );
}
