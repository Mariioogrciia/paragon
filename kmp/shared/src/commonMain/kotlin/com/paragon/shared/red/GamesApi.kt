package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

// Sin @JsonClass(generateAdapter = true) — mismo motivo que PanelApi.kt: sin
// kapt montado, KotlinJsonAdapterFactory (reflexión) lee estas data class
// directamente.
@Serializable
data class TrophyDto(
    val id: String,
    val name: String,
    val detail: String,
    val grade: String?,
    val earned: Boolean,
    val earnedAt: String?,
    val rarityPercent: Double?,
    val iconUrl: String?,
    /** "default" = juego base; otro = un DLC (como en la web, TrophyList.tsx). */
    val groupId: String = "default",
    val groupName: String? = null,
    /** Perdible (PowerPyx): el plan de platino lo pone primero. */
    val isMissable: Boolean = false,
    /** Cuántos coleccionables pide, si el texto lo dice (lib/coleccionablesReglas.ts). */
    val coleccionables: Int? = null,
    /** El contador manual del trofeo (lo mueve la lista de coleccionables). */
    val manualProgress: ManualProgressDto? = null,
)

@Serializable
data class ManualProgressDto(val current: Int = 0, val target: Int = 0)

@Serializable
data class GameDetailDto(
    val id: String,
    val platform: String,
    val title: String,
    val iconUrl: String?,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    val isPinned: Boolean?,
    val notes: String?,
    val playtimeMinutes: Int?,
    val trophies: List<TrophyDto>,
)

@Serializable
data class GameDetailResponse(
    val game: GameDetailDto,
    val diario: DiarioPlatinoDto? = null,
    /** Plan de platino (lib/planPlatino.ts): solo en tu ficha y sin el platino. */
    val plan: PlanPlatinoDto? = null,
    /** Platinos más rápidos del juego entre la gente de Paragon (lib/platinoRapido.ts). */
    val rapidos: List<PlatinoRapidoDto> = emptyList(),
    /** Tus marcas de este juego (8 nov 2026); null en la ficha de otra persona. */
    val marcas: MarcasJuegoDto? = null,
)

@Serializable
data class MarcasJuegoDto(val instalado: Boolean = false, val ocultoPerfil: Boolean = false, val fechaObjetivo: String? = null, val caza: Boolean = false)

/** Una fase del plan: perdibles, historia, coleccionables, online, habilidad, grindeo o limpieza. */
@Serializable
data class FasePlanDto(val fase: String, val total: Int = 0, val conseguidos: Int = 0, val pendientes: List<String> = emptyList())

@Serializable
data class PlanPlatinoDto(val actual: String? = null, val faltan: Int = 0, val fases: List<FasePlanDto> = emptyList())

@Serializable
data class PlatinoRapidoDto(val handle: String? = null, val nombre: String? = null, val avatarUrl: String? = null, val platform: String = "", val duracionMs: Long = 0)

/** Lista de coleccionables de un trofeo (games/[gameId]/trophies/[trophyId]/coleccionables). */
@Serializable
data class ColeccionablesDto(val nombres: List<String> = emptyList(), val marcados: List<Int> = emptyList(), val comunidad: List<String> = emptyList(), val total: Int = 0)

@Serializable
data class GuardarColeccionablesRequest(val nombres: List<String>? = null, val textoPegado: String? = null, val marcados: List<Int>, val total: Int)

/** "El Diario del Platino" (src/lib/diarioPlatino.ts); null sin platino o sin fechas. */
@Serializable
data class DiarioPlatinoMasRaroDto(val nombre: String, val rarityPercent: Double)

@Serializable
data class DiarioPlatinoDto(
    val primeraFecha: String,
    val primerTrofeo: String,
    val muroDias: Int,
    val muroTrofeo: String,
    val masRaro: DiarioPlatinoMasRaroDto? = null,
    val fechaPlatino: String,
    val diasTotales: Int,
)

@Serializable
data class PinResponse(val pinned: Boolean)
@Serializable
data class ReserveResponse(val reservado: Boolean)
@Serializable
data class NotesRequest(val notes: String)
@Serializable
data class OkResponse(val ok: Boolean)
// `platinoNuevo` viene null salvo que esta llamada haya descubierto un
// platino de verdad nuevo (no en la primera sincronización) — para la
// celebración en el momento en Modo Enfoque/Ficha de juego.
@Serializable
data class PlatinoNuevoDto(val nombre: String, val iconUrl: String?)
@Serializable
data class ResyncResponse(val nuevos: Int, val error: String? = null, val platinoNuevo: PlatinoNuevoDto? = null)
@Serializable
data class TrophyGuideResponse(val videoId: String?)

/** Estadísticas dentro del juego (Steam, 9 nov 2026): `texto` ya formateado en tu idioma. */
@Serializable
data class EstadisticaJuegoDto(val id: String, val nombre: String, val valor: Double = 0.0, val formato: String = "numero", val texto: String)
@Serializable
data class EstadisticasJuegoResponse(val estadisticas: List<EstadisticaJuegoDto> = emptyList())

class GamesApi internal constructor(private val c: ClienteParagon) {
    /** Ver games/[gameId]/estadisticas/route.ts. Lista vacía si no hay nada. */
    suspend fun getEstadisticas(gameId: String, de: String? = null): EstadisticasJuegoResponse =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}/estadisticas") { de?.let { parameter("de", it) } }.body()

    /** Ver src/app/api/mobile/games/[gameId]/route.ts en el proyecto Next.js. */
    suspend fun getGameDetail(gameId: String, de: String? = null): GameDetailResponse =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}") { de?.let { parameter("de", it) } }.body()

    /** Anclar/desanclar para Modo Enfoque — ver games/[gameId]/pin/route.ts. Sin body. */
    suspend fun togglePin(gameId: String): PinResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/pin").body()

    /** Reservar/quitar para el Cerrojo de Hitos — ver games/[gameId]/reserve/route.ts. Sin body. */
    suspend fun toggleReserve(gameId: String): ReserveResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/reserve").body()

    /** Nota privada de Modo Enfoque — ver games/[gameId]/notes/route.ts. */
    suspend fun saveNotes(gameId: String, body: NotesRequest): OkResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/notes") { json(body) }.body()

    /** "¿Ya lo tengo?" de Modo Enfoque — ver games/[gameId]/resync/route.ts. Siempre 200. */
    suspend fun resync(gameId: String): ResyncResponse =
        c.http.post("api/mobile/games/${gameId.encodeURLPathPart()}/resync").body()

    /** Coleccionables de un trofeo, con la lista de la comunidad si hay (6 nov 2026). */
    suspend fun getColeccionables(gameId: String, trophyId: String): ColeccionablesDto =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/coleccionables").body()

    /** Guarda la lista entera (nombres o texto pegado + marcados). Mueve el contador del trofeo. */
    suspend fun guardarColeccionables(gameId: String, trophyId: String, cuerpo: GuardarColeccionablesRequest): ColeccionablesDto =
        c.http.put("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/coleccionables") { json(cuerpo) }.body()

    suspend fun quitarColeccionables(gameId: String, trophyId: String) {
        c.http.delete("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/coleccionables")
    }

    /** Vídeo de guía cacheado (mismo dato que la web) — ver games/[gameId]/trophies/[trophyId]/guide/route.ts. */
    suspend fun getTrophyGuide(gameId: String, trophyId: String): TrophyGuideResponse =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}/trophies/${trophyId.encodeURLPathPart()}/guide").body()
}
