package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class LeagueDto(val id: String, val name: String, val ownerId: String, val memberCount: Int, val endsAt: String?)
@Serializable
data class LeaguesResponse(val leagues: List<LeagueDto>)
@Serializable
data class LeagueInviteDto(val id: String, val name: String, val ownerId: String, val ownerName: String?)
@Serializable
data class LeagueInvitesResponse(val invites: List<LeagueInviteDto>)
@Serializable
data class PendingMemberDto(val userId: String, val handle: String?, val name: String?, val image: String?)
// `movimiento` sale de la foto semanal del cron (/api/cron/league-snapshot)
// — null hasta que corra una vez para esta liga, o para alguien recién unido.
@Serializable
data class LeagueStandingDto(val userId: String, val handle: String?, val name: String?, val image: String?, val points: Int, val movimiento: Int? = null)
@Serializable
data class ChallengeStandingDto(
    val userId: String,
    val handle: String?,
    val name: String?,
    val image: String?,
    val progressPercent: Int,
    val hasPlatinum: Boolean,
    val platinumAt: String?,
)
@Serializable
data class LeagueChallengeDto(val gameId: String, val title: String, val iconUrl: String?, val standings: List<ChallengeStandingDto>)
@Serializable
data class LeagueDetailDto(
    val id: String,
    val name: String,
    val ownerId: String,
    val isOwner: Boolean,
    val durationValue: Int?,
    val durationUnit: String?,
    val endsAt: String?,
    val standings: List<LeagueStandingDto>,
    val pendingMembers: List<PendingMemberDto>,
    val challenge: LeagueChallengeDto?,
)
@Serializable
data class NewLeagueRequest(val name: String, val durationValue: Int?, val durationUnit: String?)
@Serializable
data class AddLeagueMemberRequest(val userId: String)
@Serializable
data class SetLeagueChallengeRequest(val gameId: String?)

/** Ligas propias del usuario, solo con amigos — ver la sección "Ligas propias" en API-CONTRACT.md. */
class LeaguesApi internal constructor(private val c: ClienteParagon) {
    suspend fun getLeagues(): LeaguesResponse =
        c.http.get("api/mobile/leagues").body()

    suspend fun createLeague(request: NewLeagueRequest): LeagueDto =
        c.http.post("api/mobile/leagues") { json(request) }.body()

    suspend fun getInvites(): LeagueInvitesResponse =
        c.http.get("api/mobile/leagues/invites").body()

    suspend fun acceptInvite(id: String) {
        c.http.post("api/mobile/leagues/${id.encodeURLPathPart()}/accept")
    }

    suspend fun declineInvite(id: String) {
        c.http.post("api/mobile/leagues/${id.encodeURLPathPart()}/decline")
    }

    suspend fun getLeagueDetail(id: String): LeagueDetailDto =
        c.http.get("api/mobile/leagues/${id.encodeURLPathPart()}").body()

    suspend fun addMember(id: String, request: AddLeagueMemberRequest) {
        c.http.post("api/mobile/leagues/${id.encodeURLPathPart()}/members") { json(request) }
    }

    /** Fija (o quita, con `gameId: null`) el juego de reto — solo el dueño. */
    suspend fun setChallenge(id: String, request: SetLeagueChallengeRequest) {
        c.http.post("api/mobile/leagues/${id.encodeURLPathPart()}/challenge") { json(request) }
    }

    suspend fun removeMember(id: String, userId: String) {
        c.http.delete("api/mobile/leagues/${id.encodeURLPathPart()}/members/${userId.encodeURLPathPart()}")
    }

    /** Igual que `removeMember` con tu propio id, pero sin que la app necesite conocerlo (solo tiene el token). */
    suspend fun leaveLeague(id: String) {
        c.http.post("api/mobile/leagues/${id.encodeURLPathPart()}/leave")
    }

    suspend fun deleteLeague(id: String) {
        c.http.delete("api/mobile/leagues/${id.encodeURLPathPart()}")
    }
}
