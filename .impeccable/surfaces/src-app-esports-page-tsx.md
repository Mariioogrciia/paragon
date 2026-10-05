---
version: 1
slug: "src-app-esports-page-tsx"
primary_target: "src/app/esports/page.tsx"
related_targets: ["src/components/EsportsHub.tsx","src/app/esports/partido/[id]/page.tsx"]
---

# eSports (lista + ficha de partido)

Modo: Operate. Cazadores de trofeos que también siguen competiciones: entran entre partidas para ver qué se juega ahora, cuándo juega su liga y cómo va un partido. Datos reales de PandaScore (plan sin estadísticas por jugador); nada inventado.

Rutas: `/esports` (lista, `src/components/EsportsHub.tsx`) y `/esports/partido/[id]` (ficha).

## Direction contract

THESIS: la competición es la unidad, no el partido suelto. Rechaza el muro cronológico de tarjetas iguales mezclando ligas.

OWN-WORLD: el de Paragon sin cambios: Night Floor, vitrinas con hairline, cifras Chakra Petch tabulares, placa inclinada (dorsal) de color fijo por juego, coral de directo, Twitch en su morado.

STORY: el visitante ve primero lo que está en directo, después cada liga con sus partidos y su tabla, y entra a un partido para ver mapas, plantillas, streams y dónde deja la tabla a cada equipo.

FIRST VIEWPORT: título y filtro por juego; franja horizontal de directos (marcador compacto, enlaza a la ficha); debajo, primer bloque de liga: cabecera con dorsal y nivel, partidos a la izquierda y top de su clasificación a la derecha.

FORM: «Por competición», puesto 5 de 7 en mi lista; seed d7f9af82.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
