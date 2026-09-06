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

/**
 * Manda un aviso a TODOS los navegadores suscritos de un usuario. Si el
 * servidor de push responde que la suscripción ya no existe (410/404 — el
 * caso normal de "desinstaló la PWA" o "borró datos del navegador"), se
 * borra sola de la base en vez de reintentarla para siempre.
 */
export async function enviarPush(
  userId: string,
  payload: { title: string; body: string; url?: string; icon?: string },
): Promise<void> {
  if (!asegurarConfigurado()) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await borrarSuscripcionPush(sub.endpoint);
        } else {
          console.error("[webPush] no se pudo avisar", error);
        }
      }
    }),
  );
}
