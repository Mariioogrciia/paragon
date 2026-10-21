import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PerfilJugador, metadatosPerfil } from "@/components/paginas/PerfilJugador";

// Perfil sin sesión, cacheado media hora (ver el layout de `p/[locale]`).
export const revalidate = 1800;

// Ninguno se genera al compilar: cada uno la primera vez que alguien lo pide.
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ locale: string; handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  return metadatosPerfil({ params: Promise.resolve({ handle }) });
}

export default async function PerfilPublico({ params }: { params: Params }) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  return <PerfilJugador params={Promise.resolve({ handle })} conSesion={false} />;
}
