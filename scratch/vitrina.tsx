        {baldas.length > 0 ? (
          <div className="mt-10 grid gap-10">
            {baldas.map((balda, b) => (
              <div key={b}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-8">
                  {balda.map((rt, i) => (
                    <Link key={`${rt.userId}-${rt.gameId}-${i}`} href={`/u/${rt.handle}`} className="group block rounded-xl p-2 transition-colors duration-200 hover:bg-[var(--surface)]">
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
                  ))}
                </div>
                <div className="landing-repisa mt-2 h-2 rounded-full" aria-hidden="true" />
              </div>
            ))}
          </div>
