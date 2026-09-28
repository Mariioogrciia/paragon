import "server-only";
import { enviarPush } from "@/lib/webPush";
import { enviarPushFcm } from "@/lib/fcm";
import { enviarDmSiActivo } from "@/lib/discordBot";

/**
 * Avisar a un usuario por todo lo que tenga activado: Web Push (navegador o
 * PWA), FCM (app Android) y DM de Discord (si lo activó en Ajustes). Mismo
 * patrón que ya repetían a mano las invitaciones de ligas y clanes; aquí en
 * un solo sitio para las alertas de precio, el resumen semanal y las
 * guerras de clanes. Nunca lanza: un canal caído no tumba a los demás.
 */
export async function avisarUsuario(userId: string, aviso: { titulo: string; texto: string; ruta?: string }): Promise<void> {
  const push = { title: aviso.titulo, body: aviso.texto, url: aviso.ruta };
  const resultados = await Promise.allSettled([
    enviarPush(userId, push),
    enviarPushFcm(userId, push),
    enviarDmSiActivo(userId, aviso),
  ]);
  for (const r of resultados) {
    if (r.status === "rejected") console.error("[avisos]", userId, r.reason);
  }
}
