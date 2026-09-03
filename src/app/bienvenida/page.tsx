import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HandleForm, LinkPsnForm, LinkSteamForm } from "@/components/forms/Forms";
import { accountFor, getProfileByUserId } from "@/lib/profiles";

export const metadata = { title: "Bienvenida · Platinos" };

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

  return (
    <div className="mx-auto max-w-[560px]">
      <h1 className="font-heading text-[42px] font-bold uppercase leading-none">
        Vamos a dejarte listo
      </h1>
      <p className="mt-2.5 text-[15px] text-muted">Dos pasos y ya está.</p>

      <section className="mt-7 rounded-[18px] p-6" style={CARD}>
        <div className="flex items-center gap-3">
          <span
            className="font-heading flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-sm font-bold"
            style={{ background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
          >
            1
          </span>
          <h2 className="font-heading text-[17px] font-bold tracking-[0.03em]">Elige tu nombre de usuario</h2>
        </div>

        <p className="mb-4 mt-3 text-sm text-muted">
          Es tu identificador dentro de Platinos, y por donde tus amigos te
          añadirán. Minúsculas, números y guion bajo.
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
          <h2 className="font-heading text-[17px] font-bold tracking-[0.03em]">
            Vincula donde juegas
          </h2>
        </div>

        <p className="mb-5 mt-3 text-sm text-muted">
          Con una basta para empezar; la otra la puedes añadir cuando quieras
          desde ajustes. No hace falta contraseña ni token en ninguna de las
          dos: de leer los logros se encarga el servidor.
        </p>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              PlayStation · tu ID público
            </label>
            <LinkPsnForm current={accountFor(profile, "psn")?.username} />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              Steam · usuario, SteamID64 o URL del perfil
            </label>
            <LinkSteamForm current={accountFor(profile, "steam")?.username} />
            <p className="mt-2 text-xs text-muted">
              En Steam, «Mi perfil» y «Detalles del juego» tienen que estar en
              público para que se puedan leer los logros.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
