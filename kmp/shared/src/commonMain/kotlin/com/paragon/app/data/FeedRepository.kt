package com.paragon.app.data

import com.paragon.shared.red.jsonParagon

import kotlinx.serialization.Serializable

import kotlinx.serialization.builtins.ListSerializer

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.SimpleCacheDao
import com.paragon.app.data.local.SimpleCacheEntity
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.FeedCommentDto
import com.paragon.shared.red.FeedItemDto
import com.paragon.shared.red.NewCommentRequest
import com.paragon.shared.red.ReactRequest
import com.paragon.shared.red.HttpException
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

/** Un comentario ya existente en una publicación — de momento solo lectura, no hay POST desde la app todavía. */
@Serializable
data class FeedComment(val body: String, val userName: String, val timeAgo: String)

/** Reacciones del feed — mismas 5 y mismo orden que `lib/reacciones.ts` en la web. */
@Serializable
data class Reaccion(val clave: String, val emoji: String)
val REACCIONES = listOf(
    Reaccion("aplauso", "👏"),
    Reaccion("fuego", "🔥"),
    Reaccion("trofeo", "🏆"),
    Reaccion("risa", "😂"),
    Reaccion("sorpresa", "😮"),
)
fun emojiDeReaccion(clave: String?): String = REACCIONES.find { it.clave == clave }?.emoji ?: REACCIONES[0].emoji

/** Actividad propia + amigos (FeedScreen) — ver GET /api/mobile/feed en API-CONTRACT.md. */
@Serializable
data class FeedItem(
    val id: String,
    val type: String,
    val rating: Int?,
    val review: String?,
    val userName: String,
    // Nulo para los estados libres ("status"): no llevan juego.
    val gameTitle: String?,
    val reactions: Int,
    val reacted: Boolean,
    // Con cuál de las 5 reacciones (ver REACCIONES); null si no ha reaccionado.
    val miReaccion: String?,
    val timeAgo: String,
    val userHandle: String,
    val comments: List<FeedComment> = emptyList(),
    val views: Int = 0,
    /** Foto de quien publica (la misma que en la web: avatarUrlSql). Con valor por defecto: la caché guardada antes no la tiene. */
    val userImage: String? = null,
)

sealed class FeedResult {
    @Serializable
    data class Ok(val items: List<FeedItem>, val fromCache: Boolean = false) : FeedResult()
    @Serializable
    data class Error(val message: String) : FeedResult()
}

/** "type" de activities (src/db/schema.ts) → frase en español, mismo criterio que la web. "status" no lleva frase: el propio texto (item.review) ya lo es. */
fun mensajeFeed(item: FeedItem): String = when (item.type) {
    "platinum" -> Textos.t(T.feed_platino, item.gameTitle ?: "")
    "new_game" -> Textos.t(T.feed_nuevo, item.gameTitle ?: "")
    "review" -> Textos.t(T.feed_resena, item.gameTitle ?: "")
    "rating" -> Textos.t(T.feed_valoro, item.gameTitle ?: "") + (item.rating?.let { Textos.t(T.feed_nota, it) } ?: ".")
    "favorite" -> Textos.t(T.feed_favorito, item.gameTitle ?: "")
    "status" -> ""
    else -> item.gameTitle?.let { Textos.t(T.feed_otro, it) } ?: Textos.t(T.feed_otro_sin)
}

/** "ahora", "5 min", "3 h", "2 d" — también lo usa "Últimos trofeos" del Panel. */
internal fun relativeTimeEs(iso: String): String {
    val millis = isoAMillis(iso) ?: return ""

    val diffMinutes = (ahoraMillis() - millis) / 60_000
    return when {
        diffMinutes < 1 -> Textos.t(T.tiempo_ahora)
        diffMinutes < 60 -> Textos.t(T.tiempo_min, diffMinutes)
        diffMinutes < 60 * 24 -> Textos.t(T.tiempo_h, diffMinutes / 60)
        else -> Textos.t(T.tiempo_d, diffMinutes / (60 * 24))
    }
}

private fun FeedItemDto.toFeedItem() = FeedItem(
    id = id,
    type = type,
    rating = rating,
    review = review,
    userName = user.name ?: user.handle ?: Textos.t(T.comun_alguien),
    userImage = user.image,
    gameTitle = game?.title,
    reactions = reactions,
    reacted = reacted,
    miReaccion = miReaccion,
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

private const val CACHE_KEY = "feed_items"
private val feedListSerializer = ListSerializer(FeedItem.serializer())

class FeedRepository(private val tokenStore: TokenStore? = null, private val cacheDao: SimpleCacheDao? = null) {
    /** Red primero, caché de respaldo (mismo patrón que Library/Panel/GameDetail) — Comunidad se quedaba en blanco sin conexión. */
    suspend fun getFeed(): FeedResult {
        val store = tokenStore ?: return FeedResult.Error(Textos.t(T.error_sin_sesion))

        return try {
            val response = ApiClient.feedApi(store).getFeed()
            val items = response.items.map { it.toFeedItem() }
            cacheDao?.put(SimpleCacheEntity(CACHE_KEY, jsonParagon.encodeToString(feedListSerializer, items)))
            FeedResult.Ok(items)
        } catch (e: HttpException) {
            cachedFeed() ?: FeedResult.Error(Textos.t(T.error_servidor, e.code()))
        } catch (e: Exception) {
            cachedFeed() ?: FeedResult.Error(Textos.t(T.error_conexion))
        }
    }

    private suspend fun cachedFeed(): FeedResult.Ok? {
        val json = cacheDao?.get(CACHE_KEY) ?: return null
        val items = try { jsonParagon.decodeFromString(feedListSerializer, json) } catch (e: Exception) { null } ?: return null
        return FeedResult.Ok(items, fromCache = true)
    }

    /**
     * Alterna la reacción a una publicación — `reaction` es una clave de
     * REACCIONES ("aplauso" si no se especifica). La misma otra vez la
     * quita; otra distinta la cambia (ver `toggleActivityReaction` en
     * lib/feed.ts, mismo comportamiento). `null` si falla la llamada (quien
     * la usa ya pinta en optimista antes).
     */
    suspend fun toggleReaction(activityId: String, reaction: String = "aplauso"): Boolean? {
        val store = tokenStore ?: return null
        return try {
            ApiClient.feedApi(store).react(activityId, ReactRequest(reaction)).reacted
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
