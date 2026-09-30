import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/BackButton";
import { EstadisticasCompletas } from "@/components/EstadisticasCompletas";
import { ProfileTabsNav } from "@/components/ProfileTabsNav";
import { auth } from "@/auth";
import { getProfileByHandle } from "@/lib/profiles";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const t = await getTranslations("Perfil");
  return { title: t("EstadisticasPage.meta", { handle }) };
}

export default async function EstadisticasPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const t = await getTranslations("Perfil");
  const [session, profile] = await Promise.all([auth(), getProfileByHandle(handle)]);
  const esMio = Boolean(session?.user?.id && session.user.id === profile?.userId);

  return (
    <div>
      <BackButton fallbackHref={`/u/${handle}`} />
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">
        <Link href={`/u/${handle}`} className="hover:underline">@{handle}</Link> / {t("EstadisticasPage.breadcrumb")}
      </p>
      <h1 className="mb-6 font-heading text-3xl font-bold uppercase tracking-wide">{t("EstadisticasPage.titulo")}</h1>

      <ProfileTabsNav handle={handle} esMio={esMio} />

      <EstadisticasCompletas handle={handle} />
    </div>
  );
}
