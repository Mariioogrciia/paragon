package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class PanelProfileDto(
    val handle: String,
    val name: String,
    val level: Int,
    val psnId: String?,
    val image: String?,
)

@Serializable
data class PanelStatsDto(
    val platinums: Int,
    val trophies: Int,
    val games: Int,
    val completionRate: Int,
    val gold: Int,
    val silver: Int,
    val bronze: Int,
)

@Serializable
data class PanelRachaDto(
    val actual: Int,
    val mejor: Int,
)

@Serializable
data class PanelResponse(
    val profile: PanelProfileDto,
    val stats: PanelStatsDto,
    val racha: PanelRachaDto,
)

class PanelApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/panel/route.ts en el proyecto Next.js. */
    suspend fun getPanel(): PanelResponse =
        c.http.get("api/mobile/panel").body()
}
