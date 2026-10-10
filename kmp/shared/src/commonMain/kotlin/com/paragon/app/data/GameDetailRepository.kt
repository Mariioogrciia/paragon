package com.paragon.app.data

import com.paragon.shared.red.jsonParagon

import kotlinx.serialization.Serializable

import kotlinx.serialization.builtins.ListSerializer

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.CachedGameDetailEntity
import com.paragon.app.data.local.GameDetailDao
import com.paragon.app.data.local.PendingNoteEntity
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.GameDetailDto
import com.paragon.shared.red.NotesRequest
import com.paragon.shared.red.paragonErrorMessage
import com.paragon.shared.red.HttpException
import kotlin.math.ceil
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

/**
 * Ficha de un juego (GameDetailScreen). Forma pensada para calzar directo
 * con `GET /api/mobile/games/{gameId}` (ver
 * src/app/api/mobile/CONTRACT.md en el proyecto Next.js): "grade" falta en
 * logros de Steam/Xbox sin metal, de ahí que sea nullable aquí también.
 */
enum class TrophyGrade { BRONZE, SILVER, GOLD, PLATINUM }

@Serializable
data class TrophyItem(
    val id: String,
    val name: String,
    val detail: String,
    val grade: TrophyGrade?,
    val earned: Boolean,
    val earnedAt: String?,
    val rarityPercent: Double?,
    val iconUrl: String? = null,
    /** Grupo de trofeos: "default" = juego base, otro = un DLC. */
    val groupId: String = "default",
    val groupName: String? = null,
)

@Serializable
data class PlatinumPrediction(val fechaMillis: Long, val dias: Int)


// Mismos umbrales que predecirPlatino() en lib/stats.ts, en el proyecto Next.js — no cambiar uno sin el otro.
private const val VENTANA_RITMO_DIAS = 14
private const val MINIMO_TROFEOS_PARA_RITMO = 2
private const val MAX_DIAS_PREDICCION = 730
private const val UN_DIA_MS = 86_400_000L

/**
 * "A este ritmo, lo tienes el jueves 24 de octubre" — mismo cálculo que la
 * web (predecirPlatino en lib/stats.ts): ritmo reciente de trofeos con fecha
 * proyectado sobre lo que falta. `null` si ya está, si no hay ritmo
 * reciente que medir, o si la proyección sale demasiado lejana para ser útil.
 * Se recalcula en cada composición (depende de "ahora"), nunca se guarda en
 * la caché offline.
 */
fun predecirPlatino(trophies: List<TrophyItem>): PlatinumPrediction? {
    // Con el platino ya conseguido no hay nada que predecir: lo que falte son
    // DLC (antes los contaba y predecía un "platino" que ya tenías).
    if (trophies.any { it.grade == TrophyGrade.PLATINUM && it.earned }) return null
    val restantes = trophies.count { !it.earned }
    if (restantes == 0) return null

    val ahora = ahoraMillis()
    val desdeVentana = ahora - VENTANA_RITMO_DIAS * UN_DIA_MS
    val recientes = trophies.count { t ->
        if (!t.earned || t.earnedAt == null) return@count false
        val millis = isoAMillis(t.earnedAt) ?: return@count false
        millis >= desdeVentana
    }
    if (recientes < MINIMO_TROFEOS_PARA_RITMO) return null

    val ritmoPorDia = recientes.toDouble() / VENTANA_RITMO_DIAS
    val dias = ceil(restantes / ritmoPorDia).toInt()
    if (dias > MAX_DIAS_PREDICCION) return null

    return PlatinumPrediction(ahora + dias * UN_DIA_MS, dias)
}

@Serializable
data class GameDetailData(
    val id: String,
    val title: String,
    val coverUrl: String,
    val earnedTrophies: Int,
    val totalTrophies: Int,
    val percent: Int,
    val isPinned: Boolean,
    val notes: String,
    val playtimeMinutes: Int?,
    val trophies: List<TrophyItem>,
    /** Ver DiarioPlatinoDto; nunca se guarda en la caché offline (se pide con red). */
    val diario: com.paragon.shared.red.DiarioPlatinoDto? = null,
)

sealed class GameDetailResult {
    // `fromCache = true` cuando viene de la guía de bolsillo offline
    // (CachedGameDetailEntity), no del servidor — FocusScreen lo usa para
    // avisar de que puede estar desactualizada.
    @Serializable
    data class Ok(val detail: GameDetailData, val fromCache: Boolean = false) : GameDetailResult()
    @Serializable
    data class Error(val message: String) : GameDetailResult()
}

