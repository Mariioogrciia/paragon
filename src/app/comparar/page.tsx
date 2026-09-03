import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { getLibrary, getProfileByHandle, getProfileByUserId } from "@/lib/profiles";
import { sharedGames } from "@/lib/stats";
import { PLATFORM_LABEL } from "@/lib/types";
import { CompararFiltrable } from "@/components/CompararFiltrable";

export const metadata = { title: "Comparar en grupo · Paragon" };

/**
 * Comparativa de grupo: tú y varios amigos a la vez, no de uno en uno.
 *
 * `sharedGames` (lib/stats.ts) ya aceptaba una lista de bibliotecas de
 * cualquier tamaño — lo único que faltaba era una pantalla que lo usara con
 * más de dos. La comparativa 1 a 1 de `/comparar/[handle]` (con la carrera
 * trofeo a trofeo, "quién lo sacó antes") se queda como está: esa parte sí
 * es inherentemente de a dos, y para dos personas sigue siendo la mejor
 * vista.
 */
export default async function CompararGrupoPage({
  searchParams,
}: {
  searchParams: Promise<{ con?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const { con } = await searchParams;
  const handlesPedidos = [...new Set((Array.isArray(con) ? con : con ? [con] : []).filter(Boolean))];

  if (handlesPedidos.length === 0) redirect("/amigos");
  // Con una sola persona, la comparativa 1 a 1 (con la carrera de trofeos)
  // dice más que esta.
  if (handlesPedidos.length === 1) redirect(`/comparar/${handlesPedidos[0]}`);

  const mio = await getProfileByUserId(session.user.id);
  if (!mio || mio.accounts.length === 0) redirect("/bienvenida");

  const perfiles = await Promise.all(handlesPedidos.map((h) => getProfileByHandle(h)));

  const encontrados = perfiles.filter((p): p is NonNullable<typeof p> => p !== null && p.accounts.length > 0);
  const noEncontrados = handlesPedidos.filter((h, i) => !perfiles[i]);
  const sinBiblioteca = handlesPedidos.filter((h, i) => perfiles[i] && perfiles[i]!.accounts.length === 0);

  const participantes = [mio, ...encontrados];
  const librerias = await Promise.all(participantes.map((p) => getLibrary(p)));
  const comunes = sharedGames(librerias);

  // Total de platinos/trofeos, pero SOLO de lo que hay en común: sumar la
  // biblioteca entera mezclaría a quien lleva diez años jugando con quien
  // acaba de entrar, que es justo lo que el resto de la app evita.
  const totales = participantes.map((_, i) => {
    let platinos = 0;
    let trofeos = 0;
    for (const juego of comunes) {
      platinos += juego.progress[i].platinumEarned ? 1 : 0;
      trofeos += juego.progress[i].earned;
    }
    return { platinos, trofeos };
  });

  return (
    <div>
      <Link href="/amigos" className="text-xs font-semibold text-muted hover:text-foreground">
        ← Volver a Amigos
      </Link>

      <h1 className="font-heading mt-3 text-[42px] font-bold uppercase leading-none">Comparativa de grupo</h1>
      <p className="mt-2.5 text-[15px] text-muted">
        Solo los juegos que tenéis todos, uno al lado del otro.
      </p>

      {(noEncontrados.length > 0 || sinBiblioteca.length > 0) && (
        <p className="mt-3 text-xs text-muted">
          {noEncontrados.length > 0 && `No existe @${noEncontrados.join(", @")}. `}
          {sinBiblioteca.length > 0 && `@${sinBiblioteca.join(", @")} no ha vinculado ninguna cuenta todavía.`}
        </p>
      )}

      <div className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {participantes.map((p, i) => (
          <div
            key={p.userId}
            className="flex items-center gap-3 rounded-2xl p-3.5"
            style={
              p.userId === mio.userId
                ? { border: "1px solid #2f5a8f", background: "linear-gradient(165deg, #14243a, #0d131c)" }
                : { border: "1px solid var(--border)", background: "var(--surface)" }
            }
          >
            <Avatar src={librerias[i].player.avatarUrl} name={librerias[i].player.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">
                {librerias[i].player.name}
                {p.userId === mio.userId && <span className="text-muted"> (tú)</span>}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {p.handle && `@${p.handle}`}
                {p.handle && p.accounts.length > 0 && " · "}
                {p.accounts.map((a) => PLATFORM_LABEL[a.platform]).join(" · ")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {comunes.length === 0 ? (
        <p className="mt-9 rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Ningún juego en común entre todo el grupo.
        </p>
      ) : (
        <>
          <div className="mt-9 overflow-x-auto">
            <div
              className="grid min-w-[500px] items-center gap-2.5"
              style={{ gridTemplateColumns: `220px repeat(${participantes.length}, 100px)` }}
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                Totales, de lo en común
              </span>
              {totales.map((t, i) => (
                <div key={participantes[i].userId} className="text-center">
                  <p className="font-heading text-lg font-bold text-platinum">{t.platinos}</p>
                  <p className="text-[10px] text-muted">{t.trofeos} trofeos</p>
                </div>
              ))}
            </div>
          </div>

          <CompararFiltrable
            comunes={comunes}
            participantes={participantes.map((p, i) => ({
              userId: p.userId,
              nombre: librerias[i].player.name,
              esMio: p.userId === mio.userId,
            }))}
          />
        </>
      )}
    </div>
  );
}
