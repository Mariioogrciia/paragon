import type { Metadata } from "next";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const sessionUser = session?.user;
  const profile = sessionUser ? await getProfileByUserId(sessionUser.id) : null;

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
      <body className="min-h-screen transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Header user={headerUser} />
          <main className="mx-auto max-w-[1240px] px-7 py-9">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
