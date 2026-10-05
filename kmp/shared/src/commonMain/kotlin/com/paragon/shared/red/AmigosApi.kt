package com.paragon.shared.red

import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.http.encodeURLPathPart
import kotlinx.serialization.Serializable

@Serializable
data class SolicitudAmistadDto(val userId: String, val handle: String? = null, val name: String? = null, val image: String? = null)

@Serializable
data class SolicitudesResponse(val pendientes: List<SolicitudAmistadDto> = emptyList())

@Serializable
data class NuevaAmistadRequest(val handle: String)

@Serializable
data class NuevaAmistadResponse(val ok: Boolean = true, val amigos: Boolean = false)

/** Añadir, aceptar y rechazar amigos — src/app/api/mobile/friends. */
class AmigosApi internal constructor(private val c: ClienteParagon) {
    suspend fun pendientes(): SolicitudesResponse = c.http.get("api/mobile/friends").body()

    suspend fun enviar(handle: String): NuevaAmistadResponse =
        c.http.post("api/mobile/friends") { json(NuevaAmistadRequest(handle)) }.body()

    suspend fun aceptar(userId: String) {
        c.http.post("api/mobile/friends/${userId.encodeURLPathPart()}")
    }

    suspend fun quitar(userId: String) {
        c.http.delete("api/mobile/friends/${userId.encodeURLPathPart()}")
    }
}
