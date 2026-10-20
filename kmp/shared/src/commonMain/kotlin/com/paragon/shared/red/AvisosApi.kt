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

/** Qué avisos recibir — ver api/mobile/avisos/preferencias/route.ts (20 oct 2026). */
@Serializable
data class CategoriaAvisoDto(val clave: String, val activa: Boolean = true)

@Serializable
data class DiscordAvisosDto(val vinculado: Boolean = false, val activo: Boolean = false)

@Serializable
data class PreferenciasAvisosDto(
    val categorias: List<CategoriaAvisoDto> = emptyList(),
    val discord: DiscordAvisosDto = DiscordAvisosDto(),
)

/** Lo que va a null no se toca en el servidor. */
@Serializable
data class GuardarPreferenciasAvisos(val activas: List<String>? = null, val discordDm: Boolean? = null)

class AvisosApi internal constructor(private val c: ClienteParagon) {
    suspend fun avisos(): AvisosResponse = c.http.get("api/mobile/avisos").body()

    /** Todo leído (al abrir la pantalla de avisos). */
    suspend fun marcarLeidos(): SuccessResponse = c.http.post("api/mobile/avisos").body()

    suspend fun preferencias(): PreferenciasAvisosDto = c.http.get("api/mobile/avisos/preferencias").body()

    suspend fun guardarPreferencias(cambios: GuardarPreferenciasAvisos): PreferenciasAvisosDto =
        c.http.put("api/mobile/avisos/preferencias") { json(cambios) }.body()
}
