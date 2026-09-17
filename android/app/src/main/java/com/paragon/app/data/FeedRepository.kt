package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.FeedCommentDto
import com.paragon.app.data.network.FeedItemDto
import com.paragon.app.data.network.NewCommentRequest
import retrofit2.HttpException
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** Un comentario ya existente en una publicación — de momento solo lectura, no hay POST desde la app todavía. */
data class FeedComment(val body: String, val userName: String, val timeAgo: String)

/** Actividad propia + amigos (FeedScreen) — ver GET /api/mobile/feed en API-CONTRACT.md. */
data class FeedItem(
    val id: String,
    val type: String,
    val rating: Int?,
    val review: String?,
    val userName: String,
    val gameTitle: String,
    val reactions: Int,
    val reacted: Boolean,
    val timeAgo: String,
    val userHandle: String,
    val comments: List<FeedComment> = emptyList(),
    val views: Int = 0,
)

sealed class FeedResult {
    data class Ok(val items: List<FeedItem>) : FeedResult()
    data class Error(val message: String) : FeedResult()
}

/** "type" de activities (src/db/schema.ts) → frase en español, mismo criterio que la web. */
fun mensajeFeed(item: FeedItem): String = when (item.type) {
    "platinum" -> "Ha conseguido el Platino en ${item.gameTitle}."
    "new_game" -> "Ha empezado a jugar a ${item.gameTitle}."
    "review" -> "Ha escrito una reseña de ${item.gameTitle}."
    "rating" -> "Ha valorado ${item.gameTitle}" + (item.rating?.let { " con $it/10." } ?: ".")
    "favorite" -> "Ha marcado ${item.gameTitle} como favorito."
    else -> "Ha hecho algo en ${item.gameTitle}."
}

// minSdk 24 no tiene java.time sin desugaring — SimpleDateFormat/Date sí
// funcionan en cualquier API, de ahí no usar Instant aquí.
private val ISO_FORMAT = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("UTC")
}

private fun relativeTimeEs(iso: String): String {
    val millis = try {
        ISO_FORMAT.parse(iso)?.time
    } catch (e: Exception) {
        null
    } ?: return ""

    val diffMinutes = (System.currentTimeMillis() - millis) / 60_000
    return when {
        diffMinutes < 1 -> "ahora mismo"
        diffMinutes < 60 -> "hace ${diffMinutes}min"
        diffMinutes < 60 * 24 -> "hace ${diffMinutes / 60}h"
        else -> "hace ${diffMinutes / (60 * 24)}d"
    }
}

private fun FeedItemDto.toFeedItem() = FeedItem(
    id = id,
    type = type,
    rating = rating,
    review = review,
    userName = user.name ?: user.handle ?: "Alguien",
    gameTitle = game.title,
    reactions = reactions,
    reacted = reacted,
    timeAgo = relativeTimeEs(createdAt),
    userHandle = user.handle ?: "",
    comments = comments.map { it.toFeedComment() },
    views = views,
)

private fun FeedCommentDto.toFeedComment() = FeedComment(
    body = body,
    userName = userName,
    timeAgo = relativeTimeEs(createdAt),
)

class FeedRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getFeed(): FeedResult {
        val store = tokenStore ?: return FeedResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.feedApi(store).getFeed()
            FeedResult.Ok(response.items.map { it.toFeedItem() })
        } catch (e: HttpException) {
            FeedResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            FeedResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** Alterna la reacción a una publicación — `null` si falla la llamada (quien la usa ya pinta en optimista antes). */
    suspend fun toggleReaction(activityId: String): Boolean? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.feedApi(store).react(activityId).reacted
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Registra una visualización — idempotente en el servidor. Devuelve si
     * era nueva (para sumar +1 en el contador ya pintado) o `null` si falla
     * la llamada (se deja pasar en silencio, es un contador, no una acción
     * del usuario).
     */
    suspend fun registerView(activityId: String): Boolean? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.feedApi(store).registerView(activityId).isNew
        } catch (e: Exception) {
            null
        }
    }

    /** Añade un comentario — `null` si falla la llamada o queda vacío. */
    suspend fun addComment(activityId: String, body: String): FeedComment? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.feedApi(store).addComment(activityId, NewCommentRequest(body)).toFeedComment()
        } catch (e: Exception) {
            null
        }
    }
}
