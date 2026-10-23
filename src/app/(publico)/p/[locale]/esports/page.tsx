import { setRequestLocale } from "next-intl/server";
import { PaginaEsports, metadatosEsports } from "@/components/paginas/Esports";
import { TextosRuta } from "@/components/TextosRuta";

export const metadata = metadatosEsports;

// Sin sesión, cacheada cinco minutos: hay partidos en directo (ver el layout de `p/[locale]`).
export const revalidate = 300;

export default async function EsportsPublica({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <TextosRuta ruta="publico:/esports">
      <PaginaEsports conSesion={false} />
    </TextosRuta>
  );
}
