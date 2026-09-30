import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { getParagonLevel } from "@/lib/paragonLevel";

export default async function AjustesAparienciaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  const nivel = await getParagonLevel(session.user.id);
  return <AppearanceSettings nivel={nivel.level} />;
}
