import type { IconType } from "react-icons";
import {
  MdAcUnit, MdAnchor, MdBolt, MdCastle, MdDiamond, MdEmojiEvents,
  MdLocalFireDepartment, MdMilitaryTech, MdPets, MdRocketLaunch, MdSportsEsports, MdStar,
} from "react-icons/md";
import { COLORES, EMBLEMA_POR_DEFECTO, TRAZADO_FORMA, textoAEmblema, type Emblema, type Simbolo } from "@/lib/clanEmblema";

/** Los mismos iconos de Material que la app (material-icons-extended). */
export const ICONO_SIMBOLO: Record<Simbolo, IconType> = {
  copa: MdEmojiEvents,
  rayo: MdBolt,
  llama: MdLocalFireDepartment,
  estrella: MdStar,
  medalla: MdMilitaryTech,
  mando: MdSportsEsports,
  cohete: MdRocketLaunch,
  garra: MdPets,
  castillo: MdCastle,
  diamante: MdDiamond,
  ancla: MdAnchor,
  copo: MdAcUnit,
};

/**
 * El escudo de un clan (lib/clanEmblema.ts): la forma rellena del color de
 * fondo, con un filo del color del símbolo, y el símbolo encima. Sin elegir
 * todavía, el de por defecto.
 */
export function EscudoClan({ emblema, size = 48, className }: { emblema: Emblema | string | null | undefined; size?: number; className?: string }) {
  const e = (typeof emblema === "string" || emblema == null ? textoAEmblema(emblema) : emblema) ?? EMBLEMA_POR_DEFECTO;
  const Icono = ICONO_SIMBOLO[e.simbolo];
  const fondo = COLORES[e.fondo];
  const color = COLORES[e.color];
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0">
        <path d={TRAZADO_FORMA[e.forma]} fill={fondo} />
        <path d={TRAZADO_FORMA[e.forma]} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={5} />
      </svg>
      <Icono className="relative" style={{ width: size * 0.46, height: size * 0.46, color }} />
    </span>
  );
}
