# Rediseño de la cabecera de la ficha del juego

El objetivo es actualizar `/juego/[id]/page.tsx` para que se vea igual que el mockup proporcionado, eliminando la actual caja cuadrada de la portada y el fondo degradado para dar paso a un diseño más limpio y moderno con arte de fondo y el logo del juego.

## Proposed Changes

### 1. Obtener arte de fondo (IGDB)
- **Archivo**: `src/lib/igdb/client.ts`
- Modificaremos `DETAIL_FIELDS` para incluir `artworks.image_id`.
- En `getGameDetails`, devolveremos `artworkUrl` (generada a partir del primer artwork disponible, usando la resolución `t_1080p`).

### 2. Rediseño de la cabecera
- **Archivo**: `src/app/juego/[id]/page.tsx`
- **Fondo**: Se usará el `artworkUrl` (si existe) como imagen de fondo cubriendo toda la cabecera, con un overlay oscuro para que el texto sea legible. Si no hay artwork, mantendremos el degradado actual.
- **Título / Logo**: 
  - Eliminaremos la portada cuadrada (el `game.iconUrl` que se mostraba en la caja con sombra).
  - Intentaremos cargar el logo transparente oficial si el juego es de Steam usando la URL `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{steamId}/logo.png`.
  - Si el juego no es de Steam o la imagen del logo falla al cargar, mostraremos el **título del juego en texto grande** como fallback (`<h1>{game.title}</h1>`).
- **Información debajo del logo/título**:
  - En una línea: Icono de la plataforma (ej. Steam, PlayStation) seguido de la fecha de lanzamiento (ej. `| 7 de septiembre de 2026`).
  - En la siguiente línea: Las "píldoras" (chips) de los géneros.
- **Estadísticas de la comunidad**: Las puntuaciones (`CommunityRating` y `CommunityDifficulty`) se moverán ligeramente o se integrarán bajo los géneros para no romper la estética limpia del nuevo diseño.

## Open Questions
- Para los juegos que **no son de Steam** (PSN, Retro, etc), ¿estás de acuerdo en que simplemente mostremos el **título en texto grande** en lugar del logo transparente, ya que IGDB no proporciona logos transparentes de forma fiable?
- Al quitar la portada cuadrada de la cabecera, los juegos que no tengan arte de fondo ni logo dependerán puramente del texto. ¿Te parece bien este comportamiento por defecto?
