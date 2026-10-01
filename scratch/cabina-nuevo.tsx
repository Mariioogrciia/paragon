  // Cabina de widgets (rediseño del 1 oct 2026): las mismas secciones de
  // siempre, ahora como módulos de una rejilla de 12 columnas en vez de dos
  // pestañas. Una pareja de módulos de media anchura se convierte en uno a lo
  // ancho si el otro está oculto o vacío, para no dejar huecos en la rejilla.
  const pareja = (a: React.ReactNode, b: React.ReactNode) =>
    a && b ? (
      <>
        <div className="cabina-celda lg:col-span-6">{a}</div>
        <div className="cabina-celda lg:col-span-6">{b}</div>
      </>
    ) : a || b ? (
      <div className="cabina-celda lg:col-span-12">{a || b}</div>
    ) : null;

  const hayHeroe = ver("aUnPaso") && !!nearPlatinumSection;
  const lecturas = [
    { valor: stats.trofeos.toLocaleString(idioma), etiqueta: t("trofeos") },
    { valor: stats.juegos.toLocaleString(idioma), etiqueta: t("juegos") },
    { valor: `${stats.completadoMedio}%`, etiqueta: t("completadoMedio") },
  ];

  const moduloPlatinos = (
    <div
      className="relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] p-5 sm:p-6"
      style={{
        border: "1px solid var(--border)",
        background:
          "radial-gradient(400px 200px at 80% 0%, rgb(var(--accent-rgb) / 0.2), transparent 70%), linear-gradient(165deg, var(--surface-2), var(--surface))",
      }}
    >
      <div className="flex items-center gap-2.5 text-platinum">
        <TrophyIcon grade="platinum" size={22} />
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]">{t("platinos")}</p>
      </div>
      <p className="cabina-cifra font-heading mt-2.5 text-[4.5rem] font-bold leading-[0.85] tabular-nums sm:text-[5.5rem]">{stats.platinos}</p>
    </div>
  );

  const moduloLecturas = (
    <div className="h-full rounded-[20px] border border-border bg-surface p-5">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("lecturas")}</p>
      <dl className="mt-3 divide-y divide-[var(--border)]">
        {lecturas.map((l) => (
          <div key={l.etiqueta} className="flex items-baseline justify-between gap-3 py-2.5">
            <dt className="text-[0.8125rem] font-semibold text-muted">{l.etiqueta}</dt>
            <dd className="font-heading text-[1.75rem] font-bold leading-none tabular-nums">{l.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const ritmo = ver("ritmo") && rachasUsuario && resumen ? { rachas: rachasUsuario, resumen } : null;

  return (
    <div className="space-y-8">
      {cuentaPrivadaSinJuegos && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4">
          <div>
            <p className="text-sm text-foreground">
              {t("cuentaPrivadaAviso", { plataforma: PLATFORM_LABEL[cuentaPrivadaSinJuegos.platform] })}
            </p>
            {cuentaPrivadaSinJuegos.platform === "steam" && (
              <p className="mt-1 text-xs text-muted">{t("cuentaPrivadaSteamDetalle")}</p>
            )}
          </div>
          <Link href="/ajustes/plataformas" className="shrink-0 text-sm font-bold text-[rgb(var(--accent-rgb))] hover:underline">
            {t("cuentaPrivadaAvisoEnlace")}
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 sm:gap-6">
        <div className="min-w-0">
          <h1 className="font-heading text-[clamp(2rem,6vw,2.625rem)] font-bold uppercase leading-none tracking-tight">
            {t("hola", { nombre: player.name })}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-good" aria-hidden="true" />
            {player.accounts.map((a) => a.username).join(" · ")}
            {t("nivelParagon", { nivel: nivelParagon.level })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Link
            href="/ajustes/ocultar"
            className="flex items-center gap-2 rounded-[10px] border border-border bg-[var(--surface)] px-4 py-2.5 text-[0.8125rem] font-semibold text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t("editarPanel")}
          </Link>
          <Link
            href={`/u/${profile.handle}`}
            className="rounded-[10px] border border-border bg-[var(--surface)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            {t("verPerfilCompleto")}
          </Link>
        </div>
      </div>

      <div className="cabina">
        {hayHeroe ? (
          <>
            <div className="cabina-celda lg:col-span-8">{nearPlatinumSection}</div>
            <div className="cabina-pila lg:col-span-4">
              <div className="cabina-celda">{moduloPlatinos}</div>
              <div className="cabina-celda">{moduloLecturas}</div>
            </div>
          </>
        ) : (
          <>
            <div className="cabina-celda lg:col-span-7">{moduloPlatinos}</div>
            <div className="cabina-celda lg:col-span-5">{moduloLecturas}</div>
          </>
        )}

        <div className="cabina-celda lg:col-span-12">
          <TrophyCountRow
            counts={stats.counts}
            summary={t("trofeosEnJuegos", { trofeos: stats.trofeos.toLocaleString(idioma), juegos: stats.juegos })}
            tieneMetales={stats.tieneMetales}
            logrosSinMetal={stats.logrosSinMetal}
          />
        </div>

        {mostrarAtasco && juegoAnclado && (
          <div className="cabina-celda lg:col-span-12">
            <AvisoAtasco gameId={juegoAnclado.id} titulo={juegoAnclado.title} dias={diasAtascado!} handle={profile.handle} />
          </div>
        )}

        {ritmo && (
          <>
            <div className="cabina-celda lg:col-span-4">
              <MonthlySummary meses={mesesHistorico} />
            </div>
            <div className="cabina-celda lg:col-span-8">
              <TrophyHistory meses={mesesHistorico} rachas={ritmo.rachas} resumen={ritmo.resumen} totalPerfil={stats.trofeos} />
            </div>
          </>
        )}

        {pareja(
          ver("misiones") && <WeeklyMissions missions={misiones} />,
          ver("talDia") && efemerides.length > 0 && <TalDiaComoHoy efemerides={efemerides} handle={profile.handle} />,
        )}

        {ver("recomendaciones") && (
          <div className="cabina-celda lg:col-span-12">
            <TrophyRecommendations recommendations={recomendaciones} handle={profile.handle} showcaseTrophies={profile.showcaseTrophies ?? []} />
          </div>
        )}

        {ver("lanzamientos") && (
          <div className="cabina-celda lg:col-span-12">
            <UpcomingGames wishlistedIgdbIds={wishlistIds} />
          </div>
        )}

        {pareja(ver("estadisticas") && <ActivityStats games={games} now={now} />, ver("parados") && abandonadosSection)}

        {ver("recientes") && <div className="cabina-celda lg:col-span-12">{recientesSection}</div>}

        {ver("actividad") && (
          <div className="cabina-celda lg:col-span-12">
            <section>
              <ActivityFeed activities={feed} currentUserId={session.user.id} />
              <p className="mt-3 text-right">
                <Link href="/feed" className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">
                  {t("verComunidad")}
                </Link>
              </p>
            </section>
          </div>
        )}

        <Link
          href="/ajustes/ocultar"
          className="cabina-editar flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-5 py-4 lg:col-span-12"
        >
          <span className="text-[0.8125rem] font-semibold text-muted">{t("cabinaPie", { n: oculto.size })}</span>
          <span className="flex items-center gap-2 text-[0.8125rem] font-bold text-[var(--accent-text)]">
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t("cabinaPieAccion")}
          </span>
        </Link>
      </div>
    </div>
  );
