package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

/** Ver src/app/api/mobile/appearance/route.ts — la misma apariencia que la web. */
@Serializable
data class PaletaJuegoDto(
    val rgb: String,
    val rgbClaro: String,
    val c2: String,
    val bg: String,
    val surface: String,
    val surface2: String,
    val border: String,
)

@Serializable
data class AcentoJuegoDto(val id: String, val color: String, val paleta: PaletaJuegoDto? = null)

@Serializable
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

@Serializable
data class GuardarAparienciaRequest(
    val acento: String,
    val acentoLibre: String,
    val acentoJuego: AcentoJuegoDto?,
    val estilo: String,
    val tamanoTexto: String,
)

class AparienciaApi internal constructor(private val c: ClienteParagon) {
    suspend fun obtener(): AparienciaDto =
        c.http.get("api/mobile/appearance").body()

    suspend fun guardar(body: GuardarAparienciaRequest): AparienciaDto =
        c.http.post("api/mobile/appearance") { json(body) }.body()
}
