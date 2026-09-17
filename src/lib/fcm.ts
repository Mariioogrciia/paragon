import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fcmTokens } from "@/db/schema";

/**
 * Notificaciones push a la app NATIVA de Android (Firebase Cloud Messaging)
 * — el equivalente de `lib/webPush.ts`, pero para quien no tiene la web
 * abierta ni la PWA instalada, sino la app de verdad (ver
 * android/app/src/main/java/com/paragon/app). Web Push (VAPID) no puede
 * entregar nada ahí: solo habla con navegadores.
 *
 * Necesita `FIREBASE_SERVICE_ACCOUNT_KEY` en el servidor — el JSON entero de
 * la cuenta de servicio (Firebase console → ⚙️ Configuración del proyecto →
 * Cuentas de servicio → Generar nueva clave privada), pegado tal cual como
 * variable de entorno. Sin eso, `enviarPushFcm` no hace nada (mismo criterio
 * que `enviarPush` sin las claves VAPID) — no rompe nada para quien no lo
 * tenga configurado.
 */

let app: App | null | undefined;

function asegurarApp(): App | null {
  if (app !== undefined) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    app = null;
    return app;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error("[fcm] FIREBASE_SERVICE_ACCOUNT_KEY no es un JSON válido", error);
    app = null;
  }

  return app;
}

/** El propio token puede repetirse si Firebase lo reasigna a otro usuario tras un logout/login. */
export async function guardarTokenFcm(userId: string, token: string): Promise<void> {
  await db
    .insert(fcmTokens)
    .values({ userId, token })
    .onConflictDoUpdate({ target: fcmTokens.token, set: { userId } });
}

export async function borrarTokenFcm(token: string): Promise<void> {
  await db.delete(fcmTokens).where(eq(fcmTokens.token, token));
}

/**
 * Manda un aviso a todos los dispositivos Android registrados de un
 * usuario. Igual que `enviarPush`: si FCM dice que el token ya no vale (la
 * app se desinstaló, o Firebase lo rotó), se borra solo en vez de
 * reintentarlo para siempre.
 */
export async function enviarPushFcm(
  userId: string,
  payload: { title: string; body: string; url?: string; imageUrl?: string },
): Promise<void> {
  const firebaseApp = asegurarApp();
  if (!firebaseApp) return;

  const tokens = await db.select({ token: fcmTokens.token }).from(fcmTokens).where(eq(fcmTokens.userId, userId));
  if (tokens.length === 0) return;

  const messaging = getMessaging(firebaseApp);

  await Promise.all(
    tokens.map(async ({ token }) => {
      try {
        await messaging.send({
          token,
          // `imageUrl` es lo que convierte esto en una notificación "rica"
          // (idea #23 del brainstorm de v1.0) — con la app en segundo plano,
          // Play Services ya la pinta como imagen grande él solo; con la app
          // en primer plano, `ParagonFirebaseMessagingService.kt` la carga a
          // mano y usa `BigPictureStyle` (Firebase no hace nada automático
          // en ese caso, ver su documentación de "foreground notifications").
          notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl },
          data: payload.url ? { url: payload.url } : undefined,
        });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
          await borrarTokenFcm(token);
        } else {
          console.error("[fcm] no se pudo avisar", error);
        }
      }
    }),
  );
}
