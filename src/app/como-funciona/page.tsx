import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { SectionTabs } from "@/components/SectionTabs";

export const metadata = { title: "Cómo funciona · Paragon" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

function Bloque({ title, children, href, hrefLabel }: { title: string; children: React.ReactNode; href?: string; hrefLabel?: string }) {
  return (
    <div className="rounded-2xl p-5" style={CARD}>
      <h3 className="mb-2 font-heading text-base font-bold uppercase tracking-wide">{title}</h3>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
      {href && (
        <Link href={href} className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-accent hover:underline">
          {hrefLabel ?? "Ir →"}
        </Link>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-5xl py-10">
      <BackButton fallbackHref="/" label="Volver al inicio" />

      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">Cómo funciona</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Todo lo que hace Paragon, explicado de verdad — no una lista de titulares, sino qué hace
          cada cosa y dónde encontrarla.
        </p>
      </div>

      <SectionTabs
        storageKey="como-funciona"
        tabs={[
          {
            key: "vincular",
            label: "Vincular cuentas",
            content: (
              <Grid>
                <Bloque title="PlayStation, Steam y Xbox" href="/ajustes/plataformas" hrefLabel="Vincular una cuenta →">
                  Escribes tu identificador público (tu ID de PSN, tu SteamID64/URL de perfil, o tu
                  Gamertag) — nunca una contraseña, no hay ni campo para eso. En PSN el perfil de
                  trofeos tiene que ser público; en Steam hacen falta dos ajustes en público a la vez
                  (&ldquo;Mi perfil&rdquo; y &ldquo;Detalles del juego&rdquo;). Xbox usa un servicio de
                  terceros no oficial (OpenXBL) — puede fallar si ese servicio cambia, no depende de
                  Microsoft.
                </Bloque>
                <Bloque title="Qué plataformas NO se pueden vincular todavía">
                  Epic Games, Google Play y Ubisoft Connect se han quitado del selector — ninguna tiene
                  hoy una vía real (API pública documentada) para leer trofeos de terceros. No es una
                  limitación de Paragon, es que esas plataformas no lo permiten sin ingeniería inversa
                  de su API interna.
                </Bloque>
                <Bloque title="Sincronización automática">
                  Un cron recorre las cuentas vinculadas y trae lo nuevo solo, sin que tengas que
                  entrar. Además, cada vez que abres la ficha de un juego se comprueba si hace falta
                  refrescarlo.
                </Bloque>
                <Bloque title="Sincronizar ahora" href="/ajustes/plataformas">
                  Botón manual en la cabecera (y en Ajustes → Cuentas de Juegos) para forzar una
                  sincronización inmediata, con un cooldown para no golpear las APIs de origen sin
                  necesidad.
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "trofeos",
            label: "Trofeos y perdibles",
            content: (
              <Grid>
                <Bloque title="Biblioteca ordenada por lo que falta" href="/#biblioteca">
                  Cada juego se ordena por trofeos pendientes, con el más fácil de conseguir arriba —
                  el platino es la consecuencia de terminar la lista, no la tarea en sí.
                </Bloque>
                <Bloque title="Trofeos perdibles (PowerPyx)">
                  Los trofeos que puedes perderte para siempre si no los sacas a tiempo, sacados de
                  guías reales de PowerPyx — con una lista curada de títulos alternativos para los
                  juegos que PowerPyx llama de otra forma (comprobados uno a uno, no una regla
                  genérica que adivine mal).
                </Bloque>
                <Bloque title="Guía en vídeo por trofeo">
                  Clic en cualquier trofeo de la lista y busca sola una guía en YouTube — cacheada a
                  nivel de trofeo (la primera búsqueda vale para todo el mundo), con un botón &ldquo;No
                  es este — buscar otro&rdquo; si el vídeo no es el correcto.
                </Bloque>
                <Bloque title="Guía escrita de la comunidad">
                  En la misma ficha del trofeo, una pestaña de guía escrita por cualquier usuario de
                  Paragon — con enlaces de búsqueda externa (Google, Vandal, Meristation, 3DJuegos) si
                  todavía no hay ninguna.
                </Bloque>
                <Bloque title="Contador manual +/-">
                  Para trofeos que ni la plataforma desglosa (&ldquo;gana 50 partidas&rdquo;,
                  &ldquo;encuentra 100 objetos&rdquo;) — tú pones la meta y llevas la cuenta con dos
                  botones, en la misma ficha del trofeo.
                </Bloque>
                <Bloque title="Filtros y árbol de trofeos">
                  Filtra la lista por Perdibles, Multijugador, Coleccionables, Historia, Habilidad o
                  Secretos. La vista &ldquo;Árbol&rdquo; conecta trofeos relacionados visualmente — un
                  apoyo para leerlos de un vistazo, no un dato real de qué desbloquea a cuál (ni PSN ni
                  Steam lo exponen).
                </Bloque>
                <Bloque title="Tiempo estimado (HowLongToBeat)">
                  Horas de historia y de completista de la comunidad de HLTB, en la ficha del juego y en
                  el Planificador — la media de todo el mundo, no una promesa personalizada.
                </Bloque>
                <Bloque title="Modo enfoque">
                  Pantalla completa con los trofeos más a mano y botones grandes, para cuando ya sabes
                  qué vas a platinar hoy y no quieres distracciones.
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "estadisticas",
            label: "Estadísticas",
            content: (
              <Grid>
                <Bloque title="Paragon Score y nivel" href="/">
                  Una puntuación única que pesa cada trofeo por su rareza real (y por el Gamerscore en
                  Xbox) — de ahí sale tu nivel Paragon y tu progreso hacia el siguiente.
                </Bloque>
                <Bloque title="Insignias">
                  Hitos automáticos (tu primer platino, rachas, volumen de trofeos…) que se desbloquean
                  solos al cumplir la condición, sin nada que reclamar a mano.
                </Bloque>
                <Bloque title="Mapa de actividad y por franja horaria">
                  Un cuadrito por día con los trofeos ganados (estilo GitHub), y un segundo mapa
                  cruzando día de la semana y hora — a qué horas juegas de verdad, no solo qué días.
                </Bloque>
                <Bloque title="Trophy DNA">
                  Un radar por género (Acción, RPG, Aventura, Estrategia, Plataformas, Puzles,
                  Deportes) pesado por tus trofeos ganados de verdad, no por tu biblioteca entera — con
                  un arquetipo asignado según tu categoría más fuerte.
                </Bloque>
                <Bloque title="Línea de tiempo de hitos">
                  Tu primer platino, tu trofeo más raro, el &ldquo;platino añejo&rdquo; (el que más tardó
                  desde el primer trofeo hasta el platino) y tu racha más larga de días seguidos.
                </Bloque>
                <Bloque title="Coste por hora">
                  Pones lo que pagaste por un juego y de dónde lo tienes (físico, digital, PS Plus, Game
                  Pass, prestado, gratis) en su ficha, y Paragon calcula el €/hora con tus horas
                  jugadas reales — nada inventado, solo lo que tú mismo has puesto.
                </Bloque>
                <Bloque title="Dificultad estimada">
                  El % de gente que tiene el platino de cada juego (o el trofeo más raro, si no hay
                  platino) traducido a una escala de dificultad — un dato real de rareza, no una nota de
                  opinión.
                </Bloque>
                <Bloque title="Estadísticas completas" href="/u/tu-handle/estadisticas" hrefLabel="Ver tus estadísticas →">
                  Todo lo anterior junto en la pestaña &ldquo;Estadísticas&rdquo; de tu perfil, más horas
                  en perspectiva, gráficas mensuales y comparación con tus amigos.
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "backlog",
            label: "Backlog y descubrir",
            content: (
              <Grid>
                <Bloque title="Radar de platinos al alcance">
                  Juegos con mucho progreso (75%+) que llevan meses sin tocarse — para acordarte de que
                  estaban ahí, a un empujón del platino.
                </Bloque>
                <Bloque title="El Salón de la Vergüenza">
                  Juegos en tu biblioteca sin ni una hora, sin ni un trofeo — con un botón
                  &ldquo;Jugar a ciegas&rdquo; que elige uno al azar y te da una prueba de 2 horas.
                </Bloque>
                <Bloque title="¿Hoy qué juego?" href="/">
                  Dices cuánto tiempo tienes (y de qué género, si quieres) y te sugiere &ldquo;victorias
                  rápidas&rdquo; (pocos trofeos reales por sacar) y juegos &ldquo;para profundizar&rdquo;
                  (según horas de HLTB menos lo ya jugado). Sortea entre lo más relevante, así no repite
                  siempre lo mismo.
                </Bloque>
                <Bloque title="Descubrir" href="/descubrir" hrefLabel="Explorar catálogo →">
                  Catálogo por plataforma, tendencias, próximos lanzamientos y recomendaciones basadas
                  en lo que ya juegas — para cuando no sabes qué añadir a la lista de deseados.
                </Bloque>
                <Bloque title="Lista de deseados">
                  Marca cualquier juego como deseado desde su ficha o desde Descubrir — no cuenta como
                  &ldquo;juego tuyo&rdquo; en ninguna estadística hasta que lo tengas de verdad.
                </Bloque>
                <Bloque title="Noticias" href="/noticias" hrefLabel="Ver noticias →">
                  Lanzamientos y novedades de PlayStation, Xbox y Steam, sacadas de fuentes públicas de
                  cada plataforma.
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "comunidad",
            label: "Comunidad y amigos",
            content: (
              <Grid>
                <Bloque title="Feed de actividad" href="/feed" hrefLabel="Ver el feed →">
                  Lo que hacen tus amigos — platinos, reseñas, comentarios — en un solo sitio, con
                  reacciones y respuestas.
                </Bloque>
                <Bloque title="Reseñas y valoraciones">
                  Puntúa y escribe sobre cualquier juego que tengas, visible en tu perfil público y en
                  la ficha del juego para todo el mundo.
                </Bloque>
                <Bloque title="Guías de juego (foro)">
                  Guías escritas por cualquier usuario sobre un juego entero (a diferencia de la guía
                  de UN trofeo, ver la pestaña de Trofeos), con respuestas de otros usuarios.
                </Bloque>
                <Bloque title="Comparar con amigos" href="/comparar" hrefLabel="Comparar biblioteca →">
                  Solo los juegos que tenéis en común, barra contra barra — con uno o con varios amigos
                  a la vez, como un clan.
                </Bloque>
                <Bloque title="Amigos y rankings" href="/amigos" hrefLabel="Ver amigos →">
                  Pide y acepta amistades, y compara rankings de trofeos, platinos y horas entre tu
                  grupo.
                </Bloque>
                <Bloque title="Ligas mensuales" href="/ligas" hrefLabel="Ver la liga →">
                  Una clasificación que arranca de cero cada mes para todo el mundo — no importa cuánto
                  llevas jugando, todos empiezan igual el día 1.
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "planificador",
            label: "Planificador y Wrap",
            content: (
              <Grid>
                <Bloque title="Planificador" href="/planificador" hrefLabel="Abrir el planificador →">
                  Organiza en qué orden vas a platinar tu backlog, con horas estimadas de HLTB
                  desglosadas en historia y platino — y un desplegable para ordenar por &ldquo;más
                  rápido&rdquo; cuando hay datos.
                </Bloque>
                <Bloque title="Tu ritmo" href="/ritmo" hrefLabel="Ver tu ritmo →">
                  Trofeos por mes, tu racha actual y tu mejor racha histórica, y un resumen de tu
                  actividad a lo largo del tiempo.
                </Bloque>
                <Bloque title="Wrap anual">
                  Un resumen tipo &ldquo;Spotify Wrapped&rdquo; de tu año en trofeos — tu género más
                  jugado, tu juego más exprimido, tus trofeos del año — con formato Stories y enlace al
                  ranking real detrás de cada cifra.
                </Bloque>
                <Bloque title="Misiones semanales">
                  Pequeños objetivos que se renuevan cada semana (gana X trofeos, prueba un juego
                  nuevo…) — opcionales, sin premio más allá de la propia racha.
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "notificaciones",
            label: "Notificaciones",
            content: (
              <Grid>
                <Bloque title="Push del navegador" href="/ajustes">
                  Un aviso directo al móvil o al navegador en cuanto desbloqueas un trofeo — actívalo
                  desde Ajustes. En iPhone hace falta instalar Paragon desde &ldquo;Compartir → Añadir a
                  pantalla de inicio&rdquo; en Safari para que funcione (limitación de Apple, no de
                  Paragon).
                </Bloque>
                <Bloque title="Bot de Discord" href="/ajustes">
                  Activa los avisos por DM del bot de Paragon desde Ajustes — necesita que hayas
                  iniciado sesión con Discord. Además, comandos de barra en cualquier servidor donde
                  esté el bot: <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/platinosalalcance</code>,{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/hoy</code>,{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/perfil</code>,{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/verguenza</code>,{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/racha</code> y{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/help</code>.
                </Bloque>
                <Bloque title="Anuncios del bot en un servidor">
                  Quien tenga permiso de gestionar el servidor puede escribir{" "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">/anunciosaqui</code> en el
                  canal que quiera — a partir de ahí, el bot avisa ahí mismo cuando alguien del
                  servidor sube de nivel Paragon (solo a quien tenga los avisos activados en Paragon,
                  y solo si de verdad sigue en ese servidor).
                </Bloque>
              </Grid>
            ),
          },
          {
            key: "perfil",
            label: "Perfil y privacidad",
            content: (
              <Grid>
                <Bloque title="Perfil público personalizable" href="/ajustes">
                  Banner, color de acento, marco de avatar (según tu nivel Paragon), título y estado
                  personalizados, y el orden de las secciones de tu perfil a tu gusto.
                </Bloque>
                <Bloque title="Carpetas y Vitrina de Orgullo">
                  Agrupa tus juegos en carpetas a mano, y fija hasta 3 trofeos en una vitrina destacada
                  en tu perfil.
                </Bloque>
                <Bloque title="Notas privadas por juego">
                  Un recordatorio que solo ves tú (&ldquo;me falta el coleccionable 14 del capítulo
                  3&rdquo;) — nunca público, a diferencia de la reseña.
                </Bloque>
                <Bloque title="Ocultar funciones del menú" href="/ajustes/ocultar" hrefLabel="Personalizar tu menú →">
                  Quita del menú las funciones que no te interesen (Comunidad, Ligas, Amigos, Descubrir,
                  Noticias, Planificador) — solo para ti, sigue existiendo para todo el mundo.
                </Bloque>
                <Bloque title="Temas visuales">
                  Oscuro, claro, OLED o contraste alto, más un color de acento libre — se aplica antes
                  de pintar la página, sin parpadeos.
                </Bloque>
                <Bloque title="Privacidad, cookies y datos" href="/privacidad" hrefLabel="Leer la política →">
                  Qué datos se piden y por qué, sin analítica ni publicidad de terceros — ver también{" "}
                  <Link href="/cookies" className="text-accent hover:underline">Cookies</Link> y{" "}
                  <Link href="/terminos" className="text-accent hover:underline">Términos</Link>.
                </Bloque>
                <Bloque title="Exportar tus datos" href="/ajustes/seguridad" hrefLabel="Ir a seguridad →">
                  Descarga en JSON todo lo que Paragon sabe de ti, desde Ajustes → Inicio de sesión y
                  seguridad. Para eliminar tu cuenta del todo, de momento se pide por correo — ver{" "}
                  <Link href="/privacidad" className="text-accent hover:underline">Privacidad</Link>.
                </Bloque>
              </Grid>
            ),
          },
        ]}
      />
    </div>
  );
}
