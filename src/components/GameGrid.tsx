import type { ReactNode } from "react";

/**
 * Rejilla que envuelve — alternativa a `FilaHorizontal` para listas que no
 * necesitan sensación de "cinta en movimiento" (Joyas Ocultas, recomendados,
 * ofertas...). Reservar el scroll horizontal/marquesina para lo que de
 * verdad es un ranking o un pulso en directo (Tendencia); todo lo demás en
 * rejilla, para no repetir la misma fila una y otra vez por toda la app.
 */
export function GameGrid<T>({
  items,
  itemKey,
  children,
  columns = "grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
}: {
  items: T[];
  itemKey: (item: T) => string | number;
  children: (item: T) => ReactNode;
  columns?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`grid ${columns}`}>
      {items.map((item) => (
        <div key={itemKey(item)}>{children(item)}</div>
      ))}
    </div>
  );
}
