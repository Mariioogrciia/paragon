/**
 * Panel "Detalles" de la ficha de juego (`/juego/[id]`) — desarrollador,
 * editor, fecha de lanzamiento, plataformas, géneros, temas, modos de juego
 * y enlaces oficiales. Todo viene de IGDB (`getGameDetails`), así que
 * cualquier campo puede faltar según lo que tenga catalogado ese juego
 * concreto — cada fila se oculta sola si no hay dato, no se rellena con
 * nada inventado.
 */

interface Props {
  developer?: string;
  publisher?: string;
  releaseLabel?: string;
  platforms: string[];
  genres: string[];
  themes: string[];
  gameModes: string[];
  websites: { label: string; url: string }[];
  franchises?: string[];
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold">{children}</div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold"
          style={{ border: "1px solid var(--border)" }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function GameDetailsSidebar({ developer, publisher, releaseLabel, platforms, genres, themes, gameModes, websites, franchises }: Props) {
  const hayAlgo =
    developer || publisher || releaseLabel || platforms.length > 0 || genres.length > 0 || themes.length > 0 || gameModes.length > 0 || websites.length > 0 || (franchises && franchises.length > 0);
  if (!hayAlgo) return null;

  return (
    <aside
      className="space-y-4 rounded-2xl p-5 lg:sticky lg:top-24"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Detalles</h2>

      {developer && <Fila label="Desarrollador">{developer}</Fila>}
      {publisher && publisher !== developer && <Fila label="Editor">{publisher}</Fila>}
      {releaseLabel && <Fila label="Fecha de lanzamiento">{releaseLabel}</Fila>}
      {platforms.length > 0 && (
        <Fila label="Plataformas">
          <Chips items={platforms} />
        </Fila>
      )}
      {genres.length > 0 && (
        <Fila label="Géneros">
          <Chips items={genres} />
        </Fila>
      )}
      {themes.length > 0 && (
        <Fila label="Temas">
          <Chips items={themes} />
        </Fila>
      )}
      {gameModes.length > 0 && (
        <Fila label="Modos de juego">
          <Chips items={gameModes} />
        </Fila>
      )}
      {franchises && franchises.length > 0 && (
        <Fila label="Franquicias">
          <Chips items={franchises} />
        </Fila>
      )}
      {websites.length > 0 && (
        <Fila label="Sitios web">
          <div className="flex flex-wrap gap-2">
            {websites.map((w) => (
              <a
                key={w.url}
                href={w.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                title={w.label}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold uppercase transition-colors hover:text-accent"
                style={{ border: "1px solid var(--border)" }}
              >
                {w.label.slice(0, 1)}
              </a>
            ))}
          </div>
        </Fila>
      )}
    </aside>
  );
}
