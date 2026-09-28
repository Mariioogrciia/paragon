import "server-only";
import path from "path";
import { createClient } from "@supabase/supabase-js";

/**
 * Subida de avatar/banner a Supabase Storage — compartida por
 * `/api/upload` (web) y `/api/mobile/profile/avatar` (Android), que antes
 * repetían la misma lógica cada una por su lado.
 *
 * Endurecida en la auditoría del 25 sept 2026. Antes:
 *   - El `contentType` guardado era el que mandaba el cliente: un `.png`
 *     declarado como `text/html` quedaba servido como HTML desde nuestro
 *     dominio de Supabase.
 *   - Solo se miraba la extensión del nombre, no el contenido.
 *   - Sin límite de tamaño propio (solo el de 4,5 MB del cuerpo en Vercel,
 *     que falla con un error genérico).
 *   - Cada subida dejaba la anterior huérfana en el bucket para siempre.
 */

export type TipoSubida = "avatar" | "banner";

const BUCKET = "Avatars";
const TAMANO_MAXIMO = 4 * 1024 * 1024;

const MIME_POR_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const EXTENSIONES_PERMITIDAS: Record<TipoSubida, string[]> = {
  avatar: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  banner: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm"],
};

/** ¿Empieza el archivo por la firma que corresponde a su tipo? */
export function firmaCoincide(mime: string, b: Buffer): boolean {
  const ascii = (inicio: number, fin: number) => b.subarray(inicio, fin).toString("latin1");
  switch (mime) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/gif":
      return ascii(0, 4) === "GIF8";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "video/mp4":
      return ascii(4, 8) === "ftyp";
    case "video/webm":
      return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    default:
      return false;
  }
}

function clienteStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type ResultadoSubida = { url: string } | { error: string; status: number };

/**
 * Sube el archivo y devuelve su URL pública. `urlAnterior` (lo que había en
 * `image`/`profileBannerUrl`) se borra del bucket si era una subida nuestra
 * — si es un avatar de PSN/Steam/Discord, un preset o nada, no se toca.
 */
export async function subirArchivoPerfil(
  userId: string,
  file: File,
  tipo: TipoSubida,
  urlAnterior: string | null,
): Promise<ResultadoSubida> {
  const supabase = clienteStorage();
  if (!supabase) {
    console.error("Faltan las variables de entorno de Supabase Storage.");
    return { error: "Storage no configurado", status: 500 };
  }

  const ext = path.extname(file.name).toLowerCase();
  const mime = MIME_POR_EXTENSION[ext];
  if (!mime || !EXTENSIONES_PERMITIDAS[tipo].includes(ext)) {
    return { error: "Formato no admitido", status: 400 };
  }
  if (file.size > TAMANO_MAXIMO) {
    return { error: "El archivo pesa demasiado (máximo 4 MB)", status: 413 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!firmaCoincide(mime, buffer)) {
    return { error: "El archivo no es lo que dice su extensión", status: 400 };
  }

  const filename = `${tipo}s/${userId}-${Date.now()}${ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (uploadError) {
    console.error("Error al subir a Supabase:", uploadError);
    return { error: "No se pudo subir el archivo", status: 500 };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  // Borrado de la anterior: solo si está en NUESTRO bucket y es de ESTE
  // usuario (el nombre lleva su id) — nunca una URL ajena. Un fallo aquí no
  // estropea la subida nueva, que ya está hecha.
  const prefijo = supabase.storage.from(BUCKET).getPublicUrl("").data.publicUrl;
  if (urlAnterior?.startsWith(prefijo)) {
    const rutaAnterior = decodeURIComponent(urlAnterior.slice(prefijo.length).split("?")[0]);
    if (rutaAnterior.startsWith(`${tipo}s/${userId}-`)) {
      const { error } = await supabase.storage.from(BUCKET).remove([rutaAnterior]);
      if (error) console.error("No se pudo borrar la subida anterior:", error);
    }
  }

  return { url: data.publicUrl };
}
