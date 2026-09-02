import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signOutAction } from "@/app/actions";

export default async function AjustesSeguridadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) redirect("/entrar");

  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, session.user.id),
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold mb-2">Inicio de sesión y seguridad</h1>
        <p className="text-sm text-muted">Revisa las cuentas con las que inicias sesión y cierra tu sesión activa.</p>
      </div>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">Cuentas vinculadas (Inicio de sesión)</h2>
        <div className="flex flex-col gap-4">
          {userAccounts.map((acc) => (
            <div key={acc.provider} className="flex items-center justify-between p-4 rounded-xl bg-[#121721] border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold uppercase">
                  {acc.provider[0]}
                </div>
                <div>
                  <p className="font-medium capitalize">{acc.provider}</p>
                  <p className="text-xs text-muted">{dbUser.email}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-good uppercase tracking-wider bg-good/10 px-3 py-1 rounded-full border border-good/20">
                Vinculado
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] p-6 border border-danger/30 bg-danger/5">
        <h2 className="font-semibold mb-4 text-danger">Cerrar sesión</h2>
        <p className="text-sm text-muted mb-6">Cierra la sesión actual en este navegador. Tendrás que volver a autenticarte la próxima vez que entres.</p>
        
        <form action={signOutAction}>
          <button type="submit" className="rounded-xl border border-danger/50 text-danger hover:bg-danger hover:text-white px-6 py-2.5 font-semibold transition-all">
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
