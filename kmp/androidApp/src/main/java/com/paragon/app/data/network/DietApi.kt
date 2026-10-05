package com.paragon.app.data.network

import retrofit2.http.GET

data class DietaJuegoDto(val gameId: String, val titulo: String)
data class DietaGamerDto(val genero: String, val juegos: List<DietaJuegoDto>, val horasTotales: Int)
data class DietResponse(val dieta: DietaGamerDto?)

/** "Dieta Gamer" — ver src/app/api/mobile/diet/route.ts en el proyecto Next.js. */
interface DietApi {
    @GET("api/mobile/diet")
    suspend fun getDiet(): DietResponse
}
