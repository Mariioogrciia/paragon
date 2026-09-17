package com.paragon.app.data.network

import retrofit2.http.GET

// Sin @JsonClass(generateAdapter = true) a propósito: eso pide el
// annotation processor de Moshi (kapt), que este módulo no tiene montado.
// ApiClient.kt registra KotlinJsonAdapterFactory (reflexión), que lee estas
// mismas data class sin generar nada en tiempo de compilación.
data class PanelProfileDto(
    val handle: String,
    val name: String,
    val level: Int,
    val psnId: String?,
    val image: String?,
)

data class PanelStatsDto(
    val platinums: Int,
    val trophies: Int,
    val games: Int,
    val completionRate: Int,
)

data class PanelRachaDto(
    val actual: Int,
    val mejor: Int,
)

data class PanelResponse(
    val profile: PanelProfileDto,
    val stats: PanelStatsDto,
    val racha: PanelRachaDto,
)

interface PanelApi {
    /** Ver src/app/api/mobile/panel/route.ts en el proyecto Next.js. */
    @GET("api/mobile/panel")
    suspend fun getPanel(): PanelResponse
}
