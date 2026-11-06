package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*

/* Lo de la web del 5 nov 2026 que pasó a la app el 6 nov: evento del mes,
 * "Pregúntale a Paragon" y otros canales de avisos (Telegram, correo). */

@Serializable
data class ParticipanteEventoDto(
    val handle: String? = null,
    val nombre: String? = null,
    val imagen: String? = null,
    val puntos: Int = 0,
    val trofeos: Int = 0,
    val platinos: Int = 0,
    val soyYo: Boolean = false,
)

@Serializable
data class EventoAnteriorDto(val mes: String = "", val categoria: String = "", val podio: List<ParticipanteEventoDto> = emptyList())

/** api/mobile/evento: el género del mes (`categoria`, clave de lib/trophyDna.ts), el ranking y el podio anterior. */
@Serializable
data class EventoDto(
    val mes: String = "",
    val categoria: String = "",
    val diasRestantes: Int = 0,
    val ranking: List<ParticipanteEventoDto> = emptyList(),
    val anterior: EventoAnteriorDto = EventoAnteriorDto(),
)

@Serializable
data class TurnoAsistenteDto(val rol: String, val texto: String)

@Serializable
data class PreguntaRequest(val pregunta: String, val historial: List<TurnoAsistenteDto>)

/** `ok` con `texto`, o `motivo`: inactivo, limite, rechazo, fallo. */
@Serializable
data class RespuestaAsistenteDto(val ok: Boolean = false, val texto: String? = null, val motivo: String? = null)

@Serializable
data class AsistenteActivoDto(val activo: Boolean = false)

@Serializable
data class TelegramDto(val vinculado: Boolean = false, val enlace: String? = null)

/** Cada canal es null si el servidor no lo tiene montado. */
@Serializable
data class CanalesAvisosDto(val telegram: TelegramDto? = null, val correoSemanal: Boolean? = null)

@Serializable
data class CambiarCanalesRequest(val correoSemanal: Boolean? = null, val desvincularTelegram: Boolean? = null)

class NovedadesApi internal constructor(private val c: ClienteParagon) {
    suspend fun evento(): EventoDto = c.http.get("api/mobile/evento").body()

    suspend fun asistenteActivo(): AsistenteActivoDto = c.http.get("api/mobile/preguntar").body()

    suspend fun preguntar(cuerpo: PreguntaRequest): RespuestaAsistenteDto =
        c.http.post("api/mobile/preguntar") { json(cuerpo) }.body()

    suspend fun canales(): CanalesAvisosDto = c.http.get("api/mobile/avisos/canales").body()

    suspend fun cambiarCanales(cuerpo: CambiarCanalesRequest): CanalesAvisosDto =
        c.http.patch("api/mobile/avisos/canales") { json(cuerpo) }.body()
}
