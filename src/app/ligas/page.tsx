import { getLigaMensual } from "@/lib/ligas";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { TrophyIcon } from "@/components/TrophyIcon";
import { BackButton } from "@/components/BackButton";

export const metadata = {
  title: "Liga Mensual - Paragon",
};

export default async function LigasPage() {
  const ranking = await getLigaMensual();
  
  const monthName = new Date().toLocaleString("es-ES", { month: "long" });
  const year = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-[800px] px-7 py-12">
      <BackButton fallbackHref="/" />
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2 uppercase tracking-wide flex items-center gap-2 text-[rgb(var(--accent-rgb))]">
          <TrophyIcon grade="platinum" size={32} />
          Liga Mensual de {monthName} {year}
        </h1>
        <p className="text-muted">Compite con el resto de la comunidad cazando trofeos este mes. (Platino: 100, Oro: 50, Plata: 25, Bronce: 10)</p>
      </div>

      {ranking.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm">
          Aún no hay cazadores puntuando este mes. ¡Sé el primero!
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-black/20 text-xs font-bold uppercase tracking-wider text-muted">
                <th className="p-4 w-16 text-center">Pos</th>
                <th className="p-4">Cazador</th>
                <th className="p-4 text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((user, index) => (
                <tr 
                  key={user.userId} 
                  className={`border-b border-border transition-colors hover:bg-black/10 ${index < 3 ? 'bg-[rgb(var(--accent-rgb)/0.03)]' : ''}`}
                >
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                      index === 1 ? 'bg-gray-400/20 text-gray-400 border border-gray-400/50' :
                      index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/50' :
                      'text-muted bg-surface-2'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.image} name={user.name ?? user.handle ?? "?"} size={36} />
                      {user.handle ? (
                        <Link href={`/u/${user.handle}`} className="font-bold hover:text-[rgb(var(--accent-rgb))] transition-colors">
                          {user.name ?? `@${user.handle}`}
                        </Link>
                      ) : (
                        <span className="font-bold">{user.name ?? "Alguien"}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-heading text-xl font-bold text-[rgb(var(--accent-rgb))]">
                      {user.points.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
