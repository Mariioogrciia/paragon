"use client";
import { useRef, useState } from "react";
import Link from "next/link";

export function TiltCard({
  href,
  children,
  className,
  innerClassName,
  style,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  /**
   * `overflow-hidden` va aquí, NUNCA en `className` — el propio `<Link>` es
   * quien lleva el `hover:shadow-*` (y quien rota con el tilt), y
   * `overflow-hidden` en el mismo elemento que declara ese resplandor lo
   * recorta a sí mismo en silencio, sin ningún error (misma trampa que
   * `overflow-hidden` con un `filter: drop-shadow` — ver HANDOFF.md). El
   * radio de esquina (`rounded-*`) tiene que repetirse en los dos sitios:
   * aquí para que el recorte coincida con la carátula, y en `className`
   * para que la sombra/el borde del propio `<Link>` salgan con la misma
   * forma.
   */
  innerClassName?: string;
  style?: React.CSSProperties;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [transform, setTransform] = useState(
    "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateY = ((x / rect.width) - 0.5) * 15;
    const rotateX = ((y / rect.height) - 0.5) * -15;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`
    );
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  return (
    <Link
      ref={cardRef}
      href={href}
      className={`group transition-shadow duration-300 hover:shadow-[0_0_30px_rgb(var(--accent-rgb) / 0.15)] ${className || ""}`}
      style={{
        ...style,
        transform,
        transition: transform.includes("rotateX(0deg)")
          ? "transform 0.5s ease-out"
          : "transform 0.1s ease-out",
        willChange: "transform",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {innerClassName ? <div className={`h-full w-full ${innerClassName}`}>{children}</div> : children}
    </Link>
  );
}
