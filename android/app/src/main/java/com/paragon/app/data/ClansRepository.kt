package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.InviteToClanRequest
import com.paragon.app.data.network.NewClanRequest
import com.paragon.app.data.network.paragonErrorMessage
import retrofit2.HttpException

/** Un clan en la lista general — ver GET /api/mobile/clans. */
data class ClanSummary(val id: String, val name: String, val tag: String, val description: String, val memberCount: Int)

/** `role`: `"owner"` | `"member"` — `"admin"` está en el esquema pero sin implementar todavía, no construir nada que dependa de él. */
data class MyClan(val tag: String, val name: String, val role: String)

data class ClanInvite(val clanId: String, val clanTag: String, val clanName: String, val invitedByName: String)

data class ClanMember(val userId: String, val role: String, val handle: String?, val name: String, val image: String?, val score: Int, val trofeos: Int)

/** Igual que FeedItem (ver FeedRepository.kt), pero SIN reacciones/comentarios/vistas a propósito — escaparate de que el clan está vivo, no una segunda bandeja de entrada. */
data class ClanActivityItem(val id: String, val type: String, val rating: Int?, val createdAt: String, val userName: String, val gameTitle: String)

data class InvitableFriend(val userId: String, val name: String)

data class ClanDetail(
    val id: String,
    val tag: String,
    val name: String,
    val description: String,
    val score: Int,
    val leaderboard: List<ClanMember>,
    val activity: List<ClanActivityItem>,
    val amIMember: Boolean,
    val amIOwner: Boolean,
    val invitables: List<InvitableFriend>,
)

sealed class ClansResult {
    data class Ok(val clans: List<ClanSummary>, val myClan: MyClan?) : ClansResult()
    data class Error(val message: String) : ClansResult()
}

sealed class ClanDetailResult {
    data class Ok(val detail: ClanDetail) : ClanDetailResult()
    data class Error(val message: String) : ClanDetailResult()
}

/** `null` si falló, con el motivo — a diferencia de otros repos de este proyecto, aquí SÍ hace falta distinguir el mensaje (nivel 5, ya en un clan, tag demasiado largo...), no vale un aviso genérico. */
sealed class ClanActionResult {
    object Ok : ClanActionResult()
    data class Error(val message: String) : ClanActionResult()
}

class ClansRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getClans(): ClansResult {
        val store = tokenStore ?: return ClansResult.Error("Sin sesión.")
        return try {
            val response = ApiClient.clansApi(store).getClans()
            ClansResult.Ok(
                clans = response.clans.map { ClanSummary(it.id, it.name, it.tag, it.description, it.memberCount) },
                myClan = response.myClan?.let { MyClan(it.tag, it.name, it.role) },
            )
        } catch (e: Exception) {
            ClansResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** Invitaciones a clanes sin responder — vacía si falla, no hay nada mejor que mostrar. */
    suspend fun getInvites(): List<ClanInvite> {
        val store = tokenStore ?: return emptyList()
        return try {
            ApiClient.clansApi(store).getInvites().invites.map {
                ClanInvite(it.clanId, it.clanTag, it.clanName, it.invitedByName ?: it.invitedByHandle ?: "Alguien")
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun acceptInvite(clanId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.clansApi(store).acceptInvite(clanId)
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun declineInvite(clanId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.clansApi(store).declineInvite(clanId)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Crea un clan — todas las reglas (Nivel 5, tag ≤5, un clan por
     * usuario, lenguaje ofensivo) se comprueban en el servidor; aquí solo
     * se propaga su mensaje de error tal cual, para que la app no tenga
     * que adivinar por qué falló.
     */
    suspend fun createClan(name: String, tag: String, description: String): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error("Sin sesión.")
        return try {
            ApiClient.clansApi(store).createClan(NewClanRequest(name, tag, description))
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: "No se pudo crear el clan.")
        } catch (e: Exception) {
            ClanActionResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    suspend fun getClanDetail(tag: String): ClanDetailResult {
        val store = tokenStore ?: return ClanDetailResult.Error("Sin sesión.")
        return try {
            val dto = ApiClient.clansApi(store).getClanDetail(tag)
            ClanDetailResult.Ok(
                ClanDetail(
                    id = dto.clan.id,
                    tag = dto.clan.tag,
                    name = dto.clan.name,
                    description = dto.clan.description,
                    score = dto.score,
                    leaderboard = dto.leaderboard.map {
                        ClanMember(it.userId, it.role, it.handle, it.name ?: it.handle ?: "Alguien", it.image, it.score, it.trofeos)
                    },
                    activity = dto.activity.map {
                        ClanActivityItem(it.id, it.type, it.rating, it.createdAt, it.user.name ?: it.user.handle ?: "Alguien", it.game.title)
                    },
                    amIMember = dto.amIMember,
                    amIOwner = dto.amIOwner,
                    invitables = dto.invitables.map { InvitableFriend(it.userId, it.displayName ?: it.handle ?: "Alguien") },
                ),
            )
        } catch (e: HttpException) {
            val message = if (e.code() == 404) "Este clan no existe." else "El servidor respondió con un error (${e.code()})."
            ClanDetailResult.Error(message)
        } catch (e: Exception) {
            ClanDetailResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    suspend fun joinClan(tag: String): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error("Sin sesión.")
        return try {
            ApiClient.clansApi(store).joinClan(tag)
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: "No se pudo unir al clan.")
        } catch (e: Exception) {
            ClanActionResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** Si eres el owner, el backend borra el clan ENTERO — confirmar con el usuario ANTES de llamar aquí. */
    suspend fun leaveClan(tag: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.clansApi(store).leaveClan(tag)
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun inviteToClan(tag: String, userId: String): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error("Sin sesión.")
        return try {
            ApiClient.clansApi(store).inviteToClan(tag, InviteToClanRequest(userId))
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: "No se pudo invitar.")
        } catch (e: Exception) {
            ClanActionResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}

/** "type" de la actividad de clan (mismo origen que `activities`, ver `mensajeFeed` en FeedRepository.kt) → frase en español. */
fun mensajeClanActividad(item: ClanActivityItem): String = when (item.type) {
    "platinum" -> "consiguió el Platino en ${item.gameTitle}"
    "new_game" -> "empezó a jugar a ${item.gameTitle}"
    "review" -> "escribió una reseña de ${item.gameTitle}"
    "rating" -> "valoró ${item.gameTitle}" + (item.rating?.let { " con $it/10" } ?: "")
    "favorite" -> "marcó ${item.gameTitle} como favorito"
    else -> "hizo algo en ${item.gameTitle}"
}
