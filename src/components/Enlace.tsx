"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * `next/link` que solo precarga cuando hay intención (ratón encima o dedo
 * tocando), no por aparecer en pantalla (22 oct 2026).
 *
 * Por qué: hay un `app/loading.tsx` en la raíz, así que para Next TODAS las
 * rutas dinámicas tienen frontera de carga y cada `<Link>` visible pedía al
 * servidor el layout raíz — que con sesión calcula nivel Paragon, racha y
 * perfil. Una biblioteca o Descubrir con 50 carátulas eran 50 funciones de
 * Vercel por cada vistazo. Con el plan Hobby pasado de CPU (5h24m de 4h) y de
 * Fast Origin Transfer, eso sobraba.
 *
 * Quien pase `prefetch` a mano manda sobre esto.
 */
export default function Enlace({ prefetch, onMouseEnter, onTouchStart, ...resto }: ComponentProps<typeof Link>) {
  const [intencion, setIntencion] = useState(false);

  return (
    <Link
      {...resto}
      prefetch={prefetch !== undefined ? prefetch : intencion ? null : false}
      onMouseEnter={(e) => {
        setIntencion(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        setIntencion(true);
        onTouchStart?.(e);
      }}
    />
  );
}
