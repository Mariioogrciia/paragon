import { Documento, metadatosDocumento } from "../documento";
export { viewport } from "../documento";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { esIdioma } from "@/lib/idiomasTrofeo";
import { guardarIdiomaUsuario } from "@/lib/idiomaUsuario";
import { CompartirPlatinoPendiente } from "@/components/CompartirPlatinoPendiente";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { SincronizarApariencia } from "@/components/SincronizarApariencia";
import { getProfileByUserId, resolveAvatarUrl } from "@/lib/profiles";
import { getParagonLevel } from "@/lib/paragonLevel";
import { getHiddenNavItems } from "@/lib/navPreferences";
import { rachas } from "@/lib/history";
import { recordado } from "@/lib/enSerie";
import { getLocale, getMessages } from "next-intl/server";

/**
 * Next señala cosas como `redirect()`, `notFound()` o "esta ruta tiene que ser
 * dinámica" lanzando errores especiales, marcados con `digest`. No son fallos:
 * son control de flujo. Si los capturásemos, romperíamos el renderizado sin
 * que se note hasta producción.
 */
function relanzarSiEsDeNext(error: unknown): void {
  if (typeof (error as { digest?: unknown })?.digest === "string") throw error;
}


export async function generateMetadata() {
  return metadatosDocumento(await getLocale());
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // La sesión se pide dentro de un try a propósito. Este layout envuelve TODAS
  // las rutas, así que sin esto un fallo de configuración (falta DATABASE_URL,
  // la cadena apunta al puerto directo en vez del pooler, la base no responde)
  // tumba hasta las páginas que no tocan la base, como /faq: el usuario ve un
  // "server error" en blanco y no hay forma de saber qué pasa. Degradando a
  // "sesión no iniciada" el sitio público sigue en pie y el fallo queda escrito
  // en los logs, que es donde se puede leer.
  // `auth()` está sobrecargada (sirve también de middleware), así que su tipo
  // de retorno inferido no es solo la sesión: la anotamos a mano.
  let session: Session | null = null;

  try {
    session = await auth();
  } catch (error) {
    relanzarSiEsDeNext(error);
    console.error("[layout] no se pudo leer la sesión:", error);
  }

  const sessionUser = session?.user;

  // Si eligió idioma en la web (cookie), sus push y avisos salen en ese
  // idioma (lib/idiomaUsuario.ts). Sin cookie no se toca: pisaría el de la app.
  if (sessionUser) {
    const elegido = (await cookies()).get("NEXT_LOCALE")?.value;
    if (elegido && esIdioma(elegido)) await guardarIdiomaUsuario(sessionUser.id, elegido);
  }

  // Las tres no dependen entre sí — antes iban en serie (perfil, luego
  // nivel, luego nav oculta) en el camino crítico de CADA página. `nivel`
  // es la más cara de las tres (getParagonLevels escanea todo el
  // historial de trofeos), así que ya no se queda esperando a que el
  // perfil termine primero sin motivo.
  let profile = null;
  const [profileResult, nivelParagon, navOculta, rachaUsuario] = sessionUser
    ? await Promise.all([
        getProfileByUserId(sessionUser.id).catch((error) => {
          relanzarSiEsDeNext(error);
          console.error("[layout] no se pudo leer el perfil:", error);
          return null;
        }),
        // Nivel y racha recorren todo el historial de trofeos y salen en la
        // cabecera de CADA página: dos minutos de memoria por persona bastan
        // (21 oct 2026, CPU de Vercel pasada del plan Hobby).
        recordado(`nivel:${sessionUser.id}`, 120_000, () => getParagonLevel(sessionUser.id)),
        getHiddenNavItems(sessionUser.id),
        recordado(`racha:${sessionUser.id}`, 120_000, () => rachas(sessionUser.id)).catch((error) => {
          relanzarSiEsDeNext(error);
          console.error("[layout] no se pudo leer la racha:", error);
          return null;
        }),
      ])
    : [null, null, [], null];
  profile = profileResult;

  const headerUser = sessionUser
    ? {
        handle: profile?.handle ?? null,
        name: sessionUser.name ?? "?",
        // La misma foto que en el resto de la app (ver resolveAvatarUrl):
        // antes esto era `sessionUser.image`, la del proveedor de login, así
        // que quien entraba con Google pero tenía PSN vinculado veía su cara
        // de Google arriba y su avatar de PSN en el perfil y las reseñas.
        image: (profile ? resolveAvatarUrl(profile) : undefined) ?? sessionUser.image,
        paragonLevel: nivelParagon?.level ?? null,
        paragonProgress: nivelParagon?.progreso ?? null,
        esDesarrollador: profile?.esDesarrollador ?? false,
        racha: rachaUsuario && rachaUsuario.actual > 0 ? { actual: rachaUsuario.actual, hoyCuenta: rachaUsuario.hoyCuenta } : null,
      }
    : null;

  return (
    <Documento
      locale={locale}
      messages={messages}
      user={headerUser}
      navOculta={navOculta}
      antes={
        sessionUser && profile ? (
          <SincronizarApariencia guardada={profile.apariencia ?? null} nivel={nivelParagon?.level ?? 1} />
        ) : null
      }
      despues={
        // "¿Lo compartes?" tras un platino nuevo (lib/compartirPlatino.ts).
        sessionUser && profile?.handle ? (
          <Suspense fallback={null}>
            <CompartirPlatinoPendiente userId={sessionUser.id} handle={profile.handle} />
          </Suspense>
        ) : null
      }
    >
      {children}
    </Documento>
  );
}
