import { NextResponse } from "next/server";
import { resumenStreamer } from "@/lib/streamer";
import { textosOverlay } from "@/lib/streamerTexto";
import { esIdioma } from "@/lib/idiomasTrofeo";

/**
 * Overlay para OBS (`/api/overlay/<handle>`): una página transparente con
 * el juego actual (el anclado, o si no el último jugado), su progreso y el
 * último trofeo conseguido. Se añade en OBS como "Fuente de navegador".
 *
 * Es una ruta de API que devuelve HTML a mano y no una página de la app a
 * propósito: las páginas pasan todas por el layout raíz (cabecera, pie,
 * fondo opaco, aviso de cookies), y un overlay tiene que ser solo el
 * recuadro sobre fondo transparente.
 *
 * Parámetros: `?tema=claro` para escenas claras, `?idioma=en` y
 * `?formato=json` (lo que lee la propia página cada 30 s).
 *
 * Desde el 5 nov 2026 ya no se recarga entera con `meta refresh`: el
 * script pide el JSON y, cuando cambia el último trofeo, saca una alerta
 * animada («¡Trofeo desbloqueado!») unos segundos encima del recuadro. El
 * `meta refresh` de 10 min se queda de red por si el script se atasca.
 */

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** JSON dentro de un <script>: sin escapar `<`, un trofeo llamado «</script>» cerraría el script. */
const js = (valor: unknown) =>
  JSON.stringify(valor).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const COLOR_GRADO: Record<string, string> = { platinum: "#9fd4ec", gold: "#e2b53e", silver: "#b9c2cc", bronze: "#c07b4a" };

