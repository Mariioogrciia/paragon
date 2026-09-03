import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { listCollections } from "@/lib/collections";
import { NewCollectionForm } from "@/components/forms/Forms";
import { Planificador } from "@/components/Planificador";

export const metadata = { title: "Planificador · Paragon" };

export default async function PlanificadorPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.handle) redirect("/bienvenida");

  const [{ games }, collections] = await Promise.all([
    getLibrary(profile),
    listCollections(profile.userId),
  ]);
  const plan = collections.find((collection) => /plan|objetiv|platino/i.test(collection.name));
  const objetivos = plan ? games.filter((game) => plan.gameIds.includes(game.id) && !game.isWishlist) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[42px] font-bold uppercase leading-none">Planificador</h1>
        <p className="mt-2 max-w-[650px] text-sm text-muted">Crea una carpeta llamada «Plan de platinos» u «Objetivos» y añade juegos desde cada ficha para construir tu ruta.</p>
      </div>
      <NewCollectionForm />
      <Planificador games={objetivos} handle={profile.handle} />
    </div>
  );
}
