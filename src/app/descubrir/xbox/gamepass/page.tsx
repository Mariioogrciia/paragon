import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { GamePassCatalog } from "@/components/GamePassCatalog";
import { getXboxGamePassCatalog } from "@/lib/xboxGamePassCatalog";
import { XboxIcon } from "@/lib/platformIcons";

export const metadata = {
  title: "Catálogo de Xbox Game Pass · Descubrir · Paragon",
};

/**
 * Catálogo completo, no solo "lo último añadido" (eso sigue en
 * /descubrir/xbox, vía xboxGamePass.ts). Separado por Consola/PC porque es
 * lo que la propia API de Microsoft distingue de verdad — ver el comentario
 * largo en lib/xboxGamePassCatalog.ts sobre por qué esto no es
 * "Standard"/"Ultimate".
 */
export default async function XboxGamePassCatalogoPage() {
  const [consola, pc] = await Promise.all([
    getXboxGamePassCatalog("consola"),
    getXboxGamePassCatalog("pc"),
  ]);

  return (
    <div>
      <BackButton fallbackHref="/descubrir/xbox" />
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "#107C10" }}
        >
          <XboxIcon size={26} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            <Link href="/descubrir" className="hover:underline">Descubrir</Link> /{" "}
            <Link href="/descubrir/xbox" className="hover:underline">Xbox</Link> / Catálogo
          </p>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Catálogo de Game Pass</h1>
        </div>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-muted">
        Todo lo que incluye Xbox Game Pass ahora mismo, tal cual lo publica Microsoft — separado por Consola y PC
        porque son catálogos distintos de verdad. Cada tarjeta lleva a su ficha oficial en xbox.com (no están
        emparejadas con la base de Paragon, son demasiadas para eso).
      </p>

      <GamePassCatalog consola={consola} pc={pc} />
    </div>
  );
}
