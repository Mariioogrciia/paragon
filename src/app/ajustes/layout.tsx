import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BackButton } from "@/components/BackButton";
import { AjustesNav } from "@/components/AjustesNav";

export const metadata = { title: "Ajustes · Paragon" };

export default async function AjustesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  return (
    <div className="mt-6">
    <BackButton fallbackHref="/" />
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0 md:sticky md:top-24 self-start">
        <AjustesNav />
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
    </div>
  );
}
