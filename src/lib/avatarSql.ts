import "server-only";
import { sql, type AnyColumn } from "drizzle-orm";
import { platformAccounts } from "@/db/schema";

/**
 * Fragmento SQL para la foto de perfil resuelta — PSN primero, luego
 * cualquier otra cuenta vinculada con avatar, y solo si no hay ninguna la
 * imagen genérica de la cuenta. Para usar dentro de un SELECT sobre una fila
 * de `user`, cuando hay que resolver el avatar de VARIOS usuarios a la vez
 * (una lista, un ranking) y no se puede cargar cada `ProfileRow` uno a uno.
 *
 * Es la misma lógica que `resolveAvatarUrl` (profiles.ts), en SQL en vez de
 * en TypeScript. Antes cada consulta que necesitaba el avatar de otra gente
 * (reseñas, ligas, feed de actividad) leía `user.image` a pelo, así que
 * cualquiera con PSN vinculado pero sin imagen de login salía sin foto ahí,
 * aunque su perfil sí la tuviera.
 */
export function avatarUrlSql(userIdColumn: AnyColumn, imageColumn: AnyColumn) {
  return sql<string | null>`
    coalesce(
      (select ${platformAccounts.avatarUrl} from ${platformAccounts}
        where ${platformAccounts.userId} = ${userIdColumn} and ${platformAccounts.platform} = 'psn'
        limit 1),
      (select ${platformAccounts.avatarUrl} from ${platformAccounts}
        where ${platformAccounts.userId} = ${userIdColumn} and ${platformAccounts.avatarUrl} is not null
        limit 1),
      ${imageColumn}
    )
  `;
}
