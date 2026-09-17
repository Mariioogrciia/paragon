package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.AddLeagueMemberRequest
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.NewLeagueRequest
import com.paragon.app.data.network.SetLeagueChallengeRequest
import retrofit2.HttpException

/** Ligas propias del usuario (SocialScreen, pestaña "Mis Ligas") — DISTINTAS de la Liga Mensual global. */
data class League(val id: String, val name: String, val ownerId: String, val memberCount: Int)

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
    val standings: List<LeagueStanding>,
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
            LeaguesResult.Ok(response.leagues.map { League(it.id, it.name, it.ownerId, it.memberCount) })
        } catch (e: Exception) {
            LeaguesResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** `null` si falla — quien la usa muestra un aviso genérico, no hace falta distinguir el motivo para crear una liga. */
    suspend fun createLeague(name: String): League? {
        val store = tokenStore ?: return null
        return try {
            val dto = ApiClient.leaguesApi(store).createLeague(NewLeagueRequest(name))
            League(dto.id, dto.name, dto.ownerId, dto.memberCount)
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
                    standings = dto.standings.map {
                        LeagueStanding(it.userId, it.name ?: it.handle ?: "Alguien", it.handle, it.image, it.points)
                    },
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

    /** Solo el dueño puede invitar, y solo a un amigo real — el servidor es quien de verdad lo exige, aquí solo se refleja si funcionó. */
    suspend fun addMember(leagueId: String, userId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.leaguesApi(store).addMember(leagueId, AddLeagueMemberRequest(userId))
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Quitar a alguien (el dueño) o salir uno mismo — mismo endpoint, ver `removeLeagueMember` en el backend. */
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
