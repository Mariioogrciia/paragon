import { setRequestLocale } from "next-intl/server";
import { PaginaDescubrir, metadatosDescubrir } from "@/components/paginas/Descubrir";
import { TextosRuta } from "@/components/TextosRuta";

export const metadata = metadatosDescubrir;

// Sin sesión, cacheada media hora: tendencias y lanzamientos no cambian minuto a minuto (ver el layout de `p/[locale]`).
export const revalidate = 1800;

export default async function DescubrirPublica({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <TextosRuta ruta="publico:/descubrir">
      <PaginaDescubrir conSesion={false} />
    </TextosRuta>
  );
}
