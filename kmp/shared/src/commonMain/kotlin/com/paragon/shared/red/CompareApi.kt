package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class CompareSideDto(val name: String, val avatarUrl: String?, val level: Int, val platinos: Int, val trofeos: Int, val juegos: Int)

@Serializable
data class SharedGameDto(
    val id: String,
    val title: String,
    val iconUrl: String?,
    val myPercent: Int,
    val theirPercent: Int,
    val myHours: Double?,
    val theirHours: Double?,
)

// "gano"/"pierdo"/"empate", por platinos — mismo criterio que "Vas ganando" en la web.
@Serializable
data class CompareResponse(
    val resultado: String,
    val me: CompareSideDto,
    val them: CompareSideDto,
    val sharedGames: List<SharedGameDto>,
)

class CompareApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/compare/[handle]/route.ts. 404 si no existe, 409 sin cuentas vinculadas. */
    suspend fun compare(handle: String): CompareResponse =
        c.http.get("api/mobile/compare/${handle.encodeURLPathPart()}").body()
}
