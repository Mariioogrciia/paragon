import type { Metadata } from "next";
import type { Session } from "next-auth";
import { Barlow, Chakra_Petch } from "next/font/google";
import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { accountFor, getProfileByUserId } from "@/lib/profiles";
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

export const metadata: Metadata = {
  title: "Platinos",
  description: "Tu progreso de trofeos y el de tus amigos, en un solo sitio.",
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

  const headerUser = sessionUser
    ? {
        handle: profile?.handle ?? null,
        name: sessionUser.name ?? "?",
        image: sessionUser.image,
        trophyLevel: accountFor(profile, "psn")?.level ?? null,
      }
    : null;

  return (
    <html lang="es" className={`${barlow.variable} ${chakra.variable}`} suppressHydrationWarning>
      <head>
        {/*
          El acento se aplica antes de pintar. Si esperásemos al efecto de
          React, la primera pintada saldría azul y cambiaría de color a la vista
          del usuario en cada carga: un parpadeo feo y evitable.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var a=localStorage.getItem("platinos:acento");if(a)document.documentElement.classList.add(a)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          themes={["dark", "light", "oled", "high-contrast"]}
        >
          <Header user={headerUser} />
          <main className="mx-auto max-w-[1240px] px-7 py-9">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
