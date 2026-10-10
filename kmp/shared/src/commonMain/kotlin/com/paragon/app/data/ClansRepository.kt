package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.InviteToClanRequest
import com.paragon.shared.red.NewClanRequest
import com.paragon.shared.red.paragonErrorMessage
import com.paragon.shared.red.HttpException
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

/** Un clan en la lista general — ver GET /api/mobile/clans. */
data class ClanSummary(val id: String, val name: String, val tag: String, val description: String, val memberCount: Int, val emblema: String? = null)

/** `role`: `"owner"` | `"member"` — `"admin"` está en el esquema pero sin implementar todavía, no construir nada que dependa de él. */
data class MyClan(val tag: String, val name: String, val role: String, val emblema: String? = null)

data class ClanInvite(val clanId: String, val clanTag: String, val clanName: String, val invitedByName: String)

data class ClanMember(
    val userId: String,
    val role: String,
    val handle: String?,
    val name: String,
    val image: String?,
    val score: Int,
    val trofeos: Int,
    /** Puntos aportados al clan: Paragon Score de lo ganado desde que entró. */
    val contribucion: Int,
    val trofeosEnClan: Int,
    /** ISO; null con un servidor viejo. */
    val joinedAt: String?,
)

/** Igual que FeedItem (ver FeedRepository.kt), pero SIN reacciones/comentarios/vistas a propósito — escaparate de que el clan está vivo, no una segunda bandeja de entrada. */
data class ClanActivityItem(val id: String, val type: String, val rating: Int?, val createdAt: String, val userName: String, val gameTitle: String)

data class InvitableFriend(val userId: String, val name: String)

