import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { TrophyIcon } from "@/components/TrophyIcon";

export const metadata = { title: "Entrar · Paragon" };

const STATS = [
  { value: "87", label: "Platino", color: "#9fd4ec" },
  { value: "341", label: "Oro", color: "#e2b53e" },
  { value: "812", label: "Plata", color: "#b9c2cc" },
  { value: "3072", label: "Bronce", color: "#c07b4a" },
];

/**
 * Qué decirle a alguien cuando el login falla.
 *
 * Auth.js vuelve aquí con `?error=` y, si no se pinta, el usuario solo ve que
 * "no pasa nada" al pulsar el botón — que es exactamente lo que pasaba con
 * OAuthAccountNotLinked.
 */
const ERRORES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Ya existe una cuenta con ese correo, creada con otro proveedor. Entra con el que usaste la primera vez.",
  AccessDenied: "El proveedor ha denegado el acceso. Si es Google, comprueba que tu correo está en la lista de usuarios de prueba.",
  Configuration: "El servidor no tiene bien configurado ese proveedor. Revisa las variables de entorno.",
  Verification: "El enlace de acceso ha caducado o ya se había usado.",
};

/**
 * Login.
 *
 * Solo proveedores externos: así no guardamos contraseñas de nadie, ni el
 * "olvidé mi contraseña", ni el 2FA. Discord está porque es donde ya está la
 * gente que caza trofeos.
 *
 * Los botones son exactamente los proveedores configurados en auth.ts. Un
 * botón de más (Steam, Microsoft, Epic...) no es "casi funciona": revienta al
 * pulsarlo, porque `signIn()` no encuentra ese proveedor.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const mensajeError = error
    ? (ERRORES[error] ?? "No se ha podido completar el acceso. Inténtalo otra vez.")
    : null;

  return (
    <div
      className="grid overflow-hidden rounded-[20px] lg:grid-cols-[1.05fr_0.95fr]"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="hidden flex-col p-11 lg:flex"
        style={{
          background:
            "radial-gradient(700px 400px at 20% 10%, rgb(var(--accent-rgb) / 0.18), transparent 70%), linear-gradient(170deg, #101724, #0a0d13)",
        }}
      >
        <div className="mt-auto">
          <h2 className="font-heading text-5xl font-bold uppercase leading-none tracking-[-0.02em]">
            4.312 trofeos
            <br />
            sin contar.
          </h2>
          <p className="mt-5 max-w-[430px] text-base leading-relaxed text-muted">
            Cada partida mueve un número. Paragon los lee todos y te dice
            cuál está a un solo trofeo o logro de caer.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-4 gap-2.5">
          {STATS.map((s, i) => {
            const grades = ["platinum", "gold", "silver", "bronze"] as const;
            return (
              <div
                key={s.label}
                className="rounded-[14px] p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.08)]"
                style={{ border: "1px solid var(--border)", background: "rgba(16, 22, 32, 0.8)" }}
              >
                <TrophyIcon grade={grades[i]} size={20} />
                <p className="font-heading mt-2.5 text-xl font-bold leading-none" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col justify-center bg-surface p-8 sm:p-11">
        <div className="max-w-[420px]">
          <h1 className="font-heading text-[38px] font-bold uppercase leading-[1.05] tracking-[-0.01em]">
            Entra en Paragon
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-muted">
            Elige con qué cuenta quieres entrar. Después vinculas tus perfiles de
            PlayStation o Steam, que es de donde salen los trofeos y logros.
          </p>

          {mensajeError && (
            <p
              className="mt-6 rounded-[14px] px-[18px] py-4 text-[13px] leading-relaxed"
              style={{
                border: "1px solid rgba(248, 113, 113, 0.35)",
                background: "rgba(248, 113, 113, 0.08)",
                color: "#fca5a5",
              }}
            >
              {mensajeError}
            </p>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/bienvenida" });
              }}
            >
              <button
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[var(--surface-2)] hover:border-accent hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgb(var(--accent-rgb) / 0.2)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                    <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
                    <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
                    <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                </div>
                Continuar con Google
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("discord", { redirectTo: "/bienvenida" });
              }}
            >
              <button
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[var(--surface-2)] hover:border-[#5865F2] hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(88,101,242,0.2)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865F2]/10 transition-colors group-hover:bg-[#5865F2]/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#5865F2">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </div>
                Continuar con Discord
              </button>
            </form>

          </div>

          <p
            className="mt-7 rounded-[14px] px-[18px] py-4 text-[13px] leading-relaxed"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--muted)" }}
          >
            No guardamos contraseñas: el acceso lo lleva tu proveedor. Los
            trofeos se leen del perfil{" "}
            <strong style={{ color: "var(--accent-text)" }}>público</strong> de PSN, así
            que tu perfil de trofeos tiene que estar visible.
          </p>
        </div>
      </div>
    </div>
  );
}
