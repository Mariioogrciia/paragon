import { setRequestLocale } from "next-intl/server";
import { PaginaNoticias, metadatosNoticias } from "@/components/paginas/Noticias";
import { TextosRuta } from "@/components/TextosRuta";

export const metadata = metadatosNoticias;

// Sin sesión, cacheada un cuarto de hora: las noticias sí van más rápido (ver el layout de `p/[locale]`).
export const revalidate = 900;

export default async function NoticiasPublica({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <TextosRuta ruta="publico:/noticias">
      <PaginaNoticias conSesion={false} />
    </TextosRuta>
  );
}
