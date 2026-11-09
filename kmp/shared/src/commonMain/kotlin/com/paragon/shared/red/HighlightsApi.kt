package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class GameCardDto(
    val id: String,
    val title: String,
    val coverUrl: String,
    val earnedTrophies: Int,
    val totalTrophies: Int,
    val percent: Int,
    /** Platino conseguido (del juego base), aunque queden DLC por completar. */
    val platinado: Boolean = false,
)

/**
 * "Siguiente trofeo" — mismo recomendador que la portada web
 * (lib/recommendations.ts): prioriza juego base sobre DLC, progreso alto y
 * mayor probabilidad real de conseguirlo. `rarityPercent`/`grade`/`iconUrl`
 * pueden venir `null` (ver CONTRACT.md).
 */
@Serializable
data class NextTrophyDto(
    val gameId: String,
    val gameTitle: String,
    val trophyId: String,
    val trophyName: String,
    val detail: String,
    val rarityPercent: Double?,
    val gameProgress: Int,
    val iconUrl: String?,
    val grade: String?,
)

/** "Últimos trofeos" — `ultimosTrofeos()` de lib/history.ts, igual que el perfil web. */
@Serializable
data class LatestTrophyDto(
    val gameId: String,
    val gameTitle: String,
    val gameIconUrl: String? = null,
    val trophyId: String,
    val trophyName: String,
    val iconUrl: String? = null,
    val grade: String? = null,
    val earnedAt: String,
    val rarityPercent: Double? = null,
)

@Serializable
data class HighlightsResponse(
    val nearPlatinum: List<GameCardDto>,
    val recent: List<GameCardDto>,
    // Default por si una versión vieja del backend cacheada no lo manda —
    // sin esto, Gson/Moshi deja la lista en null y revienta el .map() de
    // PanelRepository en vez de mostrar la sección vacía sin más.
    val nextTrophies: List<NextTrophyDto> = emptyList(),
    val latestTrophies: List<LatestTrophyDto> = emptyList(),
    /** Qué te puedes platinar (8 nov 2026, lib/platinables.ts): lo más cerca y lo que juegas ahora. */
    val platinables: PlatinablesDto = PlatinablesDto(),
)

@Serializable
data class PlatinableDto(
    val id: String,
    val title: String,
    val coverUrl: String = "",
    val percent: Int = 0,
    val faltan: Int = 0,
    /** Sin platino (Steam, Xbox…) el objetivo es el 100 %. */
    val tienePlatino: Boolean = true,
    val diasDesdeJugado: Int? = null,
    val horasRestantes: Int? = null,
    // 8 nov 2026: filtros y avisos (lib/platinables.ts, platinablesExtras.ts).
    val sinEmpezar: Boolean = false,
    val dispositivos: List<String> = emptyList(),
    /** "ps_plus" o "game_pass". */
    val suscripcion: String? = null,
    val instalado: Boolean = false,
    val rarezaPlatino: Double? = null,
    val perdibles: Int = 0,
    val masRaroPendiente: Double? = null,
    val amigos: List<AmigoAMediasDto> = emptyList(),
)

@Serializable
data class AmigoAMediasDto(val nombre: String? = null, val percent: Int = 0)

/** Otra versión de un juego que ya platinaste, con su propio platino. */
@Serializable
data class DoblePlatinoDto(val id: String, val titulo: String, val coverUrl: String = "", val consola: String = "", val platinadoEn: String = "", val laTienes: Int? = null)

/** "Hace N años que no juegas a nada de PS3". */
@Serializable
data class SugerenciaRetirarDto(val dispositivo: String, val anios: Int = 0, val juegos: Int = 0)

@Serializable
data class PlatinablesDto(
    val cerca: List<PlatinableDto> = emptyList(),
    val jugando: List<PlatinableDto> = emptyList(),
    val faciles: List<PlatinableDto> = emptyList(),
    val dobles: List<DoblePlatinoDto> = emptyList(),
    val sugerenciaRetirar: SugerenciaRetirarDto? = null,
)

class HighlightsApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/panel/highlights/route.ts en el proyecto Next.js. */
    suspend fun getHighlights(): HighlightsResponse =
        c.http.get("api/mobile/panel/highlights").body()
}
