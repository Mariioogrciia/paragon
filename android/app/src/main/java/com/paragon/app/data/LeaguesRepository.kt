package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.AddLeagueMemberRequest
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.NewLeagueRequest
import com.paragon.app.data.network.SetLeagueChallengeRequest
import retrofit2.HttpException

/** Ligas propias del usuario (SocialScreen, pestaña "Mis Ligas") — DISTINTAS de la Liga Mensual global. */
data class League(val id: String, val name: String, val ownerId: String, val memberCount: Int, val endsAt: String?)

/** Invitación a una liga todavía sin aceptar ni rechazar. */
data class LeagueInvite(val id: String, val name: String, val ownerName: String)

data class PendingMember(val userId: String, val name: String)

data class LeagueStanding(val userId: String, val name: String, val handle: String?, val image: String?, val points: Int)

/** Clasificación del "reto" de la liga — un juego concreto, quién llega antes al platino. */
data class ChallengeStanding(
    val userId: String,
    val name: String,
    val image: String?,
    val progressPercent: Int,
    val hasPlatinum: Boolean,
    val platinumAt: String?,
)

data class LeagueChallenge(val gameId: String, val title: String, val iconUrl: String?, val standings: List<ChallengeStanding>)

data class LeagueDetail(
    val id: String,
    val name: String,
    val ownerId: String,
    val isOwner: Boolean,
    val durationValue: Int?,
    val durationUnit: String?,
    val endsAt: String?,
    val standings: List<LeagueStanding>,
    val pendingMembers: List<PendingMember>,
    val challenge: LeagueChallenge?,
)

sealed class LeaguesResult {
    data class Ok(val leagues: List<League>) : LeaguesResult()
    data class Error(val message: String) : LeaguesResult()
}

sealed class LeagueDetailResult {
    data class Ok(val detail: LeagueDetail) : LeagueDetailResult()
    data class Error(val message: String) : LeagueDetailResult()
}

class LeaguesRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getLeagues(): LeaguesResult {
        val store = tokenStore ?: return LeaguesResult.Error("Sin sesión.")
        return try {
            val response = ApiClient.leaguesApi(store).getLeagues()
            LeaguesResult.Ok(response.leagues.map { League(it.id, it.name, it.ownerId, it.memberCount, it.endsAt) })
        } catch (e: Exception) {
            LeaguesResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** Invitaciones a ligas todavía sin responder — vacía si falla la llamada, no hay nada mejor que mostrar en ese caso. */
    suspend fun getInvites(): List<LeagueInvite> {
        val store = tokenStore ?: return emptyList()
        return try {
            ApiClient.leaguesApi(store).getInvites().invites.map { LeagueInvite(it.id, it.name, it.ownerName ?: "Alguien") }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun acceptInvite(leagueId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).acceptInvite(leagueId)
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun declineInvite(leagueId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).declineInvite(leagueId)
            true
        } catch (e: Exception) {
            false
        }
    }

    /** `null` si falla — quien la usa muestra un aviso genérico, no hace falta distinguir el motivo para crear una liga. `duration` opcional: sin ella, la liga no tiene fecha de fin. */
    suspend fun createLeague(name: String, durationValue: Int? = null, durationUnit: String? = null): League? {
        val store = tokenStore ?: return null
        return try {
            val dto = ApiClient.leaguesApi(store).createLeague(NewLeagueRequest(name, durationValue, durationUnit))
            League(dto.id, dto.name, dto.ownerId, dto.memberCount, dto.endsAt)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun getLeagueDetail(leagueId: String): LeagueDetailResult {
        val store = tokenStore ?: return LeagueDetailResult.Error("Sin sesión.")
        return try {
            val dto = ApiClient.leaguesApi(store).getLeagueDetail(leagueId)
            LeagueDetailResult.Ok(
                LeagueDetail(
                    id = dto.id,
                    name = dto.name,
                    ownerId = dto.ownerId,
                    isOwner = dto.isOwner,
                    durationValue = dto.durationValue,
                    durationUnit = dto.durationUnit,
                    endsAt = dto.endsAt,
                    standings = dto.standings.map {
                        LeagueStanding(it.userId, it.name ?: it.handle ?: "Alguien", it.handle, it.image, it.points)
                    },
                    pendingMembers = dto.pendingMembers.map { PendingMember(it.userId, it.name ?: it.handle ?: "Alguien") },
                    challenge = dto.challenge?.let { c ->
                        LeagueChallenge(
                            gameId = c.gameId,
                            title = c.title,
                            iconUrl = c.iconUrl,
                            standings = c.standings.map {
                                ChallengeStanding(it.userId, it.name ?: it.handle ?: "Alguien", it.image, it.progressPercent, it.hasPlatinum, it.platinumAt)
                            },
                        )
                    },
                ),
            )
        } catch (e: HttpException) {
            val message = if (e.code() == 404) "Esta liga no existe o no eres miembro." else "El servidor respondió con un error (${e.code()})."
            LeagueDetailResult.Error(message)
        } catch (e: Exception) {
            LeagueDetailResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** Fija (o quita, con `gameId = null`) el juego de reto — solo el dueño. */
    suspend fun setChallenge(leagueId: String, gameId: String?): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).setChallenge(leagueId, SetLeagueChallengeRequest(gameId))
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Solo el dueño puede invitar, y solo a un amigo real — el servidor es quien de verdad lo exige, aquí solo se refleja si funcionó. Entra como pendiente hasta que acepte. */
    suspend fun addMember(leagueId: String, userId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).addMember(leagueId, AddLeagueMemberRequest(userId))
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Quitar a alguien (el dueño, aceptado o pendiente) o salir uno mismo — mismo endpoint, ver `removeLeagueMember` en el backend. */
    suspend fun removeMember(leagueId: String, userId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).removeMember(leagueId, userId)
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Salir de una liga (uno mismo) — no requiere conocer tu propio userId, a diferencia de `removeMember`. */
    suspend fun leaveLeague(leagueId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).leaveLeague(leagueId)
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun deleteLeague(leagueId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).deleteLeague(leagueId)
            true
        } catch (e: Exception) {
            false
        }
    }
}
