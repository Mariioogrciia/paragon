package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class ClanSummaryDto(val id: String, val name: String, val tag: String, val description: String, val memberCount: Int)
@Serializable
data class MyClanDto(val tag: String, val name: String, val role: String)
@Serializable
data class ClansListResponse(val clans: List<ClanSummaryDto>, val myClan: MyClanDto?)

@Serializable
data class NewClanRequest(val name: String, val tag: String, val description: String?)
@Serializable
data class NewClanResponseDto(val id: String, val tag: String, val name: String)

@Serializable
data class ClanInviteDto(
    val clanId: String,
    val clanName: String,
    val clanTag: String,
    val invitedByName: String?,
    val invitedByHandle: String?,
    val createdAt: String,
)
@Serializable
data class ClanInvitesResponse(val invites: List<ClanInviteDto>)

@Serializable
data class ClanLeaderboardEntryDto(
    val userId: String,
    val role: String,
    val handle: String?,
    val name: String?,
    val image: String?,
    val score: Int,
    val trofeos: Int,
    val contribucion: Int,
)
@Serializable
data class ClanActivityUserDto(val handle: String?, val name: String?, val image: String?)
@Serializable
data class ClanActivityGameDto(val id: String, val title: String, val iconUrl: String?)
@Serializable
data class ClanActivityItemDto(
    val id: String,
    val type: String,
    val rating: Int?,
    val createdAt: String,
    val user: ClanActivityUserDto,
    val game: ClanActivityGameDto,
)
@Serializable
data class ClanInfoDto(val id: String, val tag: String, val name: String, val description: String)
@Serializable
data class InvitableFriendDto(val userId: String, val handle: String?, val displayName: String?, val image: String?)

@Serializable
data class ClanDetailResponse(
    val clan: ClanInfoDto,
    val score: Int,
    val leaderboard: List<ClanLeaderboardEntryDto>,
    val activity: List<ClanActivityItemDto>,
    val amIMember: Boolean,
    val amIOwner: Boolean,
    val invitables: List<InvitableFriendDto>,
    // Guerra de clanes (como la web). Con valor por defecto: un servidor viejo no la manda.
    val guerra: ClanGuerrasDto = ClanGuerrasDto(),
    /** Clanes a los que se puede retar: solo si soy el líder y no hay guerra abierta. */
    val retables: List<ClanRivalDto> = emptyList(),
)

@Serializable
data class ClanRivalDto(val id: String, val name: String, val tag: String)

/** Una guerra desde el punto de vista del clan de la ficha (GuerraVista en lib/clanWars.ts). */
@Serializable
data class ClanGuerraDto(
    val id: String,
    /** "pendiente", "activa" o "terminada". */
    val estado: String,
    val soyRetador: Boolean,
    val rival: ClanRivalDto,
    val empiezaAt: String? = null,
    val terminaAt: String? = null,
    val diasRestantes: Int? = null,
    val misPuntos: Int? = null,
    val susPuntos: Int? = null,
    /** Solo en las terminadas; null = empate. */
    val gane: Boolean? = null,
)

@Serializable
data class ClanGuerrasDto(val abierta: ClanGuerraDto? = null, val historial: List<ClanGuerraDto> = emptyList())

@Serializable
data class RetarClanRequest(val rivalId: String)

@Serializable
data class ResponderGuerraRequest(val aceptar: Boolean)

@Serializable
data class InviteToClanRequest(val invitedUserId: String)

/** Clanes — ver la sección "Clanes" en API-CONTRACT.md. */
class ClansApi internal constructor(private val c: ClienteParagon) {
    suspend fun getClans(): ClansListResponse =
        c.http.get("api/mobile/clans").body()

    /** `403` si no llegas a Nivel 5 de Paragon, `409` si ya perteneces a un clan — ver el mensaje del cuerpo del error. */
    suspend fun createClan(request: NewClanRequest): NewClanResponseDto =
        c.http.post("api/mobile/clans") { json(request) }.body()

    suspend fun getInvites(): ClanInvitesResponse =
        c.http.get("api/mobile/clans/invites").body()

    suspend fun acceptInvite(clanId: String) {
        c.http.post("api/mobile/clans/invites/${clanId.encodeURLPathPart()}/accept")
    }

    suspend fun declineInvite(clanId: String) {
        c.http.post("api/mobile/clans/invites/${clanId.encodeURLPathPart()}/decline")
    }

    suspend fun getClanDetail(tag: String): ClanDetailResponse =
        c.http.get("api/mobile/clans/${tag.encodeURLPathPart()}").body()

    suspend fun joinClan(tag: String) {
        c.http.post("api/mobile/clans/${tag.encodeURLPathPart()}/join")
    }

    /** Si eres el owner, borra el clan ENTERO — confirmar con el usuario ANTES de llamar (el backend no vuelve a preguntar). */
    suspend fun leaveClan(tag: String) {
        c.http.post("api/mobile/clans/${tag.encodeURLPathPart()}/leave")
    }

    /** Solo el owner, y solo a un amigo suyo que no esté ya en un clan. */
    suspend fun inviteToClan(tag: String, request: InviteToClanRequest) {
        c.http.post("api/mobile/clans/${tag.encodeURLPathPart()}/invite") { json(request) }
    }

    /** Ver src/app/api/mobile/clans/[tag]/war/route.ts. */
    suspend fun retarClan(tag: String, request: RetarClanRequest) {
        c.http.post("api/mobile/clans/${tag.encodeURLPathPart()}/war") { json(request) }
    }

    /** Ver src/app/api/mobile/clans/wars/[id]/route.ts. */
    suspend fun responderGuerra(id: String, request: ResponderGuerraRequest) {
        c.http.post("api/mobile/clans/wars/${id.encodeURLPathPart()}") { json(request) }
    }
}