@Serializable
data class PlatinoNuevo(val nombre: String, val iconUrl: String?)

/** `error` viene relleno solo si la plataforma no respondió — nunca es un 4xx/5xx, ver POST .../resync. */
@Serializable
data class ResyncOutcome(val nuevos: Int, val error: String?, val platinoNuevo: PlatinoNuevo? = null)

/** `Queued`: sin conexión, guardada en `pending_notes` para mandarla luego — no es un fallo real. */
enum class NoteSaveResult { Saved, Queued, Error }

private fun mapGrade(grade: String?): TrophyGrade? = when (grade) {
    "bronze" -> TrophyGrade.BRONZE
    "silver" -> TrophyGrade.SILVER
    "gold" -> TrophyGrade.GOLD
    "platinum" -> TrophyGrade.PLATINUM
    else -> null
}

private fun GameDetailDto.toGameDetailData(): GameDetailData = GameDetailData(
    id = id,
    title = title,
    // Sin fallback de portada propio: si iconUrl viene null, AsyncImage
    // simplemente no pinta nada — no hay una imagen "genérica" en el
    // proyecto todavía.
    coverUrl = iconUrl ?: "",
    earnedTrophies = earnedTotal,
    totalTrophies = definedTotal,
    percent = progressPercent,
    isPinned = isPinned ?: false,
    notes = notes ?: "",
    playtimeMinutes = playtimeMinutes,
    trophies = trophies.map {
        TrophyItem(
            id = it.id,
            name = it.name,
            detail = it.detail,
            grade = mapGrade(it.grade),
            earned = it.earned,
            earnedAt = it.earnedAt,
            rarityPercent = it.rarityPercent,
            iconUrl = it.iconUrl,
            groupId = it.groupId,
            groupName = it.groupName,
        )
    },
)

// Los trofeos del juego anclado se guardan en Room como JSON (nunca sale del móvil).
private val trophyListSerializer = ListSerializer(TrophyItem.serializer())

private fun GameDetailData.toCachedEntity() = CachedGameDetailEntity(
    gameId = id,
    title = title,
    coverUrl = coverUrl,
    earnedTrophies = earnedTrophies,
    totalTrophies = totalTrophies,
    percent = percent,
    notes = notes,
    trophiesJson = jsonParagon.encodeToString(trophyListSerializer, trophies),
    playtimeMinutes = playtimeMinutes,
)

private fun CachedGameDetailEntity.toDomain() = GameDetailData(
    id = gameId,
    title = title,
    coverUrl = coverUrl,
    earnedTrophies = earnedTrophies,
    totalTrophies = totalTrophies,
    percent = percent,
    isPinned = true, // solo se cachea el juego anclado (ver FocusScreen)
    notes = notes,
    playtimeMinutes = playtimeMinutes,
    trophies = try { jsonParagon.decodeFromString(trophyListSerializer, trophiesJson) } catch (e: Exception) { emptyList() },
)

