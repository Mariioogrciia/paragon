"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/Avatar";
import { Dorsal } from "@/components/carreras/Dorsal";
import { libreaDe } from "@/lib/librea";

interface LigaUser {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  points: number;
}

/**
 * Fila de la clasificación de la Liga Mensual, como torre de tiempos: dorsal
 * en la librea de cada cazador, puntos y diferencia con el líder. La foto lleva
 * al perfil; el resto de la fila, a `/ligas/mensual/[userId]` con el desglose
 * de puntos (página propia, no un modal: la lista puede ser larga de verdad).
 */
export function LigaMensualFila({ user, index, puntosLider }: { user: LigaUser; index: number; puntosLider: number }) {
  const t = useTranslations("Perfil.LigasPage");
  const locale = useLocale();
  const router = useRouter();
  const nombre = user.name ?? (user.handle ? `@${user.handle}` : t("alguien"));

  return (
    <tr
      onClick={() => router.push(`/ligas/mensual/${user.userId}`)}
      className="carreras-fila cursor-pointer border-b border-border"
      style={{ ["--librea" as string]: libreaDe(user.userId).fondo }}
    >
      <td className="py-3 pl-4 pr-2">
        <Dorsal id={user.userId} texto={`P${index + 1}`} />
      </td>
      <td className="px-2 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {user.handle ? (
            <Link href={`/u/${user.handle}`} onClick={(e) => e.stopPropagation()} className="shrink-0 rounded-full transition-opacity hover:opacity-80">
              <Avatar src={user.image} name={nombre} size={34} />
            </Link>
          ) : (
            <Avatar src={user.image} name={nombre} size={34} />
          )}
          <span className="truncate font-heading text-[0.9375rem] font-bold uppercase tracking-wide">{nombre}</span>
        </div>
      </td>
      <td className="px-2 py-3 text-right">
        <span className="carreras-cifra text-xl text-[var(--accent-text)]">{user.points.toLocaleString(locale)}</span>
      </td>
      <td className="py-3 pl-2 pr-4 text-right">
        <span className="carreras-cifra text-sm text-muted">
          {index === 0 ? t("lider") : `−${(puntosLider - user.points).toLocaleString(locale)}`}
        </span>
      </td>
    </tr>
  );
}
