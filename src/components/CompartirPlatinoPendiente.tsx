import { platinoPorCompartir } from "@/lib/compartirPlatino";
import { AvisoCompartirPlatino } from "@/components/AvisoCompartirPlatino";

/**
 * Lo pone el layout raíz con sesión iniciada: si hay un platino de esta
 * semana por el que no se ha preguntado, saca el aviso de compartir. Va en
 * <Suspense> para no retrasar la página, y un fallo de la consulta no
 * rompe nada (simplemente no sale el aviso).
 */
export async function CompartirPlatinoPendiente({ userId, handle }: { userId: string; handle: string }) {
  const platino = await platinoPorCompartir(userId).catch((error) => {
    console.error("[compartir-platino]", error);
    return null;
  });
  if (!platino) return null;
  return <AvisoCompartirPlatino key={platino.gameId} gameId={platino.gameId} titulo={platino.titulo} handle={handle} />;
}
