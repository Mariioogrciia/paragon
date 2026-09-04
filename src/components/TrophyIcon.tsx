import { tileFor } from "@/lib/design";
import type { TrophyGrade } from "@/lib/types";
import { TROPHY_TYPE_LABEL, type TrophyType } from "@/lib/trophyType";

const COLORS: Record<TrophyGrade, string> = {
  bronze: "var(--bronze)",
  silver: "var(--silver)",
  gold: "var(--gold)",
  platinum: "var(--platinum)",
};

export const GRADE_LABEL: Record<TrophyGrade, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
  platinum: "Platino",
};

/** Nombre del metal, o "Logro" donde la plataforma no los tiene. */
export function gradeLabel(grade?: TrophyGrade): string {
  return grade ? GRADE_LABEL[grade] : "Logro";
}

const PSN_CUP = (
  <path
    fill="currentColor"
    d="M17.5 3H6.5c-.8 0-1.5.7-1.5 1.5v1.8c0 2.2 1.5 4 3.5 4.4v1.8c0 1.9 1.3 3.5 3 3.9v1.6H9v3h6v-3h-2.5v-1.6c1.7-.4 3-2 3-3.9v-1.8c2-.4 3.5-2.2 3.5-4.4V4.5c0-.8-.7-1.5-1.5-1.5zM6.5 9.2c-1.1-.3-2-1.3-2-2.5V4.5h2v4.7zM17.5 6.7c0 1.2-.9 2.2-2 2.5V4.5h2v2.2z"
  />
);

const PSN_PLATINUM = (
  <>
    <path
      fill="currentColor"
      d="M12 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm0 9.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
    />
    <path
      fill="currentColor"
      d="M13.5 13.3c1.7.4 3 2 3 3.9v1.8h-9v-1.8c0-1.9 1.3-3.5 3-3.9v-1.3c-2-.4-3.5-2.2-3.5-4.4v-.6h2v.6c0 1.2.9 2.2 2 2.5v1.9h2v-1.9c1.1-.3 2-1.3 2-2.5v-.6h2v.6c0 2.2-1.5 4-3.5 4.4v1.3z"
    />
  </>
);

export function TrophyIcon({
  grade,
  dimmed = false,
  size = 18,
}: {
  grade: TrophyGrade;
  dimmed?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={GRADE_LABEL[grade]}
      style={{ color: COLORS[grade], opacity: dimmed ? 0.3 : 1 }}
    >
      {grade === "platinum" ? PSN_PLATINUM : PSN_CUP}
    </svg>
  );
}

const TROPHY_TYPE_PATHS: Record<TrophyType, React.ReactNode> = {
  // Libro abierto: historia/campaña.
  historia: (
    <path d="M12 6.5c-1.4-1-3.2-1.5-5-1.5-1 0-2 .15-3 .45v12.5c1-.3 2-.45 3-.45 1.8 0 3.6.5 5 1.5m0-12.5c1.4-1 3.2-1.5 5-1.5 1 0 2 .15 3 .45v12.5c-1-.3-2-.45-3-.45-1.8 0-3.6.5-5 1.5m0-12.5v12.5" />
  ),
  // Gema: coleccionables.
  coleccionable: <path d="M6 3h12l3 5-9 13L3 8z M3 8h18 M9 3l-2 5 5 13 5-13-2-5" />,
  // Estrella con check: completista / 100%.
  completista: (
    <>
      <path d="M12 2l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 16.7 6.1 19.9l1.3-6.5-4.9-4.6 6.6-.8z" />
    </>
  ),
  // Dos figuras: multijugador.
  multijugador: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 2.5-5 5-5s5 2 5 5M16 11a3 3 0 1 0 0-6M14 20c0-2.5 1.8-4.5 4-5s5 1.5 5 5" />,
  // Rayo: habilidad.
  habilidad: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  // Ojo tachado: secreto.
  secreto: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      <line x1="3" y1="21" x2="21" y2="3" />
    </>
  ),
};

/**
 * Iconito de categoría junto a un trofeo (ver lib/trophyType.ts). Salvo
 * "Secreto" (dato real, `hidden`), el resto son una aproximación por
 * palabras clave — el título del icono lo dice, no se presenta como certeza.
 */
export function TrophyTypeIcon({ tipo, size = 14 }: { tipo: TrophyType; size?: number }) {
  const aproximado = tipo !== "secreto";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={TROPHY_TYPE_LABEL[tipo]}
    >
      <title>
        {TROPHY_TYPE_LABEL[tipo]}
        {aproximado ? " (aproximado, por el texto del trofeo)" : ""}
      </title>
      {TROPHY_TYPE_PATHS[tipo]}
    </svg>
  );
}

/**
 * Icono de trofeo sobre un cuadrado degradado del color del metal, para las
 * filas de "próximos pasos": el metal se reconoce por la mancha de color
 * antes de leer la etiqueta.
 */
export function TrophyTile({ grade, size = 40 }: { grade?: TrophyGrade; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: tileFor(grade) }}
    >
      <svg
        width={size * 0.54}
        height={size * 0.54}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ color: "#0b1220" }}
      >
        {grade === "platinum" ? PSN_PLATINUM : PSN_CUP}
      </svg>
    </span>
  );
}
