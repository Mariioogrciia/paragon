/**
 * Manda un error de la web a Admin → Registro (api/registro-error). Lo usan
 * `error.tsx` y `global-error.tsx`. Nunca lanza ni espera respuesta.
 */
export function reportarError(error: Error & { digest?: string }): void {
  try {
    const cuerpo = JSON.stringify({ mensaje: error.message, digest: error.digest, ruta: window.location.pathname });
    navigator.sendBeacon("/api/registro-error", new Blob([cuerpo], { type: "application/json" }));
  } catch {
    // Sin sendBeacon: este error no se apunta.
  }
}
