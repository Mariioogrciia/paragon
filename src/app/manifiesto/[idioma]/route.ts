import { notFound } from "next/navigation";
import { locales } from "@/i18n/idiomas";
import { manifiestoWeb } from "@/lib/manifiestoWeb";

// Uno por idioma, generado al compilar (ver lib/manifiestoWeb.ts).
export const dynamic = "force-static";

export function generateStaticParams() {
  return locales.map((idioma) => ({ idioma }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ idioma: string }> }) {
  const { idioma } = await params;
  if (!locales.includes(idioma)) notFound();
  return new Response(JSON.stringify(manifiestoWeb(idioma)), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
