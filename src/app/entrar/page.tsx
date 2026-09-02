import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { TrophyIcon } from "@/components/TrophyIcon";

export const metadata = { title: "Entrar · Platinos" };

const STATS = [
  { value: "87", label: "Platino", color: "#9fd4ec" },
  { value: "341", label: "Oro", color: "#e2b53e" },
  { value: "812", label: "Plata", color: "#b9c2cc" },
  { value: "3072", label: "Bronce", color: "#c07b4a" },
];

/**
 * Login.
 *
 * Solo proveedores externos: así no guardamos contraseñas de nadie, ni el
 * "olvidé mi contraseña", ni el 2FA. Discord está porque es donde ya está la
 * gente que caza trofeos.
 */
export default async function EntrarPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div
      className="grid overflow-hidden rounded-[20px] lg:grid-cols-[1.05fr_0.95fr]"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="hidden flex-col p-11 lg:flex"
        style={{
          background:
            "radial-gradient(700px 400px at 20% 10%, rgba(74, 158, 255, 0.18), transparent 70%), linear-gradient(170deg, #101724, #0a0d13)",
        }}
      >
        <div className="mt-auto">
          <h2 className="font-heading text-5xl font-bold uppercase leading-none tracking-[-0.02em]">
            4.312 trofeos
            <br />
            sin contar.
          </h2>
          <p className="mt-5 max-w-[430px] text-base leading-relaxed text-muted">
            Cada partida mueve un número. Platinos los lee todos y te dice
            cuál está a un solo trofeo de caer.
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
            Entra en Platinos
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-muted">
            Elige con qué cuenta quieres entrar. Después vinculas tu perfil de
            PlayStation, que es de donde salen los trofeos.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/bienvenida" });
              }}
            >
              <button
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[#1a2235] hover:border-accent hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(74,158,255,0.2)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "#121721", border: "1px solid #263042" }}
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
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[#1a2235] hover:border-[#5865F2] hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(88,101,242,0.2)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "#121721", border: "1px solid #263042" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865F2]/10 transition-colors group-hover:bg-[#5865F2]/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#5865F2">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </div>
                Continuar con Discord
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("steam", { redirectTo: "/bienvenida" });
              }}
            >
              <button
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[#1a2235] hover:border-white hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(255,255,255,0.2)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "#121721", border: "1px solid #263042" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
                  </svg>
                </div>
                Continuar con Steam
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/bienvenida" });
              }}
            >
              <button
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[#1a2235] hover:border-white hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(255,255,255,0.2)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "#121721", border: "1px solid #263042" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                Continuar con Google
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("azure-ad", { redirectTo: "/bienvenida" });
              }}
            >
              <button
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[#1a2235] hover:border-[#00a4ef] hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(0,164,239,0.2)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "#121721", border: "1px solid #263042" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#f25022" d="M0 0h10v10H0z"/>
                    <path fill="#7fba00" d="M11 0h10v10H11z"/>
                    <path fill="#00a4ef" d="M0 11h10v10H0z"/>
                    <path fill="#ffb900" d="M11 11h10v10H11z"/>
                  </svg>
                </div>
                Continuar con Microsoft
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("epic-games", { redirectTo: "/bienvenida" });
              }}
            >
              <button
                className="group flex w-full items-center gap-3.5 rounded-xl px-[18px] py-4 text-left text-[15px] font-semibold transition-all duration-300 hover:bg-[#1a2235] hover:border-[#ffffff] hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(255,255,255,0.1)] active:translate-y-0 active:scale-[0.98]"
                style={{ background: "#121721", border: "1px solid #263042" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
                    <path d="M3.537 0C2.165 0 1.66.506 1.66 1.879V18.44a4.262 4.262 0 00.02.433c.031.3.037.59.316.92.027.033.311.245.311.245.153.075.258.13.43.2l8.335 3.491c.433.199.614.276.928.27h.002c.314.006.495-.071.928-.27l8.335-3.492c.172-.07.277-.124.43-.2 0 0 .284-.211.311-.243.28-.33.285-.621.316-.92a4.261 4.261 0 00.02-.434V1.879c0-1.373-.506-1.88-1.878-1.88zm13.366 3.11h.68c1.138 0 1.688.553 1.688 1.696v1.88h-1.374v-1.8c0-.369-.17-.54-.523-.54h-.235c-.367 0-.537.17-.537.539v5.81c0 .369.17.54.537.54h.262c.353 0 .523-.171.523-.54V8.619h1.373v2.143c0 1.144-.562 1.71-1.7 1.71h-.694c-1.138 0-1.7-.566-1.7-1.71V4.82c0-1.144.562-1.709 1.7-1.709zm-12.186.08h3.114v1.274H6.117v2.603h1.648v1.275H6.117v2.774h1.74v1.275h-3.14zm3.816 0h2.198c1.138 0 1.7.564 1.7 1.708v2.445c0 1.144-.562 1.71-1.7 1.71h-.799v3.338h-1.4zm4.53 0h1.4v9.201h-1.4zm-3.13 1.235v3.392h.575c.354 0 .523-.171.523-.54V4.965c0-.368-.17-.54-.523-.54zm-3.74 10.147a1.708 1.708 0 01.591.108 1.745 1.745 0 01.49.299l-.452.546a1.247 1.247 0 00-.308-.195.91.91 0 00-.363-.068.658.658 0 00-.28.06.703.703 0 00-.224.163.783.783 0 00-.151.243.799.799 0 00-.056.299v.008a.852.852 0 00.056.31.7.7 0 00.157.245.736.736 0 00.238.16.774.774 0 00.303.058.79.79 0 00.445-.116v-.339h-.548v-.565H7.37v1.255a2.019 2.019 0 01-.524.307 1.789 1.789 0 01-.683.123 1.642 1.642 0 01-.602-.107 1.46 1.46 0 01-.478-.3 1.371 1.371 0 01-.318-.455 1.438 1.438 0 01-.115-.58v-.008a1.426 1.426 0 01.113-.57 1.449 1.449 0 01.312-.46 1.418 1.418 0 01.474-.309 1.58 1.58 0 01.598-.111 1.708 1.708 0 01.045 0zm11.963.008a2.006 2.006 0 01.612.094 1.61 1.61 0 01.507.277l-.386.546a1.562 1.562 0 00-.39-.205 1.178 1.178 0 00-.388-.07.347.347 0 00-.208.052.154.154 0 00-.07.127v.008a.158.158 0 00.022.084.198.198 0 00.076.066.831.831 0 00.147.06c.062.02.14.04.236.061a3.389 3.389 0 01.43.122 1.292 1.292 0 01.328.17.678.678 0 01.207.24.739.739 0 01.071.337v.008a.865.865 0 01-.081.382.82.82 0 01-.229.285 1.032 1.032 0 01-.353.18 1.606 1.606 0 01-.46.061 2.16 2.16 0 01-.71-.116 1.718 1.718 0 01-.593-.346l.43-.514c.277.223.578.335.9.335a.457.457 0 00.236-.05.157.157 0 00.082-.142v-.008a.15.15 0 00-.02-.077.204.204 0 00-.073-.066.753.753 0 00-.143-.062 2.45 2.45 0 00-.233-.062 5.036 5.036 0 01-.413-.113 1.26 1.26 0 01-.331-.16.72.72 0 01-.222-.243.73.73 0 01-.082-.36v-.008a.863.863 0 01.074-.359.794.794 0 01.214-.283 1.007 1.007 0 01.34-.185 1.423 1.423 0 01.448-.066 2.006 2.006 0 01.025 0zm-9.358.025h.742l1.183 2.81h-.825l-.203-.499H8.623l-.198.498h-.81zm2.197.02h.814l.663 1.08.663-1.08h.814v2.79h-.766v-1.602l-.711 1.091h-.016l-.707-1.083v1.593h-.754zm3.469 0h2.235v.658h-1.473v.422h1.334v.61h-1.334v.442h1.493v.658h-2.255zm-5.3.897l-.315.793h.624zm-1.145 5.19h8.014l-4.09 1.348z"/>
                  </svg>
                </div>
                Continuar con Epic Games
              </button>
            </form>
          </div>

          <p
            className="mt-7 rounded-[14px] px-[18px] py-4 text-[13px] leading-relaxed"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "#8794a8" }}
          >
            No guardamos contraseñas: el acceso lo lleva tu proveedor. Los
            trofeos se leen del perfil{" "}
            <strong style={{ color: "#cfe4ff" }}>público</strong> de PSN, así
            que tu perfil de trofeos tiene que estar visible.
          </p>
        </div>
      </div>
    </div>
  );
}
