import { serializarJsonLd } from "@/lib/datosEstructurados";

/** Datos estructurados para buscadores (ver lib/datosEstructurados.ts). No se ve nada en la página. */
export function JsonLd({ datos }: { datos: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarJsonLd(datos) }} />;
}
