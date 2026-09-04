/**
 * Tira de capturas de IGDB, en scroll horizontal — solo se pinta si el
 * juego tiene alguna.
 *
 * `loading="lazy"` en una tira tan larga (algunos juegos traen 15-20
 * capturas) dejaba huecos negros lisos donde una imagen aún no había
 * cargado — el navegador no las precarga por estar "lejos" horizontalmente,
 * aunque la tira entera esté arriba del todo de la página. El fondo
 * (`bg-surface-2`, el mismo gris de carga que ya usa el resto de la app)
 * rellena ese hueco mientras carga, en vez de un negro plano que parece
 * roto. Las primeras 6 (las que se ven sin desplazar en la mayoría de
 * pantallas) cargan sin esperar — son las que se ven nada más entrar.
 */
export function ScreenshotStrip({ screenshots, title }: { screenshots: string[]; title: string }) {
  if (screenshots.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 font-heading text-2xl font-bold">Capturas de pantalla</h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 py-1">
        {screenshots.map((src, i) => (
          <a
            key={src}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-video w-64 shrink-0 overflow-hidden rounded-xl bg-surface-2"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Captura de ${title} ${i + 1}`}
              className="h-full w-full object-cover"
              loading={i < 6 ? "eager" : "lazy"}
            />
          </a>
        ))}
      </div>
    </section>
  );
}
