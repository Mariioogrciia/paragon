import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { mintMobileSession } from "@/lib/mobileAuth";

/**
 * Auth.js usa sesión en base de datos (no JWT): la cookie que pone al
 * entrar con Google/Discord es literalmente el `sessionToken` que ya vive
 * en la tabla `session` — el nombre cambia entre local (http) y producción
 * (https, con el prefijo `__Secure-`).
 */
const COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

/**
 * Puente entre el login (Google/Discord, sin contraseña) y la app nativa de
 * Android. La cookie que llega aquí es "prestada" (la puso el login por
 * Custom Tab/Chrome) — `mintMobileSession` la cambia por un token propio
 * del móvil y BORRA la prestada, para que cerrar sesión en el Chrome de ese
 * teléfono y cerrar sesión en la app sean cosas independientes (ver
 * lib/mobileAuth.ts). Ese token propio es el que se manda a la app por un
 * esquema propio — la Custom Tab se cierra sola al activarse el
 * intent-filter de `paragon://auth` en Android, sin que la persona tenga
 * que copiar nada a mano.
 *
 * La app ya NO abre esto directamente para entrar (eso sería enseñar la
 * página web `/entrar` de por medio) — abre `/movil/entrar/google` o
 * `/movil/entrar/discord`, que llevan derechas al proveedor real y solo
 * caen aquí ya CON sesión, como paso final. El `redirect("/entrar")` de
 * abajo es solo una red de seguridad para quien llegue aquí sin sesión por
 * algún otro camino (token caducado, cookie borrada a mano...).
 */
export default async function EnlazarMovilPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar?callbackUrl=/movil/enlazar");

  const store = await cookies();
  const sesionPrestada = COOKIE_NAMES.map((name) => store.get(name)?.value).find(Boolean);

  if (!sesionPrestada) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-heading text-xl font-bold">No se pudo enlazar la app</h1>
        <p className="mt-3 text-sm text-muted">
          Vuelve a intentarlo desde el botón de &quot;Entrar&quot; dentro de la app de Paragon.
        </p>
      </main>
    );
  }

  const token = await mintMobileSession(session.user.id, sesionPrestada);
  const deepLink = `paragon://auth?token=${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="font-heading text-xl font-bold">Enlazando con la app…</h1>
      <p className="mt-3 text-sm text-muted">
        Si no vuelves a la app automáticamente, pulsa el enlace.
      </p>
      <a href={deepLink} className="mt-6 inline-block font-semibold text-accent underline">
        Abrir Paragon
      </a>
      <meta httpEquiv="refresh" content={`0;url=${deepLink}`} />
    </main>
  );
}
