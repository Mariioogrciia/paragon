import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FichaJuego, metadatosFichaJuego } from "@/components/paginas/FichaJuego";
import { TextosRuta } from "@/components/TextosRuta";

// Ficha de juego sin sesión, cacheada media hora (ver el layout de `p/[locale]`).
export const revalidate = 1800;

// Ninguna se genera al compilar: cada una la primera vez que alguien la pide.
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return metadatosFichaJuego({ params: Promise.resolve({ id }) });
}

export default async function FichaJuegoPublica({ params }: { params: Params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <TextosRuta ruta="publico:/juego">
      <FichaJuego params={Promise.resolve({ id })} conSesion={false} />
    </TextosRuta>
  );
}
