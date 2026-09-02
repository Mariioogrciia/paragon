/* eslint-disable @next/next/no-img-element */

/**
 * Avatar con iniciales de reserva.
 *
 * Usamos <img> y no next/image porque las URLs vienen de dominios de Sony que
 * cambian, y no queremos que un dominio no declarado deje la cara en blanco.
 */
export function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-muted"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
