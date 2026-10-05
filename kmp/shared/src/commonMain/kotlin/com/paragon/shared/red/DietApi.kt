package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class DietaJuegoDto(val gameId: String, val titulo: String)
@Serializable
data class DietaGamerDto(val genero: String, val juegos: List<DietaJuegoDto>, val horasTotales: Int)
@Serializable
data class DietResponse(val dieta: DietaGamerDto?)

/** "Dieta Gamer" — ver src/app/api/mobile/diet/route.ts en el proyecto Next.js. */
class DietApi internal constructor(private val c: ClienteParagon) {
    suspend fun getDiet(): DietResponse =
        c.http.get("api/mobile/diet").body()
}
