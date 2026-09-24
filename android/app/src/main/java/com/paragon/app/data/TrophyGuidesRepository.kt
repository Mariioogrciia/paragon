package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.SaveTrophyGuideRequest
import retrofit2.HttpException

/** Guía escrita de un trofeo — apuntes reales de la comunidad, distinto del vídeo de YouTube (ver GameDetailRepository.getTrophyGuide). Una fila por (usuario, juego, trofeo). */
data class TrophyGuideRow(
    val id: String,
    val body: String,
    val createdAt: String,
    val updatedAt: String,
    val authorId: String,
    val authorHandle: String?,
    val authorName: String?,
    val authorImage: String?,
)

sealed class TrophyGuidesResult {
    data class Ok(val guides: List<TrophyGuideRow>, val currentUserId: String?) : TrophyGuidesResult()
    data class Error(val message: String) : TrophyGuidesResult()
}

class TrophyGuidesRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getGuides(gameId: String, trophyId: String): TrophyGuidesResult {
        val store = tokenStore ?: return TrophyGuidesResult.Error("Sin sesión.")
        return try {
            val response = ApiClient.trophyGuidesApi(store).getGuides(gameId, trophyId)
            TrophyGuidesResult.Ok(
                guides = response.guides.map { TrophyGuideRow(it.id, it.body, it.createdAt, it.updatedAt, it.authorId, it.authorHandle, it.authorName, it.authorImage) },
                currentUserId = response.currentUserId,
            )
        } catch (e: Exception) {
            TrophyGuidesResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** `null` si se publicó bien; el mensaje de error si no (vacía, o pasa de 4000 caracteres). */
    suspend fun saveGuide(gameId: String, trophyId: String, body: String): String? {
        val store = tokenStore ?: return "Sin sesión."
        return try {
            ApiClient.trophyGuidesApi(store).saveGuide(gameId, trophyId, SaveTrophyGuideRequest(body))
            null
        } catch (e: HttpException) {
            e.message ?: "No se ha podido guardar la guía."
        } catch (e: Exception) {
            e.message ?: "No se pudo conectar con Paragon."
        }
    }

    suspend fun deleteGuide(gameId: String, trophyId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.trophyGuidesApi(store).deleteGuide(gameId, trophyId)
            true
        } catch (e: Exception) {
            false
        }
    }
}
