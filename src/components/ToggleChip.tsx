"use client";

/**
 * Botón tipo "chip" con estado activo/inactivo — el mismo patrón que
 * `TrophyList`, `LibraryGrid`, `AcquisitionEditor` y `ReservarHitoButton`
 * reinventaban cada uno por su cuenta, con el riesgo real de que uno de
 * ellos derive con el tiempo (un radio distinto, un color que no es el
 * mismo verde) sin que nadie lo note. Un componente compartido en vez de
 * seis bloques de estilos inline casi idénticos — repaso de saturación de
 * esta misma sesión.
 *
 * `accentColor` es opcional: por defecto usa el acento del tema
 * (`--accent-rgb`), pero el Cerrojo de Hitos necesita el dorado de
 * siempre (`#e2b53e`, el mismo que ya usa toda la app para "oro"), no el
 * acento genérico — de ahí el override.
 */
export function ToggleChip({
  active,
  onClick,
  children,
  size = "sm",
  accentColor,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
  /** RGB sin envolver, p. ej. "226, 181, 62" — por defecto usa var(--accent-rgb). */
  accentColor?: string;
  title?: string;
}) {
  const rgb = accentColor ?? "var(--accent-rgb)";
  const padding = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[0.6875rem]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-[0.03em] transition-all hover:opacity-75 ${padding}`}
      style={
        active
          ? { background: `rgb(${rgb} / 0.18)`, border: `1px solid rgb(${rgb} / 0.5)`, color: accentColor ? `rgb(${rgb})` : "var(--accent-text)" }
          : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }
      }
    >
      {children}
    </button>
  );
}
