import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import { ultimosTrofeos } from "@/lib/history";

/**
 * Overlay para OBS (`/api/overlay/<handle>`): una página transparente con
 * el juego actual (el anclado, o si no el último jugado), su progreso y el
 * último trofeo conseguido. Se añade en OBS como "Fuente de navegador" y
 * se refresca sola cada minuto.
 *
 * Es una ruta de API que devuelve HTML a mano y no una página de la app a
 * propósito: las páginas pasan todas por el layout raíz (cabecera, pie,
 * fondo opaco, aviso de cookies), y un overlay tiene que ser solo el
 * recuadro sobre fondo transparente. `?tema=claro` para escenas claras.
 */

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const claro = new URL(request.url).searchParams.get("tema") === "claro";

  const profile = await getProfileByHandle(handle.toLowerCase());
  if (!profile) return new Response("No existe ese perfil.", { status: 404 });

  const [{ games }, recientes] = await Promise.all([getLibrary(profile), ultimosTrofeos(profile.userId, 1)]);
  const jugados = games.filter((g) => !g.isWishlist);
  const actual =
    jugados.find((g) => g.isPinned) ??
    [...jugados].sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))[0];
  const ultimo = recientes[0];

  const fondo = claro ? "rgba(255,255,255,0.88)" : "rgba(10,15,24,0.82)";
  const texto = claro ? "#0b1018" : "#e6edf5";
  const tenue = claro ? "#4a5568" : "#8a98ab";

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="60">
<meta name="robots" content="noindex">
<title>Paragon · overlay de @${escapar(handle)}</title>
<style>
  html,body{margin:0;background:transparent;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .caja{display:flex;gap:14px;align-items:center;width:460px;padding:14px 16px;border-radius:16px;background:${fondo};color:${texto};box-shadow:0 8px 30px rgba(0,0,0,.35)}
  .caratula{width:64px;height:64px;border-radius:10px;object-fit:cover;flex-shrink:0;background:#1c2638}
  .titulo{font-weight:700;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dato{font-size:13px;color:${tenue};margin-top:2px}
  .barra{height:6px;border-radius:3px;background:rgba(127,188,216,.25);margin-top:8px;overflow:hidden}
  .barra>div{height:100%;background:linear-gradient(90deg,#7fbcd8,#9d8cf0)}
  .ultimo{font-size:12px;color:${tenue};margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ultimo b{color:${texto}}
</style></head>
<body>
${
  actual
    ? `<div class="caja">
  ${actual.iconUrl ? `<img class="caratula" src="${escapar(actual.iconUrl)}" alt="">` : `<div class="caratula"></div>`}
  <div style="min-width:0;flex:1">
    <div class="titulo">${escapar(actual.title)}</div>
    <div class="dato">${actual.earnedTotal}/${actual.definedTotal} trofeos · ${actual.progressPercent}%</div>
    <div class="barra"><div style="width:${Math.max(0, Math.min(100, actual.progressPercent))}%"></div></div>
    ${ultimo ? `<div class="ultimo">Último: <b>${escapar(ultimo.nombre)}</b> · ${escapar(ultimo.juego)}</div>` : ""}
  </div>
</div>`
    : ""
}
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // La página se refresca sola cada 60 s; con 30 s de caché en la CDN,
      // cada refresco trae datos como mucho medio minuto viejos.
      "Cache-Control": "public, max-age=0, s-maxage=30",
      // OBS la carga como página suelta: no hace falta (ni conviene) que
      // otras webs puedan meterla en un iframe.
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
