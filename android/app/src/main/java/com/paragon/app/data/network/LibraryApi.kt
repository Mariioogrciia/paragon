package com.paragon.app.data.network

import retrofit2.http.GET

// Sin @JsonClass(generateAdapter = true) — mismo motivo que PanelApi.kt/
// GamesApi.kt: KotlinJsonAdapterFactory (reflexión) lee estas data class
// directamente, sin kapt.
data class LibraryGameDto(
    val id: String,
    val platform: String,
    val title: String,
    val iconUrl: String?,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    val isWishlist: Boolean,
    val lastPlayedAt: String?,
)

data class LibraryResponse(val games: List<LibraryGameDto>)

interface LibraryApi {
    /** Ver src/app/api/mobile/library/route.ts en el proyecto Next.js. */
    @GET("api/mobile/library")
    suspend fun getLibrary(): LibraryResponse
}
