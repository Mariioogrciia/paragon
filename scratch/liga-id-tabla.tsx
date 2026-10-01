      <div className="mb-10 overflow-x-auto rounded-[18px] border border-border bg-surface">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
              <th className="w-20 py-3 pl-4 pr-2">{t("LigaPage.colPos")}</th>
              <th className="px-2 py-3">{t("LigaPage.colCazador")}</th>
              <th className="px-2 py-3 text-right">{t("LigaPage.colPuntos")}</th>
              <th className="w-24 py-3 pl-2 pr-4 text-right">{t("LigaPage.colDif")}</th>
              {isOwner && <th className="w-20 p-3" />}
            </tr>
          </thead>
          <tbody>
            {league.standings.map((member, index) => {
              const nombre = member.name ?? (member.handle ? `@${member.handle}` : t("LigaPage.alguien"));
              return (
                <tr key={member.userId} className="carreras-fila border-b border-border" style={{ ["--librea" as string]: libreaDe(member.userId).fondo }}>
                  <td className="py-3 pl-4 pr-2">
                    <Dorsal id={member.userId} texto={`P${index + 1}`} />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={member.image} name={nombre} size={34} />
                      {member.handle ? (
                        <Link href={`/u/${member.handle}`} className="truncate rounded font-heading text-[0.9375rem] font-bold uppercase tracking-wide transition-colors hover:text-[var(--accent-text)]">
                          {nombre}
                        </Link>
                      ) : (
                        <span className="truncate font-heading text-[0.9375rem] font-bold uppercase tracking-wide">{nombre}</span>
                      )}
                      {member.userId === league.ownerId && (
                        <span className="shrink-0 text-[0.625rem] font-bold uppercase tracking-wide text-muted">{t("LigaPage.dueño")}</span>
                      )}
                      {/* `movimiento` sale de la foto semanal del cron (/api/cron/league-snapshot):
                          null hasta que corra para esta liga o para alguien recién unido. */}
                      {member.movimiento != null && member.movimiento !== 0 && (
                        <span className="inline-flex shrink-0 items-center text-[0.6875rem] font-bold tabular-nums" style={{ color: member.movimiento > 0 ? "#45d483" : "#ff6b6b" }}>
                          {member.movimiento > 0 ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                          {Math.abs(member.movimiento)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <span className="carreras-cifra text-xl text-[var(--accent-text)]">{member.points.toLocaleString(idioma)}</span>
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right">
                    <span className="carreras-cifra text-sm text-muted">
                      {index === 0 ? t("LigaPage.lider") : `−${(league.standings[0].points - member.points).toLocaleString(idioma)}`}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="p-3 text-right">
                      {member.userId !== league.ownerId && (
                        <ConfirmForm
                          action={removeLeagueMemberAction}
                          hidden={{ leagueId: league.id, targetUserId: member.userId }}
                          title={t("LigaPage.quitarLiga")}
                          message={t("LigaPage.quitarLigaMensaje", { nombre: member.name ?? member.handle ?? t("LigaPage.alguien") })}
                          confirmLabel={t("LigaPage.quitarConfirmar")}
                          triggerClassName="text-xs font-semibold text-muted hover:text-danger"
                        >
                          {t("LigaPage.quitar")}
                        </ConfirmForm>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
