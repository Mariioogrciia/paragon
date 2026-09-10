import Link from "next/link";
import type { HitoReservado } from "@/lib/milestones";

/**
 * "Cerrojo de Hitos" — el aviso, no el botón de reservar (ver
 * ReservarHitoButton.tsx). Solo se monta cuando estás a un trofeo del
 * platino de ESTE juego, tienes algo reservado, y lo reservado NO es este
 * juego — si lo es, no hay nada que avisar, vas exactamente a por tu hito.
 *
 * A propósito NO es una alerta "en tiempo real": Paragon no se entera de un
 * trofeo hasta que sincroniza, así que esto no puede saltar en el instante
 * exacto de conseguirlo. Es un aviso de "cuidado, esto pasaría si sigues" —
 * la próxima mejor cosa, honesta sobre lo que de verdad puede hacer.
 */
export function AvisoHitoReservado({ hito, handle }: { hito: HitoReservado; handle: string }) {
  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-xl p-4"
      style={{ background: "rgba(226, 181, 62, 0.1)", border: "1px solid rgba(226, 181, 62, 0.3)" }}
    >
      <span className="text-xl">⚠️</span>
      <p className="text-sm leading-relaxed" style={{ color: "#e2b53e" }}>
        Tienes reservado tu platino{" "}
        <span className="font-bold">#{hito.numero}</span> para{" "}
        <Link href={`/u/${handle}/${hito.gameId}`} className="underline hover:opacity-80">
          {hito.titulo}
        </Link>
        . Si sacas este platino ahora, se lo quitas.
      </p>
    </div>
  );
}
