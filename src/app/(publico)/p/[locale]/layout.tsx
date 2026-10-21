import { notFound } from "next/navigation";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Documento } from "../../../documento";
import { locales } from "@/i18n/idiomas";
export { metadata, viewport } from "../../../documento";

/**
 * Raíz de las páginas públicas cacheables (21 oct 2026). `src/proxy.ts`
 * manda aquí, sin que se vea en la URL, a quien llega SIN sesión a la
 * portada, a una ficha de juego o a un perfil: `/juego/123` se sirve desde
 * `/p/es/juego/123`, generada una vez y guardada en la CDN de Vercel.
 *
 * Nada de aquí abajo puede leer cookies, cabeceras ni la sesión: en cuanto
 * algo lo hiciera, Next volvería a renderizar en cada visita (o peor, si se
 * forzase la caché, guardaría la página de una persona para todas). Por eso
 * la cabecera va sin usuario y el idioma llega en la ruta.
 */
// Ninguna se genera al compilar (la portada consulta la base, y un despliegue
// no debe depender de que responda): cada una con la primera visita.
export function generateStaticParams() {
  return [];
}

export default async function LayoutPublico({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <Documento locale={locale} messages={messages} user={null} navOculta={[]}>
      {children}
    </Documento>
  );
}
