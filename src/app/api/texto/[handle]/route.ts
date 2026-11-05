import { resumenStreamer } from "@/lib/streamer";
import { esDato, textoChat, textoNoExiste } from "@/lib/streamerTexto";
import { esIdioma } from "@/lib/idiomasTrofeo";

/**
 * Una línea de texto plano para comandos de chat de Twitch, YouTube o Kick
 * sin escribir ningún bot: Nightbot (`$(urlfetch …)`), StreamElements y
 * Streamlabs (`${customapi.…}`) ya saben leer una URL y repetir lo que
 * devuelve.
 *
 *   /api/texto/<handle>?dato=todo|nivel|platinos|juego|ultimo&idioma=es
 *
 * Siempre responde 200 con texto, también si el perfil no existe: los bots
 * de chat enseñan el cuerpo tal cual, y un 404 sale como un error feo en el
 * chat del streamer.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const url = new URL(request.url);
  const idiomaPedido = url.searchParams.get("idioma");
  const idioma = esIdioma(idiomaPedido) ? idiomaPedido : "es";
  const datoPedido = url.searchParams.get("dato");
  const dato = esDato(datoPedido) ? datoPedido : "todo";

  const resumen = await resumenStreamer(handle.replace(/\.txt$/i, ""));
  const cuerpo = resumen ? textoChat(resumen, idioma, dato) : textoNoExiste(idioma);

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Un comando lo pueden pedir 50 personas del chat en un minuto: con
      // un minuto de CDN, la base solo se entera de una.
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
