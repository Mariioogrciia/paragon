package com.paragon.app.data.network

import retrofit2.http.GET

data class AmigoDto(
    val userId: String,
    val name: String?,
    val handle: String?,
    val avatarUrl: String?,
    val trophyLevel: Int?,
    val platinos: Int,
    val trofeos: Int,
    val juegos: Int,
    val completadoMedio: Int,
)

data class LigaDto(
    val userId: String,
    val handle: String?,
    val name: String?,
    val image: String?,
    val points: Int,
)

data class SocialResponse(val amigos: List<AmigoDto>, val liga: List<LigaDto>)

interface SocialApi {
    /** Ver src/app/api/mobile/social/route.ts en el proyecto Next.js. */
    @GET("api/mobile/social")
    suspend fun getSocial(): SocialResponse
}
