package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class UserProfileDto(
    val userId: String,
    val name: String,
    val handle: String,
    val image: String?,
    val level: Int,
    val platinos: Int,
    val trofeos: Int,
    val accounts: List<AccountDto>,
    val recentGames: List<RecentGameDto>,
    /** ninguna / solicitudEnviada / solicitudRecibida / amigos / yo (botón de amistad). */
    val amistad: String = "ninguna",
    // Perfil completo (9 oct 2026), ver CONTRACT.md. Con valor por defecto
    // para que una versión vieja del servidor no rompa la app.
    val juegos: Int = 0,
    val oros: Int = 0,
    val platas: Int = 0,
    val bronces: Int = 0,
    val completadoMedio: Int = 0,
    val horas: Int = 0,
    val racha: RachaPerfilDto = RachaPerfilDto(),
    val esteAnio: Int = 0,
    val mejorMes: MesTotalDto? = null,
    val porMes: List<MesPerfilDto> = emptyList(),
    val clan: ClanPerfilDto? = null,
    val ultimosTrofeos: List<TrofeoMesDto> = emptyList(),
)

@Serializable
data class RachaPerfilDto(val actual: Int = 0, val mejor: Int = 0, val diasActivos: Int = 0)

@Serializable
data class MesTotalDto(val mes: String, val total: Int)

@Serializable
data class MesPerfilDto(val mes: String, val total: Int, val platinos: Int = 0)

@Serializable
data class ClanPerfilDto(val tag: String, val name: String, val logoUrl: String? = null)

/** Un lado de la comparación del mes: lo mismo que /api/mobile/stats/month. */
@Serializable
data class LadoMesDto(
    val total: Int = 0,
    val porDia: List<DiaMesDto> = emptyList(),
    val porJuego: List<JuegoMesDto> = emptyList(),
    val trofeos: List<TrofeoMesDto> = emptyList(),
)

/** /api/mobile/users/{handle}/month: su mes y el tuyo (`yo` null si es tu perfil). */
@Serializable
data class MesComparadoResponse(val mes: String, val ellos: LadoMesDto, val yo: LadoMesDto? = null)

@Serializable
data class AccountDto(
    val platform: String,
    val username: String
)

@Serializable
data class RecentGameDto(
    val id: String,
    val title: String,
    val coverUrl: String,
    val percent: Int
)

class UsersApi internal constructor(private val c: ClienteParagon) {
    suspend fun getUserProfile(handle: String): UserProfileDto =
        c.http.get("api/mobile/users/${handle.encodeURLPathPart()}").body()

    /** `mes`: "YYYY-MM"; null = el actual. */
    suspend fun getMesComparado(handle: String, mes: String?): MesComparadoResponse =
        c.http.get("api/mobile/users/${handle.encodeURLPathPart()}/month") { if (mes != null) parameter("mes", mes) }.body()
}
