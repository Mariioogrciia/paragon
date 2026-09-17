package com.paragon.app.data.network

import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

// Sin @JsonClass(generateAdapter = true) — mismo motivo que el resto de
// DTOs de este paquete: KotlinJsonAdapterFactory los lee por reflexión.
data class FeedUserDto(val id: String, val handle: String?, val name: String?, val image: String?)
data class FeedGameDto(val id: String, val title: String, val iconUrl: String?, val deviceLabel: String?)
data class FeedCommentDto(val activityId: String, val body: String, val userName: String, val createdAt: String)

data class FeedItemDto(
    val id: String,
    val type: String,
    val rating: Int?,
    val review: String?,
    val createdAt: String,
    val user: FeedUserDto,
    val game: FeedGameDto,
    val reactions: Int,
    val reacted: Boolean,
    val comments: List<FeedCommentDto> = emptyList(),
)

data class FeedResponse(val items: List<FeedItemDto>)

data class ReactResponse(val reacted: Boolean)

interface FeedApi {
    /** Ver src/app/api/mobile/feed/route.ts en el proyecto Next.js. */
    @GET("api/mobile/feed")
    suspend fun getFeed(): FeedResponse

    /** Alterna la reacción a una publicación — ver .../feed/{activityId}/react/route.ts. */
    @POST("api/mobile/feed/{activityId}/react")
    suspend fun react(@Path("activityId") activityId: String): ReactResponse
}
