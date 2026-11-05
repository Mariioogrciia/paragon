"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Botón "compartir imagen" genérico — la lógica que antes vivía solo en
 * `CompartirImagenWrap.tsx` (el Wrap del perfil), generalizada para
 * cualquier imagen generada por el servidor (la del Wrap, la de un
 * platino conseguido...).
 *
 * Antes esto era un `<a download="...">` a pelo. Eso funciona en escritorio
 * y en Android, pero Safari en iPhone/iPad **ignora el atributo `download`**
 * de un enlace — no es un fallo de la app, es una limitación conocida de
 * WebKit desde siempre: en vez de descargar, abre la imagen a pantalla
 * completa y ya, sin ofrecer guardarla.
 *
 * La solución de verdad en iOS es la Web Share API con `files`: abre la
 * hoja de compartir nativa, que sí trae "Guardar imagen" (y enviarla por
 * Mensajes, WhatsApp, etc.). Donde no está disponible (la mayoría de
 * navegadores de escritorio), se cae a la descarga clásica vía blob.
 *
 * Ojo (5 nov 2026, "le doy a compartir y no pasa nada"): `navigator.share`
 * solo vale DENTRO del gesto del toque. Si antes hay que esperar a que el
 * servidor genere la imagen (segundos, la primera vez), el navegador ya no
 * lo considera un toque y lo rechaza con NotAllowedError, que se tragaba el
 * catch. Por eso la imagen se pide en cuanto el botón asoma en pantalla y
 * el toque comparte ya con el archivo en la mano; si aun así llega tarde,
 * el botón dice "Lista · toca otra vez" y el segundo toque va directo.
 */
export function CompartirImagen({
  url,
  nombreArchivo,
  tituloCompartir,
  className = "text-xs font-bold uppercase tracking-wide text-accent hover:underline disabled:opacity-50",
  style,
  children,
  onCompartido,
}: {
  /** Endpoint que devuelve la imagen (un `ImageResponse` de next/og). */
  url: string;
  nombreArchivo: string;
  tituloCompartir: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Tras abrir la hoja de compartir o descargar (p. ej. para no volver a preguntar, ver AvisoCompartirPlatino). */
  onCompartido?: () => void;
}) {
  const t = useTranslations("Perfil");
  const [estado, setEstado] = useState<"libre" | "preparando" | "otraVez" | "error">("libre");
  const boton = useRef<HTMLButtonElement>(null);
  const archivo = useRef<Promise<File | null> | null>(null);
  const listo = useRef<File | null>(null);

  function pedir(): Promise<File | null> {
    archivo.current ??= fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const file = new File([await res.blob()], nombreArchivo, { type: "image/png" });
        listo.current = file;
        return file;
      })
      .catch(() => {
        archivo.current = null; // que el siguiente toque lo reintente
        return null;
      });
    return archivo.current;
  }

  // Se pide en cuanto el botón se ve (o casi): al tocarlo ya está en la mano.
  useEffect(() => {
    archivo.current = null;
    listo.current = null;
    const el = boton.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          obs.disconnect();
          void pedir();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cambia con la imagen
  }, [url, nombreArchivo]);

  function descargar(file: File) {
    const blobUrl = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    onCompartido?.();
  }

  async function usar(file: File, conGesto: boolean) {
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: tituloCompartir });
        onCompartido?.();
        setEstado("libre");
      } catch (error) {
        const nombre = (error as { name?: string })?.name;
        if (nombre === "AbortError") return setEstado("libre"); // canceló la hoja: nada que avisar
        // Sin gesto (la imagen tardó): el siguiente toque ya la tiene lista.
        if (nombre === "NotAllowedError" && !conGesto) return setEstado("otraVez");
        descargar(file);
        setEstado("libre");
      }
      return;
    }
    // Descarga clásica (escritorio): sí respeta `download` porque el
    // recurso ya es un blob local, no una petición de red.
    descargar(file);
    setEstado("libre");
  }

  async function compartir() {
    // Con el archivo ya bajado, `share` se llama sin esperar a nada: dentro del gesto.
    if (listo.current) return usar(listo.current, true);
    setEstado("preparando");
    const file = await pedir();
    if (!file) return setEstado("error");
    await usar(file, false);
  }

  const texto =
    estado === "preparando"
      ? t("CompartirImagen.preparando")
      : estado === "otraVez"
        ? t("CompartirImagen.tocaOtraVez")
        : estado === "error"
          ? t("CompartirImagen.error")
          : (children ?? t("CompartirImagen.compartirImagen"));

  return (
    <button ref={boton} type="button" onClick={compartir} disabled={estado === "preparando"} className={className} style={style} aria-live="polite">
      {texto}
    </button>
  );
}
