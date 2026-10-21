import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/components/landing/Portada";
export { metadatosPortada as metadata } from "@/components/landing/Portada";

// La portada sin sesión, ya hecha y cacheada (ver layout.tsx de esta carpeta).
export const revalidate = 900;

export default async function PortadaPublica({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <Landing />;
}
