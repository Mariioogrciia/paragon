import io
p='src/components/UpcomingGames.tsx'
s=io.open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert a in s, a[:70]
    s=s.replace(a,b,1)
rep('import { useTranslations } from "next-intl";','import { useLocale, useTranslations } from "next-intl";')
rep('''export function UpcomingGames({ wishlistedIgdbIds = [], modo = "proximos" }: { wishlistedIgdbIds?: number[]; modo?: "proximos" | "recientes" }) {''','''export function UpcomingGames({
  wishlistedIgdbIds = [],
  modo = "proximos",
  variante = "tarjetas",
  compacto = false,
}: {
  wishlistedIgdbIds?: number[];
  modo?: "proximos" | "recientes";
  /** "panel": panel de salidas de aeropuerto (Noticias). "tarjetas": la de siempre (Panel). */
  variante?: "tarjetas" | "panel";
  /** Solo con `variante="panel"`: filas cortas para la columna estrecha. */
  compacto?: boolean;
}) {''')
rep('''  if (loading) {
    return (
      <div className="rounded-[18px] border border-border bg-surface p-6">''','''  if (loading && variante === "panel") {
    return (
      <div className="salidas salidas-tablero h-full p-5" aria-busy="true">
        <div className="mb-4 h-5 w-48 rounded bg-surface-2 animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-2 h-12 rounded bg-surface-2/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-[18px] border border-border bg-surface p-6">''')
rep('''  if (games.length === 0) return null;
''','''  if (games.length === 0) return null;

  if (variante === "panel") {
    return <PanelSalidas games={games} modo={modo} compacto={compacto} wishlistedIgdbIds={wishlistedIgdbIds} />;
  }
''')
rep('''function WishlistButton(''','''/**
 * Panel de salidas (Noticias, rediseño del 1 oct 2026): cada lanzamiento es
 * un vuelo. La fecha va en letras de paleta (una casilla por carácter) y el
 * estado es la cuenta atrás de siempre; los títulos, en letra normal para
 * que se lean. Misma información y mismas acciones que la tarjeta: ficha
 * del juego al pulsar la fila y botón de deseados.
 */
function PanelSalidas({
  games,
  modo,
  compacto,
  wishlistedIgdbIds,
}: {
  games: UpcomingGame[];
  modo: "proximos" | "recientes";
  compacto: boolean;
  wishlistedIgdbIds: number[];
}) {
  const t = useTranslations("Descubrir.UpcomingGames");
  const locale = useLocale();
  const router = useRouter();

  const fecha = (game: UpcomingGame): string => {
    if (game.releasePrecision === "day" && game.releaseDate) {
      const d = new Date(game.releaseDate);
      const dia = String(d.getUTCDate()).padStart(2, "0");
      const mes = d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3).toUpperCase();
      return compacto ? `${dia} ${mes}` : `${dia} ${mes} ${String(d.getUTCFullYear()).slice(2)}`;
    }
    return game.releaseLabel.toUpperCase();
  };

  return (
    <section className="salidas salidas-tablero h-full" aria-label={modo === "recientes" ? t("tituloRecientes") : t("titulo")}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
        <h2 className="salidas-rotulo">{modo === "recientes" ? t("tituloRecientes") : t("titulo")}</h2>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">
          {modo === "recientes" ? t("badgePopulares") : t("badgeTendencias")}
        </span>
      </header>

      {!compacto && (
        <div className="salidas-fila salidas-cabecera" aria-hidden="true">
          <span>{t("colFecha")}</span>
          <span className="col-span-2">{t("colJuego")}</span>
          <span>{t("colPlataformas")}</span>
          <span>{t("colEstado")}</span>
          <span />
        </div>
      )}

      <ol>
        {games.map((game) => {
          const falta = modo === "recientes" ? haceCuanto(game, t) : cuentaAtras(game, t);
          const estudio = game.developer ?? game.publisher;
          const pronto = modo === "proximos" && game.releasePrecision === "day" && !!game.releaseDate && new Date(game.releaseDate).getTime() - Date.now() < 30 * 86_400_000;
          return (
            <li
              key={game.id}
              className={compacto ? "salidas-fila salidas-fila-compacta" : "salidas-fila"}
              onClick={() => router.push(`/juego/${game.igdbId}`)}
            >
              <span className="salidas-paleta" aria-label={game.releaseLabel}>
                {[...fecha(game)].map((c, i) => (
                  <span key={i} className={c === " " ? "salidas-hueco" : "salidas-letra"} aria-hidden="true">
                    {c === " " ? "" : c}
                  </span>
                ))}
              </span>

              <span className="salidas-portada">
                {game.cover && <img loading="lazy" decoding="async" src={game.cover} alt="" className="h-full w-full object-cover" />}
              </span>

              <span className="min-w-0">
                <a
                  href={`/juego/${game.igdbId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block truncate text-[0.9375rem] font-semibold hover:text-[var(--accent-text)]"
                >
                  {game.title}
                </a>
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.6875rem] text-muted">
                  <span className="truncate">{[estudio, game.genres[0]].filter(Boolean).join(" · ")}</span>
                  {game.pegi && <Pegi edad={game.pegi} />}
                </span>
                {!compacto && game.summary && <span className="mt-1 hidden text-[0.75rem] text-muted line-clamp-1 xl:block">{game.summary}</span>}
              </span>

              {!compacto && (
                <span className="salidas-plataformas">
                  {game.platforms.slice(0, 3).map((p) => (
                    <span key={p} className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase text-muted">
                      {p}
                    </span>
                  ))}
                </span>
              )}

              <span className="salidas-estado" data-pronto={pronto || undefined} data-llegado={modo === "recientes" || undefined}>
                {falta ?? t("porConfirmar")}
              </span>

              <span className="salidas-accion" onClick={(e) => e.stopPropagation()}>
                <WishlistButton game={game} initiallyAdded={wishlistedIgdbIds.includes(game.igdbId)} />
              </span>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-[var(--border)] px-5 py-3 text-[0.6875rem] text-muted">{t("avisoIgdb")}</p>
    </section>
  );
}

function WishlistButton(''')
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('ok')
