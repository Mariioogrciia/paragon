package com.paragon.shared.red

import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.http.encodeURLPathPart
import kotlinx.serialization.Serializable

@Serializable
data class SesionPersonaDto(val userId: String, val handle: String? = null, val name: String? = null, val image: String? = null, val ayuda: Boolean = false)

@Serializable
data class SesionJuegoDto(
    val id: String,
    val titulo: String,
    val iconUrl: String? = null,
    val platform: String,
    val deviceLabel: String = "",
)

@Serializable
data class SesionTrofeoInfoDto(val trophyId: String? = null, val iconUrl: String? = null, val grade: String? = null, val detail: String = "")

/** Ver CONTRACT.md → Sesiones y SesionVista en src/lib/sesiones.ts. Plazas: total contando a quien organiza. */
@Serializable
data class SesionDto(
    val id: String,
    val trofeo: String,
    val trofeoInfo: SesionTrofeoInfoDto? = null,
    val descripcion: String? = null,
    val fechaHora: String,
    val plazasTotales: Int,
    val ocupadas: Int,
    val libres: Int,
    val cancelada: Boolean = false,
    val juego: SesionJuegoDto,
    val anfitrion: SesionPersonaDto,
    val participantes: List<SesionPersonaDto> = emptyList(),
    val soyAnfitrion: Boolean = false,
    val estoyApuntado: Boolean = false,
    /** Quien mira ya tiene el trofeo: si se une, es para ayudar. */
    val yaLoTengo: Boolean = false,
    val loTengo: Boolean = false,
    /** Tu copia del juego, para abrir tu ficha en ese trofeo. */
    val miJuegoId: String? = null,
)

/** Un juego tuyo con el que se puede organizar (biblioteca sin completar). */
@Serializable
data class JuegoSesionDto(val id: String, val titulo: String, val platform: String, val deviceLabel: String = "", val progreso: Int = 0)

@Serializable
data class SesionesResponse(val sesiones: List<SesionDto> = emptyList(), val juegos: List<JuegoSesionDto> = emptyList())

@Serializable
data class TrofeoPendienteDto(val trophyId: String, val name: String, val grade: String? = null, val iconUrl: String? = null, val grupo: String? = null)

@Serializable
data class TrofeosPendientesResponse(val trofeos: List<TrofeoPendienteDto> = emptyList())

@Serializable
data class NuevaSesionRequest(
    val gameId: String,
    val trophyId: String?,
    val trofeo: String,
    val descripcion: String,
    val fechaHora: String,
    val plazasTotales: Int,
)

@Serializable
data class NuevaSesionResponse(val id: String)

@Serializable
data class AccionSesionRequest(val accion: String)

/** Sesiones de trofeos online — src/app/api/mobile/sessions. */
class SesionesApi internal constructor(private val c: ClienteParagon) {
    suspend fun listar(): SesionesResponse = c.http.get("api/mobile/sessions").body()

    suspend fun ficha(id: String): SesionDto = c.http.get("api/mobile/sessions/${id.encodeURLPathPart()}").body()

    suspend fun crear(request: NuevaSesionRequest): NuevaSesionResponse =
        c.http.post("api/mobile/sessions") { json(request) }.body()

    /** `accion`: "unirse" | "salir". Devuelve la ficha ya actualizada. */
    suspend fun accion(id: String, accion: String): SesionDto =
        c.http.post("api/mobile/sessions/${id.encodeURLPathPart()}") { json(AccionSesionRequest(accion)) }.body()

    suspend fun cancelar(id: String) {
        c.http.delete("api/mobile/sessions/${id.encodeURLPathPart()}")
    }

    suspend fun trofeosPendientes(gameId: String): TrofeosPendientesResponse =
        c.http.get("api/mobile/sessions/trophies") { parameter("gameId", gameId) }.body()
}
