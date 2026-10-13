import "server-only";
import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { connect, constants, type ClientHttp2Session } from "node:http2";

/**
 * Notificaciones push a la app de iOS (13 oct 2026), directas a APNs — sin
 * el SDK de Firebase en la app. La app manda su token de dispositivo con el
 * prefijo `apns:` al mismo POST /api/mobile/push-token que usa Android, así
 * que se guarda en la misma tabla `fcm_token` sin tocar la base; al enviar,
 * `enviarPushFcm` (lib/fcm.ts) separa los `apns:` y los manda por aquí.
 *
 * Variables del servidor (Apple Developer → Certificates, IDs & Profiles →
 * Keys → una clave con "Apple Push Notifications service"):
 * - `APNS_KEY`: el contenido del .p8 (vale con los saltos de línea como `\n`).
 * - `APNS_KEY_ID`: el Key ID de esa clave (10 caracteres).
 * - `APNS_TEAM_ID`: el Team ID de la cuenta de desarrollador.
 * - `APNS_TOPIC` (opcional): el bundle id de la app, `com.paragon.app.kmp`.
 * - `APNS_SANDBOX=1` (opcional): para builds de desarrollo (Xcode); las de
 *   TestFlight y App Store van por producción.
 * Sin las tres primeras no se envía nada (mismo criterio que FCM y VAPID).
 */

export const PREFIJO_APNS = "apns:";
const TOPIC_POR_DEFECTO = "com.paragon.app.kmp";

export function esTokenApns(token: string): boolean {
  return token.startsWith(PREFIJO_APNS);
}

export interface AvisoApns {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
}

/** El JSON que entiende APNs: `aps` para el sistema y `url` para la app al tocarlo. */
export function cuerpoApns(aviso: AvisoApns): string {
  return JSON.stringify({
    aps: { alert: { title: aviso.title, body: aviso.body }, sound: "default" },
    ...(aviso.url ? { url: aviso.url } : {}),
  });
}

/** APNs contesta 400 BadDeviceToken / 410 Unregistered cuando el token ya no vale: se borra. */
export function tokenCaducado(status: number, motivo: string | undefined): boolean {
  return status === 410 || (status === 400 && (motivo === "BadDeviceToken" || motivo === "DeviceTokenNotForTopic"));
}

interface Config {
  clave: KeyObject;
  keyId: string;
  teamId: string;
  topic: string;
  host: string;
}

let config: Config | null | undefined;

function leerConfig(): Config | null {
  if (config !== undefined) return config;
  const p8 = process.env.APNS_KEY?.replace(/\\n/g, "\n");
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  if (!p8 || !keyId || !teamId) {
    config = null;
    return config;
  }
  try {
    config = {
      clave: createPrivateKey(p8),
      keyId,
      teamId,
      topic: process.env.APNS_TOPIC?.trim() || TOPIC_POR_DEFECTO,
      host: process.env.APNS_SANDBOX === "1" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com",
    };
  } catch (error) {
    console.error("[apns] APNS_KEY no es una clave .p8 válida", error);
    config = null;
  }
  return config;
}

function base64url(texto: string | Buffer): string {
  return Buffer.from(texto).toString("base64url");
}

// Apple pide renovar el JWT cada 20-60 minutos, y rechaza renovarlo demasiado a menudo.
let jwt: { valor: string; creado: number } | null = null;

function tokenAutorizacion(c: Config): string {
  const ahora = Math.floor(Date.now() / 1000);
  if (jwt && ahora - jwt.creado < 40 * 60) return jwt.valor;
  const cabecera = base64url(JSON.stringify({ alg: "ES256", kid: c.keyId }));
  const datos = base64url(JSON.stringify({ iss: c.teamId, iat: ahora }));
  const firma = sign("sha256", Buffer.from(`${cabecera}.${datos}`), { key: c.clave, dsaEncoding: "ieee-p1363" });
  jwt = { valor: `${cabecera}.${datos}.${base64url(firma)}`, creado: ahora };
  return jwt.valor;
}

function enviarUno(sesion: ClientHttp2Session, c: Config, token: string, cuerpo: string): Promise<{ status: number; motivo?: string }> {
  return new Promise((resolve, reject) => {
    const peticion = sesion.request({
      [constants.HTTP2_HEADER_METHOD]: "POST",
      [constants.HTTP2_HEADER_PATH]: `/3/device/${token}`,
      authorization: `bearer ${tokenAutorizacion(c)}`,
      "apns-topic": c.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let respuesta = "";
    peticion.setEncoding("utf8");
    peticion.on("response", (cabeceras) => {
      status = Number(cabeceras[constants.HTTP2_HEADER_STATUS] ?? 0);
    });
    peticion.on("data", (trozo: string) => {
      respuesta += trozo;
    });
    peticion.on("end", () => {
      let motivo: string | undefined;
      try {
        motivo = respuesta ? (JSON.parse(respuesta) as { reason?: string }).reason : undefined;
      } catch {
        motivo = undefined;
      }
      resolve({ status, motivo });
    });
    peticion.on("error", reject);
    peticion.end(cuerpo);
  });
}

/**
 * Manda el aviso a esos tokens (con o sin el prefijo `apns:`) y devuelve los
 * que APNs dice que ya no valen, para que quien llama los borre.
 */
export async function enviarApns(tokens: string[], aviso: AvisoApns): Promise<string[]> {
  const c = leerConfig();
  if (!c || tokens.length === 0) return [];

  const cuerpo = cuerpoApns(aviso);
  const caducados: string[] = [];
  const sesion = connect(c.host);
  sesion.on("error", (error) => console.error("[apns] conexión", error));
  try {
    await Promise.all(
      tokens.map(async (guardado) => {
        const token = esTokenApns(guardado) ? guardado.slice(PREFIJO_APNS.length) : guardado;
        if (!/^[0-9a-f]{32,200}$/i.test(token)) {
          caducados.push(guardado);
          return;
        }
        try {
          const { status, motivo } = await enviarUno(sesion, c, token, cuerpo);
          if (tokenCaducado(status, motivo)) caducados.push(guardado);
          else if (status !== 200) console.error("[apns] no se pudo avisar", status, motivo);
        } catch (error) {
          console.error("[apns] no se pudo avisar", error);
        }
      }),
    );
  } finally {
    sesion.close();
  }
  return caducados;
}
