import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { BackButton } from "@/components/BackButton";
import { AjustesNav } from "@/components/AjustesNav";

export const metadata = { title: "Ajustes · Paragon" };

export default async function AjustesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const t = await getTranslations("Onboarding");

  return (
    <div className="mt-6">
      <BackButton fallbackHref="/" />
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <aside className="w-full shrink-0 self-start md:sticky md:top-24 md:w-60">
          <p className="font-heading mb-4 hidden text-2xl font-bold uppercase tracking-tight md:block">{t("ajustesNav.titulo")}</p>
          <AjustesNav />
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
