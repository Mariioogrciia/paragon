package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.GameDetailDto
import com.paragon.app.data.network.NotesRequest
import com.paragon.app.data.network.paragonErrorMessage
import retrofit2.HttpException

/**
 * Ficha de un juego (GameDetailScreen). Forma pensada para calzar directo
 * con `GET /api/mobile/games/{gameId}` (ver
 * src/app/api/mobile/CONTRACT.md en el proyecto Next.js): "grade" falta en
 * logros de Steam/Xbox sin metal, de ahí que sea nullable aquí también.
 */
enum class TrophyGrade { BRONZE, SILVER, GOLD, PLATINUM }

data class TrophyItem(
    val id: String,
    val name: String,
    val detail: String,
    val grade: TrophyGrade?,
    val earned: Boolean,
    val earnedAt: String?,
    val rarityPercent: Double?,
)

data class GameDetailData(
    val id: String,
    val title: String,
    val coverUrl: String,
    val earnedTrophies: Int,
    val totalTrophies: Int,
    val percent: Int,
    val isPinned: Boolean,
    val notes: String,
    val trophies: List<TrophyItem>,
)

sealed class GameDetailResult {
    data class Ok(val detail: GameDetailData) : GameDetailResult()
    data class Error(val message: String) : GameDetailResult()
}

/** `error` viene relleno solo si la plataforma no respondió — nunca es un 4xx/5xx, ver POST .../resync. */
data class ResyncOutcome(val nuevos: Int, val error: String?)

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
    trophies = trophies.map {
        TrophyItem(
            id = it.id,
            name = it.name,
            detail = it.detail,
            grade = mapGrade(it.grade),
            earned = it.earned,
            earnedAt = it.earnedAt,
            rarityPercent = it.rarityPercent,
        )
    },
)

class GameDetailRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getGameDetail(gameId: String): GameDetailResult {
        val store = tokenStore ?: return GameDetailResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.gamesApi(store).getGameDetail(gameId)
            GameDetailResult.Ok(response.game.toGameDetailData())
        } catch (e: HttpException) {
            val message = if (e.code() == 404) {
                "Este juego no existe o no es tuyo."
            } else {
                "El servidor respondió con un error (${e.code()})."
            }
            GameDetailResult.Error(message)
        } catch (e: Exception) {
            GameDetailResult.Error(e.message ?: "No se pudo conectar con Paragon.")
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

    /** Guarda (o borra, si viene vacía) la nota privada de Modo Enfoque. */
    suspend fun saveNotes(gameId: String, notes: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.gamesApi(store).saveNotes(gameId, NotesRequest(notes)).ok
        } catch (e: Exception) {
            false
        }
    }

    /** "¿Ya lo tengo?" — vuelve a pedir los trofeos de este juego sin esperar al cron. */
    suspend fun resync(gameId: String): ResyncOutcome {
        val store = tokenStore ?: return ResyncOutcome(0, "Sin sesión.")
        return try {
            val response = ApiClient.gamesApi(store).resync(gameId)
            ResyncOutcome(response.nuevos, response.error)
        } catch (e: HttpException) {
            ResyncOutcome(0, e.paragonErrorMessage() ?: "El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            ResyncOutcome(0, e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /**
     * Mantenido para pruebas/preview de Compose — las tarjetas de
     * PanelScreen (Panel sigue con datos mock salvo perfil/stats) usan ids
     * inventados ("1", "2"...) que no existen en la base real, así que
     * pulsarlas hoy lleva a getGameDetail() a devolver un 404 real, no un
     * fallo — eso se arregla cuando el Panel deje de usar recentGames/
     * nearPlatinum de mentira.
     */
    fun getMockGameDetail(gameId: String): GameDetailData {
        val trophies = listOf(
            TrophyItem("t1", "Elden Lord", "Consigue uno de los finales del juego.", TrophyGrade.PLATINUM, true, "2026-09-10T07:55:00.000Z", 4.2),
            TrophyItem("t2", "Portador de la Gran Runa", "Restaura una Gran Runa.", TrophyGrade.GOLD, true, "2026-09-08T20:10:00.000Z", 31.7),
            TrophyItem("t3", "Maestro de las artes marciales", "Domina las artes del combate.", TrophyGrade.GOLD, false, null, 18.4),
            TrophyItem("t4", "Coleccionista de hechizos", "Consigue todos los hechizos de Gloria.", TrophyGrade.SILVER, true, "2026-08-30T18:00:00.000Z", 45.9),
            TrophyItem("t5", "Primer contacto", "Derrota al primer jefe de campo.", TrophyGrade.BRONZE, true, "2026-08-01T12:00:00.000Z", 78.1),
        )
        val earned = trophies.count { it.earned }

        return GameDetailData(
            id = gameId,
            title = "Elden Ring",
            coverUrl = "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
            earnedTrophies = earned,
            totalTrophies = trophies.size,
            percent = (earned * 100) / trophies.size,
            isPinned = false,
            notes = "",
            trophies = trophies,
        )
    }
}
