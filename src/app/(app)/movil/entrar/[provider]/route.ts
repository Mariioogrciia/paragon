import { signIn } from "@/auth";
import { claveDeEnlaceValida } from "@/lib/enlaceMovil";

/**
 * Entrada directa al login de Google/Discord para la app nativa, sin pasar
 * por `/entrar` (la página web) de por medio — la Custom Tab que abre
 * ComposeMainActivity aterriza aquí y sale directa a la pantalla real de
 * Google/Discord, igual que `entrar/page.tsx` hace con sus botones pero sin
 * enseñar ningún HTML de Paragon antes. `signIn()` redirige por su cuenta
 * (no hace falta un `return` después): mismo patrón que ya usan
 * `entrar/page.tsx` y `ajustes/seguridad/page.tsx`.
 *
 * `?k=` es la clave de un solo uso con la que `/movil/enlazar` cifra el
 * token para la app (ver lib/enlaceMovil.ts); viaja hasta allí dentro de
 * `redirectTo`. Sin ella (app antigua) se sigue adelante y enlazar pide
 * actualizar la app.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (provider !== "google" && provider !== "discord") {
    return new Response("Proveedor no válido", { status: 400 });
  }

  const k = new URL(req.url).searchParams.get("k");
  const destino = claveDeEnlaceValida(k) ? `/movil/enlazar?k=${k}` : "/movil/enlazar";
  await signIn(provider, { redirectTo: destino });
}
