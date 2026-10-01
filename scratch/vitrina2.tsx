        {rareTrophies.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-y-10 sm:grid-cols-3">
            {rareTrophies.map((rt, i) => {
              // Solo filas completas: 2 por balda en móvil, 3 en escritorio (sin huérfanos ni huecos).
              const n = rareTrophies.length;
              const enMovil = n < 2 || i < n - (n % 2);
              const enEscritorio = n < 3 || i < n - (n % 3);
              return (
                <div key={`${rt.userId}-${rt.gameId}-${i}`} className={`${enMovil ? "block" : "hidden"} ${enEscritorio ? "sm:block" : "sm:hidden"}`}>
                  <Link href={`/u/${rt.handle}`} className="group mx-1 block rounded-xl p-2 transition-colors duration-200 hover:bg-[var(--surface)] sm:mx-3">
                    <span className="landing-nicho flex h-28 items-end justify-center rounded-t-xl pb-3 sm:h-36">
                      <span className="transition-transform duration-300 group-hover:-translate-y-1">
                        <TrophyPhoto trophy={{ iconUrl: rt.trophyIconUrl, grade: rt.grade }} size={72} />
                      </span>
                    </span>
                    <span className="block border-t border-[var(--border)] pt-3">
                      <span className="block truncate font-heading text-[0.9375rem] font-bold">{rt.trophyName}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{rt.gameTitle}</span>
                      <span className="mt-2 block text-[0.6875rem] font-bold tabular-nums text-[var(--accent-text)]">
                        {t("landing.cartelaRareza", { percent: rt.rarityPercent.toLocaleString(idioma, { maximumFractionDigits: 1 }) })}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-muted">
                        {t("landing.cartelaPor", { handle: rt.handle ?? "?" })} · {haceTiempo(rt.earnedAt, idioma)}
                      </span>
                    </span>
                  </Link>
                  <div className="landing-repisa mt-2 h-2" aria-hidden="true" />
                </div>
              );
            })}
          </div>
