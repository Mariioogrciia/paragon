import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { listCollections } from "@/lib/collections";
import { Planificador } from "@/components/Planificador";
import { CarpetasManager } from "@/components/CarpetasManager";
import { FiltroEstadoAnimo } from "@/components/FiltroEstadoAnimo";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Planificador · Paragon" };

export default async function PlanificadorPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.handle) redirect("/bienvenida");

  const t = await getTranslations("Analitica.planificadorPage");

  const [{ games }, collections] = await Promise.all([
    getLibrary(profile),
    listCollections(profile.userId),
  ]);

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/" />
      <div>
        <h1 className="font-heading text-[2.625rem] font-bold uppercase leading-none">{t("title")}</h1>
        <p className="mt-2 max-w-[650px] text-sm text-muted">{t("subtitle")}</p>
      </div>
      <FiltroEstadoAnimo games={games} handle={profile.handle} />
      <Planificador collections={collections} library={games} handle={profile.handle} />
      <CarpetasManager collections={collections} library={games} />
    </div>
  );
}
