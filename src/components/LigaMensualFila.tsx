"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/Avatar";

interface LigaUser {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  points: number;
}

/**
 * Fila de la clasificación de la Liga Mensual — la foto lleva al perfil, el
 * resto de la fila lleva a `/ligas/mensual/[userId]` con el desglose de
 * puntos (qué trofeos concretos suman esa cifra). Página dedicada, no un
 * modal: la lista de trofeos de alguien activo puede ser larga de verdad
 * (50+ en un mes), y un cuadro con scroll interno se sentía peor que una
 * página propia con URL compartible y el botón de volver de siempre.
 */
export function LigaMensualFila({ user, index }: { user: LigaUser; index: number }) {
  const t = useTranslations("Perfil.LigasPage");
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/ligas/mensual/${user.userId}`)}
      className={`cursor-pointer border-b border-border transition-colors hover:bg-black/10 ${index < 3 ? "bg-[rgb(var(--accent-rgb)/0.03)]" : ""}`}
    >
      <td className="p-4 text-center">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
            index === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" :
            index === 1 ? "bg-gray-400/20 text-gray-400 border border-gray-400/50" :
            index === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/50" :
            "text-muted bg-surface-2"
          }`}
        >
          {index + 1}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          {user.handle ? (
            <Link
              href={`/u/${user.handle}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              <Avatar src={user.image} name={user.name ?? user.handle ?? "?"} size={36} />
            </Link>
          ) : (
            <Avatar src={user.image} name={user.name ?? "?"} size={36} />
          )}
          <span className="font-bold">{user.name ?? (user.handle ? `@${user.handle}` : t("alguien"))}</span>
        </div>
      </td>
      <td className="p-4 text-right">
        <span className="font-heading text-xl font-bold text-[rgb(var(--accent-rgb))]">
          {user.points.toLocaleString()}
        </span>
      </td>
    </tr>
  );
}
