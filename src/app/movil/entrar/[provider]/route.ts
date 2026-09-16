import { signIn } from "@/auth";

/**
 * Entrada directa al login de Google/Discord para la app nativa, sin pasar
 * por `/entrar` (la página web) de por medio — la Custom Tab que abre
 * ComposeMainActivity aterriza aquí y sale directa a la pantalla real de
 * Google/Discord, igual que `entrar/page.tsx` hace con sus botones pero sin
 * enseñar ningún HTML de Paragon antes. `signIn()` redirige por su cuenta
 * (no hace falta un `return` después): mismo patrón que ya usan
 * `entrar/page.tsx` y `ajustes/seguridad/page.tsx`.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (provider !== "google" && provider !== "discord") {
    return new Response("Proveedor no válido", { status: 400 });
  }

  await signIn(provider, { redirectTo: "/movil/enlazar" });
}
