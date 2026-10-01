async function Landing() {
  const idioma = await getLocale();
  // Cuatro consultas independientes entre sí: en paralelo, no en cascada —
  // esta es la página pública más visitada (sin sesión), así que un
  // waterfall aquí pega directo al TTFB de todo el tráfico no autenticado.
  const [globalStats, topHunters, rareTrophies, recentPlatinums, t] = await Promise.all([
    getGlobalStats(),
    getTopHunters(5),
    getRarestTrophiesThisWeek(6),
    getRecentPlatinumActivity(10),
    getTranslations("Shell.Home"),
  ]);

  const pasos = (["p1", "p2", "p3", "p4"] as const).map((clave) => ({
    clave,
    titulo: t(`landing.pasos.${clave}.titulo`),
    cuerpo: t(`landing.pasos.${clave}.cuerpo`),
  }));
  // De tres en tres: cada balda de la vitrina.
  const baldas = [rareTrophies.slice(0, 3), rareTrophies.slice(3, 6)].filter((b) => b.length > 0);
  const numero = (n: number) => n.toLocaleString(idioma);

  return (
    <div>
      <section className="relative pt-8 text-center sm:pt-14">
        <div className="landing-hero-halo pointer-events-none absolute inset-x-0 -top-24 bottom-0 -z-10" aria-hidden="true" />

        <h1 className="font-heading mx-auto max-w-[15ch] text-[clamp(2.75rem,11vw,6rem)] font-bold uppercase leading-[0.95] tracking-[-0.025em] [overflow-wrap:anywhere]">
          {t("heroTitleLine1")} <span className="text-platinum">{t("heroTitleLine2")}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[60ch] text-base leading-relaxed text-muted sm:text-lg">{t("heroDescription")}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/entrar"
            className="flex flex-col items-center rounded-xl px-7 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: "var(--accent-grad)", boxShadow: "0 14px 32px -12px rgb(var(--accent-rgb) / 0.7)" }}
          >
            <span className="text-[0.9375rem] font-bold text-background">{t("ctaEmpezar")}</span>
            <span className="mt-0.5 text-[0.6875rem] font-semibold text-background/80">{t("ctaEmpezarSubtext")}</span>
          </Link>
          <Link
            href="/ejemplo"
            className="flex items-center gap-2 rounded-xl border border-border bg-[var(--surface)] px-6 py-4 text-[0.9375rem] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-[var(--surface-2)]"
          >
            <Eye size={17} className="text-muted" aria-hidden="true" />
            {t("ctaVerEjemplo")}
          </Link>
        </div>

        <ul className="mx-auto mt-6 flex max-w-[44rem] flex-col items-center gap-2 text-[0.8125rem] text-muted sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6">
          <li className="flex items-center gap-2">
            <ShieldCheck size={15} className="shrink-0 text-good" aria-hidden="true" />
            {t("soloIdPublico")}
          </li>
          <li className="flex items-center gap-2">
            <Gift size={15} className="shrink-0 text-good" aria-hidden="true" />
            {t("gratisSinLimite")}
          </li>
        </ul>

        {topHunters.length > 0 && (
          <div className="mt-7 flex items-center justify-center gap-3">
            <div className="flex -space-x-2.5">
              {topHunters.slice(0, 5).map((hunter) => (
                <span key={hunter.userId} className="block rounded-full" style={{ border: "2px solid var(--background)" }}>
                  <Avatar src={hunter.image} name={nombrePublico(hunter.name, hunter.handle)} size={30} />
                </span>
              ))}
            </div>
            <p className="text-left text-[0.8125rem] font-semibold text-muted">{t("socialProofTexto")}</p>
          </div>
        )}
      </section>

      <Convergencia />

      {recentPlatinums.length > 0 && (
        <div className="relative -mx-4 mt-20 overflow-hidden border-y border-border px-4 py-3 sm:mx-0 sm:px-0">
          <div className="flex w-max items-center gap-10 animate-marquee hover:[animation-play-state:paused]" style={{ animationDuration: "40s" }}>
            {[...recentPlatinums, ...recentPlatinums].map((p, i) => (
              <div key={`${p.userId}-${p.gameTitle}-${i}`} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[0.8125rem]" aria-hidden={i >= recentPlatinums.length || undefined}>
                <TrophyIcon grade="platinum" size={16} />
                <span className="font-semibold text-platinum">{nombrePublico(p.name, p.handle)}</span>
                <span className="text-muted">{t("tickerAcabaDePlatinar")}</span>
                <span className="font-semibold">{p.gameTitle}</span>
                <span className="text-[0.6875rem] text-muted">· {haceTiempo(p.createdAt, idioma)}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        </div>
      )}

      <section className="pt-20 sm:pt-24" aria-labelledby="vitrina-titulo">
        <div className="max-w-[46rem]">
          <h2 id="vitrina-titulo" className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-[1.05] tracking-[-0.015em]">
            {t("rarosTitulo")}
          </h2>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted">{t("rarosDescripcion")}</p>
          {globalStats.trofeos > 0 && globalStats.juegos > 0 && (
            <p className="mt-2 text-sm text-muted">
              {t("landing.statsLinea", {
                trofeos: numero(globalStats.trofeos),
                juegos: numero(globalStats.juegos),
                platinos: numero(globalStats.platinos),
              })}
            </p>
          )}
        </div>

        {baldas.length > 0 ? (
          <div className="mt-8 grid gap-4">
            {baldas.map((balda, b) => (
              <div key={b} className="landing-balda grid grid-cols-1 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-3">
                {balda.map((rt, i) => (
                  <Link
                    key={`${rt.userId}-${rt.gameId}-${i}`}
                    href={`/u/${rt.handle}`}
                    className="group flex items-center gap-3.5 rounded-xl p-3 transition-colors duration-200 hover:bg-[var(--surface-2)]"
                  >
                    <span className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                      <TrophyPhoto trophy={{ iconUrl: rt.trophyIconUrl, grade: rt.grade }} size={56} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-bold">{rt.trophyName}</span>
                      <span className="block truncate text-xs text-muted">{rt.gameTitle}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem]">
                        <span className="rounded-md border border-[rgb(var(--accent-rgb)/0.35)] px-1.5 py-0.5 font-bold tabular-nums text-[var(--accent-text)]">
                          {t("landing.cartelaRareza", { percent: rt.rarityPercent.toLocaleString(idioma, { maximumFractionDigits: 1 }) })}
                        </span>
                        <span className="truncate text-muted">{t("landing.cartelaPor", { handle: rt.handle ?? "?" })}</span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : recentPlatinums.length > 0 ? (
          <div className="mt-8">
            <p className="text-sm text-muted">{t("landing.vitrinaVacia")}</p>
            <div className="landing-balda mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-3">
              {recentPlatinums.slice(0, 6).map((p, i) => (
                <Link
                  key={`${p.userId}-${p.gameTitle}-${i}`}
                  href={p.handle ? `/u/${p.handle}` : "/"}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-[var(--surface-2)]"
                >
                  <TrophyIcon grade="platinum" size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{p.gameTitle}</span>
                    <span className="block truncate text-xs text-muted">
                      {nombrePublico(p.name, p.handle)} · {haceTiempo(p.createdAt, idioma)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-10 pt-20 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-start" aria-labelledby="ruta-titulo">
        <div>
          <h2 id="ruta-titulo" className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-[1.05] tracking-[-0.015em]">
            {t("landing.rutaTitulo")}
          </h2>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted">{t("landing.rutaDescripcion")}</p>

          <ol className="landing-ruta relative mt-8 grid gap-7">
            {pasos.map((paso, i) => (
              <li key={paso.clave} className="relative flex gap-5">
                <span className="font-heading relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-background text-sm font-bold text-[var(--accent-text)]">
                  {i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="font-heading text-lg font-bold leading-tight">{paso.titulo}</h3>
                  <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted">{paso.cuerpo}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link href="/como-funciona" className="mt-8 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-bold text-[var(--accent-text)] transition-colors hover:bg-[var(--surface-2)] hover:underline">
            {t("verTodoComoFunciona").replace(/\s*→\s*$/, "")}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="relative rounded-3xl border border-border bg-[var(--surface)] p-5 sm:p-6 lg:sticky lg:top-24" style={{ boxShadow: "0 24px 50px -28px rgb(0 0 0 / 0.6)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted">{t("platinoMasCercano")}</p>
              <p className="font-heading mt-1 text-xl font-bold">Elden Ring</p>
            </div>
            <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[0.6875rem] font-semibold text-muted">{t("landing.ejemplo")}</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)]">
            <Route size={14} aria-hidden="true" />
            {t("calloutRuta")}
          </p>
          <ul className="mt-4 grid gap-2">
            {SAMPLE_NEXT.map((s, i) => (
              <li key={s.name} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                <TrophyTile grade={s.grade} size={30} />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{s.name}</span>
                {i === 0 && (
                  <span className="hidden shrink-0 rounded-full bg-[rgb(var(--accent-rgb)/0.14)] px-2 py-0.5 text-[0.625rem] font-bold text-[var(--accent-text)] sm:inline">
                    {t("calloutRareza")}
                  </span>
                )}
                <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: GRADE_ACCENT[s.grade] }}>
                  {s.rarity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <LandingThemeSwitcher />

      {topHunters.length > 0 && (
        <section className="pt-20 sm:pt-24" aria-labelledby="fama-titulo">
          <h2 id="fama-titulo" className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-[1.05] tracking-[-0.015em]">
            {t("muroFamaTitulo")}
          </h2>
          <p className="mt-3 max-w-[60ch] text-base text-muted">{t("muroFamaDescripcion")}</p>

          <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {topHunters.map((hunter, i) => (
              <li key={hunter.userId}>
                <Link
                  href={`/u/${hunter.handle}`}
                  className="group relative flex h-full flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[rgb(var(--accent-rgb)/0.5)]"
                  style={
                    i === 0
                      ? { borderColor: "rgb(226 181 62 / 0.45)", background: "linear-gradient(180deg, rgb(226 181 62 / 0.08), var(--surface) 60%)" }
                      : { borderColor: "var(--border)", background: "var(--surface)" }
                  }
                >
                  <span
                    className="font-heading absolute left-3 top-3 text-sm font-bold tabular-nums"
                    style={{ color: i === 0 ? "#e2b53e" : "var(--muted)" }}
                  >
                    {i + 1}
                  </span>
                  <Avatar src={hunter.image} name={nombrePublico(hunter.name, hunter.handle)} size={60} />
                  <span className="min-w-0 max-w-full">
                    <span className="block truncate text-[0.9375rem] font-bold">{nombrePublico(hunter.name, hunter.handle)}</span>
                    <span className="block truncate text-xs text-muted">@{hunter.handle}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrophyIcon grade="platinum" size={16} />
                    <span className="font-heading text-lg font-bold tabular-nums text-platinum">{hunter.platinos}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="pt-20 sm:pt-24">
        <div className="relative overflow-hidden rounded-3xl p-7 sm:p-12" style={{ border: "1px solid #36393f", background: "linear-gradient(145deg, #2f3136, #202225)" }}>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 text-sm font-bold" style={{ color: "#8b95f5" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                {t("botDiscordBadge")}
              </span>
              <h2 className="font-heading text-[clamp(1.625rem,4vw,2rem)] font-bold leading-tight text-white">{t("botDiscordTitulo")}</h2>
              <p className="mt-4 max-w-[55ch] text-base text-[#c4c6ca]">{t("botDiscordDesc")}</p>
              <ul className="mt-6 space-y-3 text-sm text-[#c4c6ca]">
                <li className="flex flex-wrap items-baseline gap-x-2.5"><code className="font-semibold text-[#8b95f5]">/perfil</code> {t("botDiscordCmd1")}</li>
                <li className="flex flex-wrap items-baseline gap-x-2.5"><code className="font-semibold text-[#8b95f5]">/comparar</code> {t("botDiscordCmd2")}</li>
                <li className="flex flex-wrap items-baseline gap-x-2.5"><code className="font-semibold text-[#8b95f5]">/platino</code> {t("botDiscordCmd3")}</li>
              </ul>
            </div>

            <div className="relative rounded-lg border border-white/5 p-4 shadow-xl" style={{ background: "#36393f" }} aria-hidden="true">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5865F2]">
                  <TrophyIcon grade="platinum" size={24} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-white">Paragon Bot</span>
                    <span className="rounded bg-[#5865F2] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">BOT</span>
                    <span className="text-xs text-[#a3a6aa]">{t("landing.discordHora")}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#dcddde]">
                    <span className="font-semibold text-white">@hunter</span> {t("landing.discordAnuncio")} <span className="font-semibold text-white">Elden Ring</span>
                  </p>
                  <div className="mt-3 rounded border-l-4 border-[#5865F2] bg-[#2f3136] p-4">
                    <div className="flex items-start gap-4">
                      <img loading="lazy" decoding="async" src="https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg" alt="" className="h-24 w-16 rounded object-cover shadow-md" />
                      <div>
                        <p className="text-base font-bold text-[#00aff4]">Elden Ring</p>
                        <p className="mt-1.5 text-sm text-[#dcddde]">
                          {t("landing.discordRareza")}: <span className="font-semibold text-[#f87171]">4,2 %</span>
                        </p>
                        <p className="mt-1 text-xs text-[#b9bbbe]">{t("landing.discordDificultad", { n: 8 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CardBuilder games={SAMPLE_SHELF} />

      <section className="py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--accent-rgb)/0.35)] px-7 py-12 text-center sm:px-16 sm:py-16" style={{ background: "linear-gradient(180deg, rgb(var(--accent-rgb) / 0.14), var(--surface) 70%)" }}>
          <h2 className="font-heading mx-auto max-w-[18ch] text-[clamp(2.25rem,7vw,3.75rem)] font-bold uppercase leading-[0.98] tracking-[-0.02em] [text-wrap:balance]">
            {t("ctaFinalTitulo")}
          </h2>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/entrar"
              className="rounded-xl px-8 py-4 text-[0.9375rem] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
              style={{ background: "var(--accent-grad)", boxShadow: "0 14px 32px -12px rgb(var(--accent-rgb) / 0.7)" }}
            >
              {t("ctaFinalBoton")}
            </Link>
            <span className="text-sm text-muted">{t("ctaFinalNota")}</span>
          </div>
        </div>
      </section>

      <FAQSection />
    </div>
  );
}

