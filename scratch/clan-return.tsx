  const t = await getTranslations("Perfil");
  const idioma = await getLocale();
  const librea = libreaDe(clan.tag.toUpperCase());

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-4">
            <Dorsal id={clan.tag.toUpperCase()} texto={clan.tag} grande />
            <h1 className="font-heading min-w-0 text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-tight">
              <span className="carreras-titulo">{clan.name}</span>
            </h1>
          </div>
          {clan.description && <p className="mt-4 max-w-xl text-muted">{clan.description}</p>}
          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("ClanPage.xpTotal")}</p>
              <p className="carreras-cifra mt-1 text-3xl text-[var(--accent-text)]">{score.toLocaleString(idioma)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("ClanPage.miembros")}</p>
              <p className="carreras-cifra mt-1 text-3xl">{leaderboard.length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {amIOwner && <InviteFriendsButton clanId={clan.id} friends={invitables} />}
          {userId && <ClanActions clanId={clan.id} amIMember={amIMember} amIOwner={amIOwner} />}
        </div>
      </div>

      <div className="carreras-banda mt-8 rounded-full" style={{ ["--librea" as string]: librea.fondo, ["--librea-tinta" as string]: librea.tinta }} aria-hidden="true" />

      {guerras && (
        <div className="mt-10">
          <GuerraDeClanes
            clanId={clan.id}
            clanTag={clan.tag}
            soyLider={amIOwner}
            abierta={guerras.abierta ? serializar(guerras.abierta) : null}
            historial={guerras.historial.map(serializar)}
            retables={retables}
            duracionDias={DURACION_DIAS}
          />
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <h2 className="font-heading mb-6 text-2xl font-bold uppercase">{t("ClanPage.actividad")}</h2>
          <ClanActivityFeed items={actividad} />
        </div>

        <div className="min-w-0">
          <h2 className="font-heading mb-6 text-2xl font-bold uppercase">{t("ClanPage.ranking", { n: leaderboard.length })}</h2>
          <ol className="overflow-hidden rounded-[18px] border border-border bg-surface">
            {leaderboard.map((m, i) => (
              <li key={m.userId} className="border-b border-border last:border-0">
                <Link
                  href={`/u/${m.handle}`}
                  className="carreras-fila flex items-center gap-3 px-3 py-3"
                  style={{ ["--librea" as string]: libreaDe(m.userId).fondo }}
                >
                  <Dorsal id={m.userId} texto={`P${i + 1}`} />
                  <Avatar src={m.image} name={m.name ?? m.handle ?? "?"} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{m.name || m.handle}</span>
                    <span className="block text-xs text-muted">
                      {m.role === "owner" ? t("ClanPage.lider") : t("ClanPage.miembro")} · {t("ClanPage.trofeos", { n: m.trofeos })}
                    </span>
                  </span>
                  <span className="carreras-cifra shrink-0 text-sm text-[var(--accent-text)]">{m.score.toLocaleString(idioma)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
