import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Ajustes · Paragon" };

export default async function AjustesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  return (
    <div className="mt-6">
    <BackButton fallbackHref="/" />
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0">
        <nav className="flex flex-col gap-1">
          <Link
            href="/ajustes"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground transition-colors"
          >
            General
          </Link>
          <Link
            href="/ajustes/apariencia"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground transition-colors"
          >
            Apariencia
          </Link>
          <Link
            href="/ajustes/seguridad"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground transition-colors"
          >
            Inicio de sesión y seguridad
          </Link>
          <Link
            href="/ajustes/plataformas"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground transition-colors"
          >
            Cuentas de Juegos
          </Link>
        </nav>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
    </div>
  );
}
