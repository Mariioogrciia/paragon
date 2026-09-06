import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

/**
 * Notificaciones push del navegador (Web Push / VAPID) — de verdad, no las
 * de campana de dentro de la app (`lib/notifications.ts`). La diferencia
 * real: estas llegan aunque Paragon no esté abierto en ninguna pestaña
 * (móvil con la app instalada como PWA, o simplemente el navegador
 * cerrado), porque las entrega el sistema operativo, no la propia página.
 *
 * Nada de esto pasa por un tercero (Firebase, OneSignal...): el estándar
 * Web Push habla directo con el navegador de cada persona usando el par de
 * claves VAPID del propio servidor. Una fila de `push_subscription` por
 * navegador suscrito — quien tiene Paragon abierto en el móvil y en el
 * portátil recibe el aviso en los dos.
 */

let configurado = false;

function asegurarConfigurado(): boolean {
  if (configurado) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    // El "mailto" es obligatorio por el estándar (para que un proveedor de
    // push pueda avisar si algo va mal), no un contacto real que se use.
    "mailto:soporte@paragon.app",
    publicKey,
    privateKey,
  );
  configurado = true;
  return true;
}

export async function guardarSuscripcionPush(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    // El mismo endpoint puede volver a suscribirse (el usuario quitó permiso
    // y lo volvió a dar): se actualiza el dueño y las claves en vez de
    // fallar por duplicado.
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
}

export async function borrarSuscripcionPush(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function tieneSuscripcionPush(userId: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);
  return Boolean(fila);
}

export interface ResultadoPush {
  /** Cuántas suscripciones recibieron el aviso de verdad (200/201 del servicio push). */
  enviados: number;
  /** Cuántas suscripciones tenía el usuario en total, antes de descartar las muertas. */
  total: number;
  /**
   * Por qué no llegó a nadie, si `enviados` es 0 — sin esto, "Probar" en
   * /ajustes decía "enviado" pase lo que pasara (faltaran las claves VAPID,
   * no hubiera ninguna suscripción, o fallara el envío): `enviarPush` nunca
   * lanzaba, solo devolvía sin avisar de nada. Confirmado el 6 de
   * septiembre de 2026: el usuario decía "no me salta la notificación" y
   * el botón seguía diciendo que sí, sin ningún error real que mirar.
   */
  error?: string;
}

/**
 * Manda un aviso a TODOS los navegadores suscritos de un usuario. Si el
 * servidor de push responde que la suscripción ya no existe (410/404 — el
 * caso normal de "desinstaló la PWA" o "borró datos del navegador"), se
 * borra sola de la base en vez de reintentarla para siempre.
 */
export async function enviarPush(
  userId: string,
  payload: { title: string; body: string; url?: string; icon?: string },
): Promise<ResultadoPush> {
  if (!asegurarConfigurado()) {
    return { enviados: 0, total: 0, error: "Faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en el servidor." };
  }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) {
    return { enviados: 0, total: 0, error: "No hay ninguna suscripción guardada — activa las notificaciones primero." };
  }

  let enviados = 0;
  let ultimoError: string | undefined;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        enviados++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await borrarSuscripcionPush(sub.endpoint);
        } else {
          console.error("[webPush] no se pudo avisar", error);
          ultimoError = error instanceof Error ? error.message : "Error desconocido enviando el push.";
        }
      }
    }),
  );

  return {
    enviados,
    total: subs.length,
    error: enviados === 0 ? (ultimoError ?? "La suscripción ya no es válida (se ha borrado).") : undefined,
  };
}
