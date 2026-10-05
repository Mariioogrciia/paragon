package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class ClanSummaryDto(val id: String, val name: String, val tag: String, val description: String, val memberCount: Int)
data class MyClanDto(val tag: String, val name: String, val role: String)
data class ClansListResponse(val clans: List<ClanSummaryDto>, val myClan: MyClanDto?)

data class NewClanRequest(val name: String, val tag: String, val description: String?)
data class NewClanResponseDto(val id: String, val tag: String, val name: String)

data class ClanInviteDto(
    val clanId: String,
    val clanName: String,
    val clanTag: String,
    val invitedByName: String?,
    val invitedByHandle: String?,
    val createdAt: String,
)
data class ClanInvitesResponse(val invites: List<ClanInviteDto>)

data class ClanLeaderboardEntryDto(
    val userId: String,
    val role: String,
    val handle: String?,
    val name: String?,
    val image: String?,
    val score: Int,
    val trofeos: Int,
)
data class ClanActivityUserDto(val handle: String?, val name: String?, val image: String?)
data class ClanActivityGameDto(val id: String, val title: String, val iconUrl: String?)
data class ClanActivityItemDto(
    val id: String,
    val type: String,
    val rating: Int?,
    val createdAt: String,
    val user: ClanActivityUserDto,
    val game: ClanActivityGameDto,
)
data class ClanInfoDto(val id: String, val tag: String, val name: String, val description: String)
data class InvitableFriendDto(val userId: String, val handle: String?, val displayName: String?, val image: String?)

data class ClanDetailResponse(
    val clan: ClanInfoDto,
    val score: Int,
    val leaderboard: List<ClanLeaderboardEntryDto>,
    val activity: List<ClanActivityItemDto>,
    val amIMember: Boolean,
    val amIOwner: Boolean,
    val invitables: List<InvitableFriendDto>,
)

data class InviteToClanRequest(val invitedUserId: String)

/** Clanes — ver la sección "Clanes" en API-CONTRACT.md. */
interface ClansApi {
    @GET("api/mobile/clans")
    suspend fun getClans(): ClansListResponse

    /** `403` si no llegas a Nivel 5 de Paragon, `409` si ya perteneces a un clan — ver el mensaje del cuerpo del error. */
    @POST("api/mobile/clans")
    suspend fun createClan(@Body request: NewClanRequest): NewClanResponseDto

    @GET("api/mobile/clans/invites")
    suspend fun getInvites(): ClanInvitesResponse

    @POST("api/mobile/clans/invites/{clanId}/accept")
    suspend fun acceptInvite(@Path("clanId") clanId: String)

    @POST("api/mobile/clans/invites/{clanId}/decline")
    suspend fun declineInvite(@Path("clanId") clanId: String)

    @GET("api/mobile/clans/{tag}")
    suspend fun getClanDetail(@Path("tag") tag: String): ClanDetailResponse

    @POST("api/mobile/clans/{tag}/join")
    suspend fun joinClan(@Path("tag") tag: String)

    /** Si eres el owner, borra el clan ENTERO — confirmar con el usuario ANTES de llamar (el backend no vuelve a preguntar). */
    @POST("api/mobile/clans/{tag}/leave")
    suspend fun leaveClan(@Path("tag") tag: String)

    /** Solo el owner, y solo a un amigo suyo que no esté ya en un clan. */
    @POST("api/mobile/clans/{tag}/invite")
    suspend fun inviteToClan(@Path("tag") tag: String, @Body request: InviteToClanRequest)
}
