import { libreaDe } from "@/lib/librea";

/**
 * Placa inclinada con el puesto ("P1") o la etiqueta de un clan, en los
 * colores de la librea de `id`. Es la pieza que da el aire de torre de tiempos
 * a Ligas y Clanes (ver `.carreras-*` en globals.css).
 */
export function Dorsal({ id, texto, grande = false }: { id: string; texto: string; grande?: boolean }) {
  const { fondo, tinta } = libreaDe(id);
  return (
    <span
      className={`carreras-dorsal ${grande ? "carreras-dorsal-grande" : ""}`}
      style={{ ["--librea" as string]: fondo, ["--librea-tinta" as string]: tinta }}
    >
      <span>{texto}</span>
    </span>
  );
}
