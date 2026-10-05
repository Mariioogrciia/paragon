package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** Ver src/app/api/mobile/appearance/route.ts — la misma apariencia que la web. */
data class PaletaJuegoDto(
    val rgb: String,
    val rgbClaro: String,
    val c2: String,
    val bg: String,
    val surface: String,
    val surface2: String,
    val border: String,
)

data class AcentoJuegoDto(val id: String, val color: String, val paleta: PaletaJuegoDto? = null)

data class AparienciaDto(
    val guardada: Boolean = false,
    val acento: String = "",
    val acentoLibre: String = "",
    val acentoJuego: AcentoJuegoDto? = null,
    val estilo: String = "",
    val tamanoTexto: String = "",
    val nivel: Int = 1,
    val requisitosEstilo: Map<String, Int> = emptyMap(),
)

data class GuardarAparienciaRequest(
    val acento: String,
    val acentoLibre: String,
    val acentoJuego: AcentoJuegoDto?,
    val estilo: String,
    val tamanoTexto: String,
)

interface AparienciaApi {
    @GET("api/mobile/appearance")
    suspend fun obtener(): AparienciaDto

    @POST("api/mobile/appearance")
    suspend fun guardar(@Body body: GuardarAparienciaRequest): AparienciaDto
}
