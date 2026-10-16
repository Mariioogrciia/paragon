package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*

/** Un aviso de la bandeja — ver src/lib/bandeja.ts y api/mobile/avisos/route.ts. */
@Serializable
data class AvisoDto(
    val id: String,
    val titulo: String,
    val texto: String,
    val ruta: String? = null,
    val imagen: String? = null,
    val leido: Boolean = false,
    val createdAt: String,
)

@Serializable
data class AvisosResponse(val avisos: List<AvisoDto> = emptyList(), val noLeidos: Int = 0)

class AvisosApi internal constructor(private val c: ClienteParagon) {
    suspend fun avisos(): AvisosResponse = c.http.get("api/mobile/avisos").body()

    /** Todo leído (al abrir la pantalla de avisos). */
    suspend fun marcarLeidos(): SuccessResponse = c.http.post("api/mobile/avisos").body()
}
