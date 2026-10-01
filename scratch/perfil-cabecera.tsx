        <div className="relative z-10 mx-auto flex max-w-[1240px] flex-col gap-6 px-7 pb-8 pt-2 md:flex-row md:items-end">
          <CartaHolo className="mx-auto w-full max-w-[300px] shrink-0 md:mx-0">
            <Link href={`/u/${handle}/cv`} className="carta-holo-cara block px-5 pb-5 pt-4" aria-label={t("PerfilPage.hojaDeServicios")}>
              <span className="flex items-center justify-between text-[0.6875rem] font-bold">
                <span className="text-[var(--accent-text)]">{clanMembership ? `[${clanMembership.clan.tag}]` : "PARAGON"}</span>
                <span className="carreras-cifra rounded-full border border-[rgb(var(--accent-rgb)/0.4)] px-2 py-0.5 text-[var(--accent-text)]">
                  {t("PerfilPage.cartaNivel", { n: nivelParagon.level })}
                </span>
              </span>
              <span className="mt-4 flex justify-center">
                <AvatarFrame frame={profile.profileFrame}>
                  <Avatar src={player.avatarUrl} name={player.name} size={104} />
                </AvatarFrame>
              </span>
              <span className="mt-4 block text-center">
                <span className="block truncate font-heading text-2xl font-bold uppercase leading-tight">
                  {efectoNombre ? (
                    <span className="nombre-efecto" style={{ backgroundImage: efectoNombre.degradado }}>
                      {profile.displayName ?? `@${handle}`}
                    </span>
                  ) : (
                    profile.displayName ?? `@${handle}`
                  )}
                </span>
                <span className="mt-1 block truncate text-xs text-muted">@{handle}</span>
              </span>
              <span className="mt-4 grid grid-cols-4 gap-1 border-t border-[var(--border)] pt-3 text-center">
                {[
                  { v: stats.platinos.toLocaleString(locale), l: t("PerfilPage.statPlatinos"), c: "var(--platinum)" },
                  { v: stats.trofeos.toLocaleString(locale), l: t("PerfilPage.statTrofeos") },
                  { v: stats.juegos.toLocaleString(locale), l: t("PerfilPage.statJuegos") },
                  { v: `${stats.completadoMedio}%`, l: t("PerfilPage.statCompletadoMedio") },
                ].map((s) => (
                  <span key={s.l} className="min-w-0">
                    <span className="carreras-cifra block text-lg leading-none" style={s.c ? { color: s.c } : undefined}>{s.v}</span>
                    <span className="mt-1 block truncate text-[0.625rem] font-semibold text-muted">{s.l}</span>
                  </span>
                ))}
              </span>
            </Link>
          </CartaHolo>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {profile.esDesarrollador && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold"
                  style={{ background: "rgb(var(--accent-rgb) / 0.14)", border: "1px solid rgb(var(--accent-rgb) / 0.35)", color: "var(--accent-text)" }}
                  title={t("PerfilPage.desarrolladorTooltip")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  {t("PerfilPage.desarrolladorBadge")}
                </span>
              )}
              <TituloEspecial clave={profile.tituloDesbloqueado} />
              {clanMembership && (
                <Link href={`/clanes/${clanMembership.clan.tag.toLowerCase()}`} className="rounded px-1 text-sm font-bold text-[var(--accent-text)] transition-colors hover:bg-[var(--surface-2)]">
                  [{clanMembership.clan.tag}] {clanMembership.clan.name}
                </Link>
              )}
            </div>
            {player.accounts.length > 0 && <p className="mt-2 text-sm text-muted">{player.accounts.map((a) => a.username).join(" · ")}</p>}
            {profile.statusText && (
              <p className="mt-2 text-sm italic opacity-80" style={{ color: "var(--foreground)" }}>
                &quot;{profile.statusText}&quot;
              </p>
            )}
            {profile.profileTitle && <p className="mt-2 text-sm font-semibold text-[var(--accent-text)]">{profile.profileTitle}</p>}
            {badges.length > 0 && <Badges earnedBadges={badges} />}
            <TrophyCase items={palmares} />
            <ChipTemporada userId={profile.userId} />
            <MedallasTemporada historial={temporadasCerradas} />

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                href={`/u/${handle}/cv`}
                className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold transition-all hover:-translate-y-0.5 hover:border-accent hover:text-[var(--accent-text)]"
                style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                {t("PerfilPage.hojaDeServicios")}
              </Link>
              <CompartirPerfil handle={handle} nombre={player.name} />
              {!esMio && (
                <Link
                  href={`/comparar/${handle}`}
                  className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)]"
                  style={{ background: "var(--accent-grad)" }}
                >
                  {t("PerfilPage.compararConmigo")}
                </Link>
              )}
              {!esMio && session?.user?.id && (
                <FriendRequestButton handle={handle} otherUserId={profile.userId} initialStatus={estadoAmistad} profilePath={`/u/${handle}`} />
              )}
            </div>
          </div>
        </div>
