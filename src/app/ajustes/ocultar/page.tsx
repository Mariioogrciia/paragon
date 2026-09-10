import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NAV_OCULTABLE, getHiddenNavItems } from "@/lib/navPreferences";
import { HiddenNavForm } from "@/components/forms/Forms";

export const metadata = { title: "Ocultar · Ajustes · Paragon" };

export default async function AjustesOcultarPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const ocultas = await getHiddenNavItems(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold mb-2">Ocultar</h1>
        <p className="text-sm text-muted">
          Nada de comunidad — esto es solo tuyo. Quita del menú las funciones
          que no te interesen; siguen ahí para todo el mundo, tú solo dejas de
          verlas.
        </p>
      </div>

      <HiddenNavForm opciones={NAV_OCULTABLE} ocultas={ocultas} />
    </div>
  );
}
