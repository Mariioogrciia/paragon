import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Barlow, Chakra_Petch, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { PublicidadScripts } from "@/components/PublicidadScripts";
import { dominioPublico, PERFILES_AUTOR } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { datosSitio } from "@/lib/datosEstructurados";
import { IMAGEN_SOCIAL } from "@/lib/seo";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mensajesCliente } from "@/i18n/clientMessages";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { CookieBanner } from "@/components/CookieBanner";
import { ContadorVisitas } from "@/components/ContadorVisitas";
import { ArrastrarParaDesplazar } from "@/components/ArrastrarParaDesplazar";
import "./globals.css";

/*
 * El documento HTML de Paragon (21 oct 2026), compartido por las dos raíces:
 * - `(app)/layout.tsx`: la de siempre, con sesión (se renderiza en cada visita).
 * - `(publico)/p/[locale]/layout.tsx`: la de las páginas públicas sin sesión,
 *   que no lee cookies y por eso se puede servir ya hecha desde la CDN (ver
 *   `src/proxy.ts`).
 * Lo que cambia entre las dos (la persona de la cabecera, el idioma) llega
 * por props.
 */

const barlow = Barlow({
  subsets: ["latin"],
  // 300: la página de PlayStation ("cada una en su casa") usa Barlow ligera.
  weight: ["300", "400", "500", "600", "700"],
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

// Lo que enseña Google bajo el título (21 oct 2026): con las palabras que
// busca la gente ("trofeos", "logros", "platino") y las tres plataformas.
const TITULO = "Paragon · Trofeos de PlayStation y logros de Steam y Xbox";
const DESCRIPCION =
  "Todos tus trofeos de PlayStation y logros de Steam y Xbox en un solo perfil: platinos, rareza, estadísticas, ligas con amigos y guías. Gratis, en la web y en el móvil.";

/**
 * `metadataBase` NO es opcional en cuanto hay imagenes sociales: sin el,
 * Next no puede convertir "/u/x/opengraph-image" en la URL absoluta que
 * exigen Discord, WhatsApp o Twitter, y la tarjeta simplemente no sale. El
 * dominio sale de `lib/site.ts`, la misma fuente que usan `sitemap.ts` y
 * `robots.ts`.
 */
const DOMINIO = dominioPublico();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0d13",
};

export const metadata: Metadata = {
  metadataBase: new URL(DOMINIO),
  title: TITULO,
  description: DESCRIPCION,
  applicationName: "Paragon",
  // Valores por defecto para CUALQUIER pagina que no declare los suyos.
  // Antes la app no tenia nada de openGraph en ningun sitio, asi que
  // compartir un enlace de Paragon dejaba un enlace pelado.
  openGraph: {
    siteName: "Paragon",
    locale: "es_ES",
    type: "website",
    title: TITULO,
    description: DESCRIPCION,
    images: [IMAGEN_SOCIAL],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: [IMAGEN_SOCIAL],
  },
  // El manifiesto (la web instalable) va en su idioma: ver `metadatosDocumento`.
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
  // "/logo.png" }` y el efecto real era que Next dejaba de emitir el
  // `<link rel="icon">` por completo — comprobado en vivo con `curl`: el
  // <head> solo llevaba el apple-touch-icon, y `app/icon.png` se servía
  // pero no lo enlazaba nadie. De ahí el "el favicon se ha ido" que se
  // achacó a caché del navegador en una sesión anterior; no era caché.
  // Ahora los dos iconos salen de la convención de archivos, que es lo que
  // recomiendan los propios docs de Next (ver
  // node_modules/next/dist/docs/.../01-metadata/app-icons.md):
  //   - `app/icon.png`       (256x256) → <link rel="icon">
  //   - `app/apple-icon.png` (180x180) → <link rel="apple-touch-icon">
  // El `logo.png` de 1024 sigue en /public para la cabecera y el manifest,
  // donde sí hace falta grande.
};

/** Los metadatos de arriba más el manifiesto en el idioma de la página (lib/manifiestoWeb.ts). */
export function metadatosDocumento(locale: string): Metadata {
  return { ...metadata, manifest: `/manifiesto/${locale}` };
}

type UsuarioCabecera = Parameters<typeof Header>[0]["user"];

export function Documento({
  locale,
  messages,
  user,
  navOculta,
  antes,
  despues,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  user: UsuarioCabecera;
  navOculta: Parameters<typeof Header>[0]["navOculta"];
  /** Dentro del tema, antes de la cabecera (p. ej. la apariencia guardada). */
  antes?: ReactNode;
  /** Dentro del tema, después del pie (p. ej. "¿Lo compartes?"). */
  despues?: ReactNode;
  children: ReactNode;
}) {
  return (
    <html lang={locale} className={`${barlow.variable} ${chakra.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
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
              var juego=JSON.parse(localStorage.getItem("platinos:acento-juego")||"null");
              if(juego&&juego.vars){
                for(var k in juego.vars) if(/^--juego-/.test(k)) document.documentElement.style.setProperty(k, juego.vars[k]);
                document.documentElement.classList.add("accent-juego");
              } else if(libre){
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
              // Tamaño de letra: se aplica ANTES de pintar. Si se dejara al
              // efecto de React, cada carga daria un salto visible de tamaño.
              var t=localStorage.getItem("platinos:texto");
              if(t){
                var esc={grande:"112.5%",enorme:"125%",pequeno:"87.5%"}[t];
                if(esc) document.documentElement.style.fontSize=esc;
              }
            }catch(err){}`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col transition-colors duration-300">
        <ServiceWorkerRegister />
        <ArrastrarParaDesplazar />
        <Analytics />
        <NextIntlClientProvider locale={locale} messages={mensajesCliente(messages)}>
          <CookieBanner />
          <ContadorVisitas />
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            themes={["dark", "light", "oled", "high-contrast"]}
          >
            {antes}
            {/* Datos estructurados del sitio para buscadores (lib/datosEstructurados.ts). */}
            <JsonLd datos={datosSitio(DOMINIO, PERFILES_AUTOR)} />
            {/* Consentimiento de Google + AdSense; nada sin NEXT_PUBLIC_ADSENSE_CLIENT (lib/publicidad.ts). */}
            <PublicidadScripts />
            <Header user={user} navOculta={navOculta} locale={locale} />
            {/* `px-4` en movil, `px-7` a partir de tablet: 28px por lado se comian
                56px de los 375 de un movil (un 15% del ancho) antes de que las
                tarjetas de dentro pusieran su propio relleno encima. */}
            <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-9 sm:px-7">{children}</main>
            <Footer />
            {despues}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
