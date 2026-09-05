import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { EstadisticasCompletas } from "@/components/EstadisticasCompletas";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `Estadísticas de @${handle} · Paragon` };
}

export default async function EstadisticasPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  return (
    <div>
      <BackButton fallbackHref={`/u/${handle}`} />
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">
        <Link href={`/u/${handle}`} className="hover:underline">@{handle}</Link> / Estadísticas
      </p>
      <h1 className="mb-6 font-heading text-3xl font-bold uppercase tracking-wide">Estadísticas</h1>

      <EstadisticasCompletas handle={handle} />
    </div>
  );
}
