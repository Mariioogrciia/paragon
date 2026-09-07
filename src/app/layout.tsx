import { dominioPublico } from "@/lib/site";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import Script from "next/script";
import { Barlow, Chakra_Petch, JetBrains_Mono } from "next/font/google";
import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getProfileByUserId, resolveAvatarUrl } from "@/lib/profiles";
import { getParagonLevel } from "@/lib/paragonLevel";
import { contarSinLeer } from "@/lib/notifications";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
});

// Solo se usa cuando el visitante elige el estilo "Terminal" (ver
// ThemeCustomizer.tsx / .estilo-terminal en globals.css) — se expone siempre
// como variable CSS, cargada una vez, y esa clase decide si se aplica.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

const DESCRIPCION = "Tu progreso de trofeos y logros multiplataforma, en un solo sitio.";

/**
 * `metadataBase` NO es opcional en cuanto hay imagenes sociales: sin el,
 * Next no puede convertir "/u/x/opengraph-image" en la URL absoluta que
 * exigen Discord, WhatsApp o Twitter, y la tarjeta simplemente no sale. El
 * dominio sale de `lib/site.ts`, la misma fuente que usan `sitemap.ts` y
 * `robots.ts`.
 */
const DOMINIO = dominioPublico();

export const metadata: Metadata = {
  metadataBase: new URL(DOMINIO),
  title: "Paragon",
  description: DESCRIPCION,
  // Valores por defecto para CUALQUIER pagina que no declare los suyos.
  // Antes la app no tenia nada de openGraph en ningun sitio, asi que
  // compartir un enlace de Paragon dejaba un enlace pelado.
  openGraph: {
    siteName: "Paragon",
    locale: "es_ES",
    type: "website",
    title: "Paragon",
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Paragon",
    description: DESCRIPCION,
  },
  // El propio archivo `app/manifest.ts` ya hace que Next sirva
  // /manifest.webmanifest y (con esta línea) lo enlace en el <head> — antes
  // había además un `<link rel="manifest" href="/manifest.ts">` a mano en
  // este layout, apuntando a una ruta que da 404 de verdad (el ".ts" nunca
  // se sirve tal cual). Con un manifest que el navegador no puede leer,
  // "Añadir a pantalla de inicio" no aparece en ningún sitio — ni en iOS ni
  // en Android/escritorio — así que la app nunca se podía "instalar".
  manifest: "/manifest.webmanifest",
  // iOS ignora por completo los iconos del manifest (limitación de Safari,
  // no nuestra): solo mira `apple-touch-icon`. Sin esto, "Añadir a pantalla
  // de inicio" funciona pero el icono sale en blanco o es una captura fea
  // de la propia página.
  appleWebApp: {
    capable: true,
    title: "Paragon",
    statusBarStyle: "black-translucent",
  },
  // NO declarar `icons` aquí a propósito. Antes había un `icons: { apple:
  // "/logo.jpg" }` y el efecto real era que Next dejaba de emitir el
  // `<link rel="icon">` por completo — comprobado en vivo con `curl`: el
  // <head> solo llevaba el apple-touch-icon, y `app/icon.jpg` se servía
  // pero no lo enlazaba nadie. De ahí el "el favicon se ha ido" que se
  // achacó a caché del navegador en una sesión anterior; no era caché.
  // Ahora los dos iconos salen de la convención de archivos, que es lo que
  // recomiendan los propios docs de Next (ver
  // node_modules/next/dist/docs/.../01-metadata/app-icons.md):
  //   - `app/icon.jpg`       (256x256) → <link rel="icon">
  //   - `app/apple-icon.jpg` (180x180) → <link rel="apple-touch-icon">
  // El `logo.jpg` de 1024 sigue en /public para la cabecera y el manifest,
  // donde sí hace falta grande.
};

/**
 * Next señala cosas como `redirect()`, `notFound()` o "esta ruta tiene que ser
 * dinámica" lanzando errores especiales, marcados con `digest`. No son fallos:
 * son control de flujo. Si los capturásemos, romperíamos el renderizado sin
 * que se note hasta producción.
 */
function relanzarSiEsDeNext(error: unknown): void {
  if (typeof (error as { digest?: unknown })?.digest === "string") throw error;
}

import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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

  let profile = null;
  if (sessionUser) {
    try {
      profile = await getProfileByUserId(sessionUser.id);
    } catch (error) {
      relanzarSiEsDeNext(error);
      console.error("[layout] no se pudo leer el perfil:", error);
    }
  }

  const nivelParagon = sessionUser ? await getParagonLevel(sessionUser.id) : null;
  const avisosSinLeer = sessionUser ? await contarSinLeer(sessionUser.id) : 0;

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
        // Sin cuentas vinculadas no hay nada que sincronizar — el botón de
        // la cabecera (ver Header.tsx) se esconde en vez de mostrarse
        // deshabilitado, que invita a preguntarse "¿por qué no funciona?".
        tieneCuentas: (profile?.accounts.length ?? 0) > 0,
      }
    : null;

  return (
    <html lang="es" className={`${barlow.variable} ${chakra.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/*
          El acento se aplica antes de pintar. Si esperásemos al efecto de
          React, la primera pintada saldría azul y cambiaría de color a la vista
          del usuario en cada carga: un parpadeo feo y evitable.

          `next/script` con `beforeInteractive` en vez de un `<script>` suelto:
          un `<script>` a pelo dentro del árbol de React solo se ejecuta al
          parsear el HTML del servidor — en cualquier re-render del lado del
          cliente (Fast Refresh, navegación) React lo trata como un nodo del
          DOM más y avisa por consola sin ejecutarlo. `next/script` lo saca de
          ese ciclo.

          Se comprueba primero el color libre (ThemeCustomizer.tsx, rueda de
          color): si está guardado, manda sobre cualquier clase de acento
          preset — mismo orden que sigue el propio componente al restaurarse.
        */}
        <Script
          id="acento-inicial"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{
              var libre=localStorage.getItem("platinos:acento-libre");
              if(libre){
                var m=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(libre);
                if(m){
                  document.documentElement.style.setProperty("--accent-rgb", parseInt(m[1],16)+" "+parseInt(m[2],16)+" "+parseInt(m[3],16));
                  document.documentElement.style.setProperty("--accent-2", libre);
                }
              } else {
                var a=localStorage.getItem("platinos:acento");
                if(a) document.documentElement.classList.add(a);
              }
              var e=localStorage.getItem("platinos:estilo");
              if(e) document.documentElement.classList.add(e);
            }catch(err){}`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col transition-colors duration-300">
        <ServiceWorkerRegister />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          themes={["dark", "light", "oled", "high-contrast"]}
        >
          <Header user={headerUser} avisosSinLeer={avisosSinLeer} />
          {/* `px-4` en movil, `px-7` a partir de tablet: 28px por lado se comian
              56px de los 375 de un movil (un 15% del ancho) antes de que las
              tarjetas de dentro pusieran su propio relleno encima. */}
          <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-9 sm:px-7">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
