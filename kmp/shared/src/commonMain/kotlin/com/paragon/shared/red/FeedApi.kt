package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

// Sin @JsonClass(generateAdapter = true) — mismo motivo que el resto de
// DTOs de este paquete: KotlinJsonAdapterFactory los lee por reflexión.
@Serializable
data class FeedUserDto(val id: String, val handle: String?, val name: String?, val image: String?)
@Serializable
data class FeedGameDto(val id: String, val title: String, val iconUrl: String?, val deviceLabel: String?)
@Serializable
data class FeedCommentDto(val activityId: String, val body: String, val userName: String, val createdAt: String)

@Serializable
data class FeedItemDto(
    val id: String,
    val type: String,
    val rating: Int?,
    val review: String?,
    val createdAt: String,
    val user: FeedUserDto,
    // Nulo para los estados libres ("status"): no llevan juego.
    val game: FeedGameDto?,
    val reactions: Int,
    val reacted: Boolean,
    // Con cuál de los 5 emojis reaccionó esta cuenta (ver REACCIONES); null si ninguno.
    val miReaccion: String? = null,
    val comments: List<FeedCommentDto> = emptyList(),
    val views: Int = 0,
)

@Serializable
data class FeedResponse(val items: List<FeedItemDto>)

@Serializable
data class ReactResponse(val reacted: Boolean)

@Serializable
data class ReactRequest(val reaction: String)

@Serializable
data class ViewResponse(val isNew: Boolean)

@Serializable
data class NewCommentRequest(val body: String)

class FeedApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/feed/route.ts en el proyecto Next.js. */
    suspend fun getFeed(): FeedResponse =
        c.http.get("api/mobile/feed").body()

    /** Alterna la reacción a una publicación (👏🔥🏆😂😮) — ver .../feed/{activityId}/react/route.ts. */
    suspend fun react(activityId: String, request: ReactRequest): ReactResponse =
        c.http.post("api/mobile/feed/${activityId.encodeURLPathPart()}/react") { json(request) }.body()

    /** Registra que se ha visto una publicación — ver .../feed/{activityId}/view/route.ts. */
    suspend fun registerView(activityId: String): ViewResponse =
        c.http.post("api/mobile/feed/${activityId.encodeURLPathPart()}/view").body()

    /** Añade un comentario — ver .../feed/{activityId}/comment/route.ts. */
    suspend fun addComment(activityId: String, request: NewCommentRequest): FeedCommentDto =
        c.http.post("api/mobile/feed/${activityId.encodeURLPathPart()}/comment") { json(request) }.body()
}
