import { tileFor } from "@/lib/design";
import type { TrophyGrade } from "@/lib/types";

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
