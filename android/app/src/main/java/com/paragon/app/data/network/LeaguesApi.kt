package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class LeagueDto(val id: String, val name: String, val ownerId: String, val memberCount: Int, val endsAt: String?)
data class LeaguesResponse(val leagues: List<LeagueDto>)
data class LeagueInviteDto(val id: String, val name: String, val ownerId: String, val ownerName: String?)
data class LeagueInvitesResponse(val invites: List<LeagueInviteDto>)
data class PendingMemberDto(val userId: String, val handle: String?, val name: String?, val image: String?)
// `movimiento` sale de la foto semanal del cron (/api/cron/league-snapshot)
// — null hasta que corra una vez para esta liga, o para alguien recién unido.
data class LeagueStandingDto(val userId: String, val handle: String?, val name: String?, val image: String?, val points: Int, val movimiento: Int? = null)
data class ChallengeStandingDto(
    val userId: String,
    val handle: String?,
    val name: String?,
    val image: String?,
    val progressPercent: Int,
    val hasPlatinum: Boolean,
    val platinumAt: String?,
)
data class LeagueChallengeDto(val gameId: String, val title: String, val iconUrl: String?, val standings: List<ChallengeStandingDto>)
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
data class NewLeagueRequest(val name: String, val durationValue: Int?, val durationUnit: String?)
data class AddLeagueMemberRequest(val userId: String)
data class SetLeagueChallengeRequest(val gameId: String?)

/** Ligas propias del usuario, solo con amigos — ver la sección "Ligas propias" en API-CONTRACT.md. */
interface LeaguesApi {
    @GET("api/mobile/leagues")
    suspend fun getLeagues(): LeaguesResponse

    @POST("api/mobile/leagues")
    suspend fun createLeague(@Body request: NewLeagueRequest): LeagueDto

    @GET("api/mobile/leagues/invites")
    suspend fun getInvites(): LeagueInvitesResponse

    @POST("api/mobile/leagues/{id}/accept")
    suspend fun acceptInvite(@Path("id") id: String)

    @POST("api/mobile/leagues/{id}/decline")
    suspend fun declineInvite(@Path("id") id: String)

    @GET("api/mobile/leagues/{id}")
    suspend fun getLeagueDetail(@Path("id") id: String): LeagueDetailDto

    @POST("api/mobile/leagues/{id}/members")
    suspend fun addMember(@Path("id") id: String, @Body request: AddLeagueMemberRequest)

    /** Fija (o quita, con `gameId: null`) el juego de reto — solo el dueño. */
    @POST("api/mobile/leagues/{id}/challenge")
    suspend fun setChallenge(@Path("id") id: String, @Body request: SetLeagueChallengeRequest)

    @DELETE("api/mobile/leagues/{id}/members/{userId}")
    suspend fun removeMember(@Path("id") id: String, @Path("userId") userId: String)

    /** Igual que `removeMember` con tu propio id, pero sin que la app necesite conocerlo (solo tiene el token). */
    @POST("api/mobile/leagues/{id}/leave")
    suspend fun leaveLeague(@Path("id") id: String)

    @DELETE("api/mobile/leagues/{id}")
    suspend fun deleteLeague(@Path("id") id: String)
}