export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const url = new URL(request.url);
  const claro = url.searchParams.get("tema") === "claro";
  const idiomaPedido = url.searchParams.get("idioma");
  const idioma = esIdioma(idiomaPedido) ? idiomaPedido : "es";

  const resumen = await resumenStreamer(handle);

  if (url.searchParams.get("formato") === "json") {
    if (!resumen) return NextResponse.json({ error: "No existe ese perfil." }, { status: 404 });
    return NextResponse.json(resumen, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=20", "Access-Control-Allow-Origin": "*" },
    });
  }
  if (!resumen) return new Response("No existe ese perfil.", { status: 404 });

  const t = textosOverlay(idioma);
  const fondo = claro ? "rgba(255,255,255,0.88)" : "rgba(10,15,24,0.82)";
  const texto = claro ? "#0b1018" : "#e6edf5";
  const tenue = claro ? "#4a5568" : "#8a98ab";
  const jsonUrl = `/api/overlay/${encodeURIComponent(resumen.handle)}?formato=json`;

  const html = `<!doctype html>
<html lang="${idioma}"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="600">
<meta name="robots" content="noindex">
<title>Paragon · overlay de @${escapar(resumen.handle)}</title>
<style>
  html,body{margin:0;background:transparent;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .zona{position:relative;width:460px;padding-top:64px}
  .caja{display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:16px;background:${fondo};color:${texto};box-shadow:0 8px 30px rgba(0,0,0,.35)}
  .caja[hidden]{display:none}
  .caratula{width:64px;height:64px;border-radius:10px;object-fit:cover;flex-shrink:0;background:#1c2638}
  .titulo{font-weight:700;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dato{font-size:13px;color:${tenue};margin-top:2px}
  .barra{height:6px;border-radius:3px;background:rgba(127,188,216,.25);margin-top:8px;overflow:hidden}
  .barra>div{height:100%;background:linear-gradient(90deg,#7fbcd8,#9d8cf0);transition:width .8s ease}
  .ultimo{font-size:12px;color:${tenue};margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ultimo b{color:${texto}}
  .alerta{position:absolute;top:0;left:0;right:0;display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:14px;
    background:${fondo};color:${texto};box-shadow:0 8px 30px rgba(0,0,0,.35);border:2px solid var(--grado,#7fbcd8);
    opacity:0;transform:translateY(-16px) scale(.96);pointer-events:none}
  .alerta.ver{animation:entra 6s ease forwards}
  .alerta img{width:40px;height:40px;border-radius:8px;object-fit:cover;background:#1c2638}
  .alerta .cab{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--grado,#7fbcd8)}
  .alerta .nom{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  @keyframes entra{0%{opacity:0;transform:translateY(-16px) scale(.96)}8%{opacity:1;transform:none}85%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-8px)}}
  @media (prefers-reduced-motion:reduce){.alerta.ver{animation:none;opacity:1;transform:none}}
</style></head>
<body>
<div class="zona">
  <div class="alerta" id="alerta" role="status" aria-live="polite">
    <img id="a-icono" alt="">
    <div style="min-width:0"><div class="cab">${escapar(t.desbloqueado)}</div><div class="nom" id="a-nombre"></div></div>
  </div>
  <div class="caja" id="caja"${resumen.actual ? "" : " hidden"}>
    <img class="caratula" id="caratula"${resumen.actual?.iconUrl ? ` src="${escapar(resumen.actual.iconUrl)}"` : ""} alt="">
    <div style="min-width:0;flex:1">
      <div class="titulo" id="titulo">${escapar(resumen.actual?.titulo ?? "")}</div>
      <div class="dato" id="dato">${resumen.actual ? `${resumen.actual.ganados}/${resumen.actual.total} ${escapar(t.trofeos)} · ${resumen.actual.porcentaje}%` : ""}</div>
      <div class="barra"><div id="barra" style="width:${resumen.actual?.porcentaje ?? 0}%"></div></div>
      <div class="ultimo" id="ultimo">${resumen.ultimo ? `${escapar(t.ultimo)}: <b>${escapar(resumen.ultimo.nombre)}</b> · ${escapar(resumen.ultimo.juego)}` : ""}</div>
    </div>
  </div>
</div>
<script>
(function(){
  var T=${js({ trofeos: t.trofeos, ultimo: t.ultimo })};
  var COLORES=${js(COLOR_GRADO)};
  var visto=${js(resumen.ultimo?.earnedAt ?? null)};
  var $=function(id){return document.getElementById(id)};
  function pintar(r){
    if(r.actual){
      $("caja").hidden=false;
      if(r.actual.iconUrl) $("caratula").src=r.actual.iconUrl;
      $("titulo").textContent=r.actual.titulo;
      $("dato").textContent=r.actual.ganados+"/"+r.actual.total+" "+T.trofeos+" · "+r.actual.porcentaje+"%";
      $("barra").style.width=r.actual.porcentaje+"%";
    }
    if(r.ultimo){
      var u=$("ultimo"); u.textContent=T.ultimo+": ";
      var b=document.createElement("b"); b.textContent=r.ultimo.nombre; u.appendChild(b);
      u.appendChild(document.createTextNode(" · "+r.ultimo.juego));
      if(visto!==null && r.ultimo.earnedAt!==visto) alertar(r.ultimo);
      visto=r.ultimo.earnedAt;
    }
  }
  function alertar(u){
    var a=$("alerta");
    a.style.setProperty("--grado",COLORES[u.grado]||"#7fbcd8");
    $("a-nombre").textContent=u.nombre;
    if(u.iconUrl) $("a-icono").src=u.iconUrl;
    a.classList.remove("ver"); void a.offsetWidth; a.classList.add("ver");
  }
  function pedir(){
    fetch(${js(jsonUrl)},{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(r){if(r)pintar(r)}).catch(function(){});
  }
  setInterval(pedir,30000);
  if(location.hash==="#prueba" && ${js(Boolean(resumen.ultimo))}) setTimeout(function(){alertar(${js(resumen.ultimo)})},600);
})();
</script>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=30",
      // OBS la carga como página suelta: no hace falta (ni conviene) que
      // otras webs puedan meterla en un iframe.
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
