import "server-only";
import { urlAbsolutaParaOg } from "@/lib/design";

/**
 * Una imagen como data URL para Satori (ImageResponse), o null. Satori
 * revienta la imagen ENTERA si una URL falla al cargar, y avatares y
 * carátulas vienen de CDNs ajenos que a veces fallan o tardan: se bajan
 * antes (3 s como mucho, solo PNG/JPEG, que es lo que entiende Satori) y la
 * que falla se omite. Antes solo lo hacía el Wrap; la firma y la tarjeta de
 * platino se rompían enteras por una carátula caída (22 oct 2026).
 */
export async function imagenSegura(url: string | null | undefined): Promise<string | null> {
  const absoluta = urlAbsolutaParaOg(url ?? undefined);
  if (!absoluta) return null;
  try {
    const res = await fetch(absoluta, { signal: AbortSignal.timeout(3000) });
    const tipo = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g)/.test(tipo)) return null;
    const datos = Buffer.from(await res.arrayBuffer());
    if (datos.length > 1_500_000) return null;
    return `data:${tipo.split(";")[0]};base64,${datos.toString("base64")}`;
  } catch {
    return null;
  }
}