data class ClanDetail(
    val id: String,
    val tag: String,
    val name: String,
    val description: String,
    /** Escudo en texto (ver ui/social/EscudoClan.kt); null = el de por defecto. */
    val emblema: String? = null,
    val score: Int,
    val leaderboard: List<ClanMember>,
    val activity: List<ClanActivityItem>,
    val amIMember: Boolean,
    val amIOwner: Boolean,
    /** Mi rango (ver ClanRangos); null si no soy miembro. */
    val miRango: String? = null,
    val puedoEditar: Boolean = false,
    val puedoInvitar: Boolean = false,
    val invitables: List<InvitableFriend>,
    val guerra: com.paragon.shared.red.ClanGuerrasDto = com.paragon.shared.red.ClanGuerrasDto(),
    val retables: List<com.paragon.shared.red.ClanRivalDto> = emptyList(),
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
        val store = tokenStore ?: return ClansResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            val response = ApiClient.clansApi(store).getClans()
            ClansResult.Ok(
                clans = response.clans.map { ClanSummary(it.id, it.name, it.tag, it.description, it.memberCount, it.emblema) },
                myClan = response.myClan?.let { MyClan(it.tag, it.name, it.role, it.emblema) },
            )
        } catch (e: Exception) {
            ClansResult.Error(Textos.t(T.error_conexion))
        }
    }

    /** Invitaciones a clanes sin responder — vacía si falla, no hay nada mejor que mostrar. */
    suspend fun getInvites(): List<ClanInvite> {
        val store = tokenStore ?: return emptyList()
        return try {
            ApiClient.clansApi(store).getInvites().invites.map {
                ClanInvite(it.clanId, it.clanTag, it.clanName, it.invitedByName ?: it.invitedByHandle ?: Textos.t(T.comun_alguien))
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
        val store = tokenStore ?: return ClanActionResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            ApiClient.clansApi(store).createClan(NewClanRequest(name, tag, description))
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: Textos.t(T.clan_err_crear))
        } catch (e: Exception) {
            ClanActionResult.Error(Textos.t(T.error_conexion))
        }
    }

    suspend fun getClanDetail(tag: String): ClanDetailResult {
        val store = tokenStore ?: return ClanDetailResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            val dto = ApiClient.clansApi(store).getClanDetail(tag)
            ClanDetailResult.Ok(
                ClanDetail(
                    id = dto.clan.id,
                    tag = dto.clan.tag,
                    name = dto.clan.name,
                    description = dto.clan.description,
                    emblema = dto.clan.emblema,
                    score = dto.score,
                    leaderboard = dto.leaderboard.map {
                        ClanMember(it.userId, it.role, it.handle, it.name ?: it.handle ?: Textos.t(T.comun_alguien), it.image, it.score, it.trofeos, it.contribucion, it.trofeosEnClan, it.joinedAt)
                    },
                    activity = dto.activity.map {
                        ClanActivityItem(it.id, it.type, it.rating, it.createdAt, it.user.name ?: it.user.handle ?: Textos.t(T.comun_alguien), it.game.title)
                    },
                    amIMember = dto.amIMember,
                    amIOwner = dto.amIOwner,
                    miRango = dto.miRango,
                    puedoEditar = dto.puedoEditar,
                    puedoInvitar = dto.puedoInvitar,
                    invitables = dto.invitables.map { InvitableFriend(it.userId, it.displayName ?: it.handle ?: Textos.t(T.comun_alguien)) },
                    guerra = dto.guerra,
                    retables = dto.retables,
                ),
            )
        } catch (e: HttpException) {
            val message = if (e.code() == 404) Textos.t(T.clan_err_no_existe) else Textos.t(T.error_servidor, e.code())
            ClanDetailResult.Error(message)
        } catch (e: Exception) {
            ClanDetailResult.Error(Textos.t(T.error_conexion))
        }
    }

    /** Nombre y descripción del clan (líder y colíderes). */
    suspend fun editarClan(tag: String, nombre: String, descripcion: String): ClanActionResult =
        accionClan { ApiClient.clansApi(it).editarClan(tag, com.paragon.shared.red.EditarClanRequest(nombre, descripcion)) }

    /** Cambia el rango de un miembro; "owner" le pasa el liderazgo. */
    suspend fun cambiarRango(tag: String, userId: String, rango: String): ClanActionResult =
        accionClan { ApiClient.clansApi(it).cambiarRango(tag, userId, com.paragon.shared.red.RangoRequest(rango)) }

    suspend fun expulsar(tag: String, userId: String): ClanActionResult =
        accionClan { ApiClient.clansApi(it).expulsar(tag, userId) }

    private suspend fun accionClan(llamada: suspend (TokenStore) -> Unit): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            llamada(store)
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor, e.code()))
        } catch (e: Exception) {
            ClanActionResult.Error(Textos.t(T.error_conexion))
        }
    }

    /** Cambia el escudo (líder y colíderes). `emblema` en el formato de EscudoClan.kt. */
    suspend fun setEmblema(tag: String, emblema: String): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            ApiClient.clansApi(store).setEmblema(tag, com.paragon.shared.red.EmblemaClanRequest(emblema))
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor, e.code()))
        } catch (e: Exception) {
            ClanActionResult.Error(Textos.t(T.error_conexion))
        }
    }

    suspend fun joinClan(tag: String): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            ApiClient.clansApi(store).joinClan(tag)
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: Textos.t(T.clan_err_unir))
        } catch (e: Exception) {
            ClanActionResult.Error(Textos.t(T.error_conexion))
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

    /** Retar a otro clan (solo el líder; ver retarClan en lib/clanWars.ts). */
    suspend fun retarClan(tag: String, rivalId: String): ClanActionResult = accionGuerra {
        ApiClient.clansApi(it).retarClan(tag, com.paragon.shared.red.RetarClanRequest(rivalId))
    }

    /** Aceptar o rechazar un reto (solo el líder del clan retado). */
    suspend fun responderGuerra(guerraId: String, aceptar: Boolean): ClanActionResult = accionGuerra {
        ApiClient.clansApi(it).responderGuerra(guerraId, com.paragon.shared.red.ResponderGuerraRequest(aceptar))
    }

    private suspend fun accionGuerra(llamada: suspend (TokenStore) -> Unit): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            llamada(store)
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor, e.code()))
        } catch (e: Exception) {
            ClanActionResult.Error(Textos.t(T.error_conexion))
        }
    }

    suspend fun inviteToClan(tag: String, userId: String): ClanActionResult {
        val store = tokenStore ?: return ClanActionResult.Error(Textos.t(T.error_sin_sesion))
        return try {
            ApiClient.clansApi(store).inviteToClan(tag, InviteToClanRequest(userId))
            ClanActionResult.Ok
        } catch (e: HttpException) {
            ClanActionResult.Error(e.paragonErrorMessage() ?: Textos.t(T.clan_err_invitar))
        } catch (e: Exception) {
            ClanActionResult.Error(Textos.t(T.error_conexion))
        }
    }
}

/** "type" de la actividad de clan (mismo origen que `activities`, ver `mensajeFeed` en FeedRepository.kt) → frase en español. */
fun mensajeClanActividad(item: ClanActivityItem): String = when (item.type) {
    "platinum" -> Textos.t(T.clan_act_platino, item.gameTitle)
    "new_game" -> Textos.t(T.clan_act_nuevo, item.gameTitle)
    "review" -> Textos.t(T.clan_act_resena, item.gameTitle)
    "rating" -> Textos.t(T.clan_act_valoro, item.gameTitle) + (item.rating?.let { Textos.t(T.clan_act_nota, it) } ?: "")
    "favorite" -> Textos.t(T.clan_act_favorito, item.gameTitle)
    else -> Textos.t(T.clan_act_otro, item.gameTitle)
}