class GameDetailRepository(
    private val tokenStore: TokenStore? = null,
    private val gameDetailDao: GameDetailDao? = null,
) {
    /**
     * Guía de bolsillo offline: red primero, y en cuanto responde se
     * refresca la caché local (mismo patrón "network-first, cache-aside"
     * que `LibraryRepository.getLibrary()`) — la nota pendiente sin
     * sincronizar (ver `saveNotes`) tiene prioridad sobre la que devuelva el
     * servidor, para no pisar algo que el usuario escribió sin conexión.
     */
    /** `de`: handle de otra persona para ver SU ficha (sin caché: la local es solo la tuya). */
    suspend fun getGameDetail(gameId: String, de: String? = null): GameDetailResult {
        val store = tokenStore ?: return GameDetailResult.Error(Textos.t(T.error_sin_sesion))
        if (de != null) {
            return try {
                val response = ApiClient.gamesApi(store).getGameDetail(gameId, de)
                GameDetailResult.Ok(response.game.toGameDetailData().copy(diario = response.diario))
            } catch (e: HttpException) {
                GameDetailResult.Error(if (e.code() == 404) Textos.t(T.ficha_err_no_existe) else Textos.t(T.error_servidor, e.code()))
            } catch (e: Exception) {
                GameDetailResult.Error(Textos.t(T.error_conexion))
            }
        }

        return try {
            val response = ApiClient.gamesApi(store).getGameDetail(gameId)
            var detail = response.game.toGameDetailData().copy(diario = response.diario)
            val pending = gameDetailDao?.getPendingNote(gameId)
            if (pending != null) detail = detail.copy(notes = pending.notes)
            gameDetailDao?.upsertDetail(detail.toCachedEntity())
            GameDetailResult.Ok(detail)
        } catch (e: HttpException) {
            val cached = gameDetailDao?.getCachedDetail(gameId)
            if (cached != null) return GameDetailResult.Ok(cached.toDomain(), fromCache = true)
            val message = if (e.code() == 404) {
                Textos.t(T.ficha_err_no_existe)
            } else {
                Textos.t(T.error_servidor, e.code())
            }
            GameDetailResult.Error(message)
        } catch (e: Exception) {
            val cached = gameDetailDao?.getCachedDetail(gameId)
            if (cached != null) return GameDetailResult.Ok(cached.toDomain(), fromCache = true)
            GameDetailResult.Error(Textos.t(T.error_conexion))
        }
    }

    /** Anclar/desanclar este juego como objetivo de Modo Enfoque. Desancla siempre lo anterior, nunca hay dos a la vez. */
    suspend fun togglePin(gameId: String): Boolean? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.gamesApi(store).togglePin(gameId).pinned
        } catch (e: Exception) {
            null
        }
    }

    /** Reservar/quitar este juego del Cerrojo de Hitos. */
    suspend fun toggleReserve(gameId: String): Boolean? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.gamesApi(store).toggleReserve(gameId).reservado
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Guarda (o borra, si viene vacía) la nota privada de Modo Enfoque. Sin
     * conexión, en vez de perderse en silencio (comportamiento de antes),
     * se encola en `pending_notes` y se refleja YA en la copia cacheada —
     * así si se reabre la pantalla sin haber recuperado la red todavía, la
     * nota sigue ahí. `flushPendingNotes()` la manda en cuanto vuelve la
     * conexión (ver ConnectivityObserver).
     */
    suspend fun saveNotes(gameId: String, notes: String): NoteSaveResult {
        val store = tokenStore ?: return NoteSaveResult.Error
        return try {
            val ok = ApiClient.gamesApi(store).saveNotes(gameId, NotesRequest(notes)).ok
            if (ok) {
                gameDetailDao?.clearPendingNote(gameId)
                gameDetailDao?.updateCachedNotes(gameId, notes)
                NoteSaveResult.Saved
            } else {
                NoteSaveResult.Error
            }
        } catch (e: Exception) {
            if (gameDetailDao != null) {
                gameDetailDao.upsertPendingNote(PendingNoteEntity(gameId, notes))
                gameDetailDao.updateCachedNotes(gameId, notes)
                NoteSaveResult.Queued
            } else {
                NoteSaveResult.Error
            }
        }
    }

    /**
     * Manda cualquier nota escrita sin conexión — se llama cuando
     * `ConnectivityObserver` detecta que ha vuelto la red. Sin efecto si no
     * hay ninguna pendiente (caso normal, la mayoría de las veces).
     */
    suspend fun flushPendingNotes() {
        val store = tokenStore ?: return
        val dao = gameDetailDao ?: return
        for (pending in dao.getAllPendingNotes()) {
            try {
                val ok = ApiClient.gamesApi(store).saveNotes(pending.gameId, NotesRequest(pending.notes)).ok
                if (ok) dao.clearPendingNote(pending.gameId)
            } catch (e: Exception) {
                // Se queda en la cola — se reintenta en la próxima reconexión.
            }
        }
    }

    /**
     * Vídeo de guía en YouTube para un trofeo (mismo dato cacheado que la
     * web, ver GamesApi.kt) — `null` si no se encontró ninguno o si falla la
     * llamada. Sin caché local: es contenido externo, no un dato de progreso
     * que haga falta ver sin conexión.
     */
    suspend fun getTrophyGuide(gameId: String, trophyId: String): String? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.gamesApi(store).getTrophyGuide(gameId, trophyId).videoId
        } catch (e: Exception) {
            null
        }
    }

    /** "¿Ya lo tengo?" — vuelve a pedir los trofeos de este juego sin esperar al cron. */
    suspend fun resync(gameId: String): ResyncOutcome {
        val store = tokenStore ?: return ResyncOutcome(0, Textos.t(T.error_sin_sesion))
        return try {
            val response = ApiClient.gamesApi(store).resync(gameId)
            ResyncOutcome(response.nuevos, response.error, response.platinoNuevo?.let { PlatinoNuevo(it.nombre, it.iconUrl) })
        } catch (e: HttpException) {
            ResyncOutcome(0, e.paragonErrorMessage() ?: Textos.t(T.error_servidor, e.code()))
        } catch (e: Exception) {
            ResyncOutcome(0, Textos.t(T.error_conexion))
        }
    }

}
