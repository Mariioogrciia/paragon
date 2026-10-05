package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

/** Online ID de PSN / gamertag de Xbox / SteamID — para añadirlos directamente en esa plataforma. */
@Serializable
data class AmigoCuentaDto(val platform: String, val username: String)

@Serializable
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
    val accounts: List<AmigoCuentaDto> = emptyList(),
)

@Serializable
data class LigaDto(
    val userId: String,
    val handle: String?,
    val name: String?,
    val image: String?,
    val points: Int,
)

@Serializable
data class SocialResponse(val amigos: List<AmigoDto>, val liga: List<LigaDto>)

class SocialApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/social/route.ts en el proyecto Next.js. */
    suspend fun getSocial(): SocialResponse =
        c.http.get("api/mobile/social").body()
}
