"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vuelve a pedir al servidor los datos de la pagina cada cierto tiempo y al
 * volver a la pestaña, sin recargarla entera ni perder el scroll.
 *
 * Hace falta porque las listas de juegos (Descubrir y las paginas de cada
 * plataforma) se pintan en el SERVIDOR: aunque el dato de IGDB se refresque
 * cada 5 minutos (ver `ahoraRedondeado` en lib/igdb/client.ts), quien tuviera
 * la pagina abierta seguia viendo lo mismo hasta recargar a mano. Lo que ya
 * hace "Proximos lanzamientos" por su cuenta (es de cliente y se lo pide a su
 * API), esto lo hace para lo que se renderiza en el servidor.
 *
 * `router.refresh()` no remonta la pagina: React reconcilia lo que cambia, asi
 * que no parpadea ni pierdes donde estabas leyendo.
 *
 * El intervalo por defecto va a la par que la ventana de frescura del dato:
 * refrescar mas a menudo solo repetiria trabajo para recibir lo mismo, porque
 * la respuesta de IGDB esta cacheada dentro de esa ventana.
 */
export function RefrescoAutomatico({ segundos = 300 }: { segundos?: number }) {
  const router = useRouter();

  useEffect(() => {
    // Al volver a la pestaña solo se refresca si ya toca: antes cada cambio
    // de pestaña era un render entero de Descubrir en el servidor.
    let ultimo = Date.now();
    const refrescar = () => {
      if (document.visibilityState !== "visible" || Date.now() - ultimo < segundos * 1000 - 2000) return;
      ultimo = Date.now();
      router.refresh();
    };

    // Solo si la pestaña se esta viendo: refrescar en segundo plano gasta
    // servidor y base de datos para nadie.
    const cada = setInterval(refrescar, segundos * 1000);
    const alVolver = refrescar;
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearInterval(cada);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [router, segundos]);

  return null;
}
