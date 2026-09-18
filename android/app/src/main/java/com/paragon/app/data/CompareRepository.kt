package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.paragonErrorMessage
import retrofit2.HttpException

/** Comparativa 1 a 1 (CompareScreen) — versión curada de GET /api/mobile/compare/{handle}. */
data class CompareSide(val name: String, val avatarUrl: String?, val level: Int, val platinos: Int, val trofeos: Int, val juegos: Int)

enum class CompareResultado { GANO, PIERDO, EMPATE }

data class SharedGame(
    val id: String,
    val title: String,
    val iconUrl: String?,
    val myPercent: Int,
    val theirPercent: Int,
    val myHours: Double?,
    val theirHours: Double?,
)

data class CompareData(val me: CompareSide, val them: CompareSide, val sharedGames: List<SharedGame>, val resultado: CompareResultado)

sealed class CompareResult {
    data class Ok(val data: CompareData) : CompareResult()
    data class Error(val message: String) : CompareResult()
}

class CompareRepository(private val tokenStore: TokenStore? = null) {
    /** `handle` no tiene que ser tu amigo — cualquier perfil público se puede comparar, igual que en la web. */
    suspend fun compare(handle: String): CompareResult {
        val store = tokenStore ?: return CompareResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.compareApi(store).compare(handle)
            CompareResult.Ok(
                CompareData(
                    me = CompareSide(response.me.name, response.me.avatarUrl, response.me.level, response.me.platinos, response.me.trofeos, response.me.juegos),
                    them = CompareSide(response.them.name, response.them.avatarUrl, response.them.level, response.them.platinos, response.them.trofeos, response.them.juegos),
                    sharedGames = response.sharedGames.map {
                        SharedGame(it.id, it.title, it.iconUrl, it.myPercent, it.theirPercent, it.myHours, it.theirHours)
                    },
                    resultado = when (response.resultado) {
                        "gano" -> CompareResultado.GANO
                        "pierdo" -> CompareResultado.PIERDO
                        else -> CompareResultado.EMPATE
                    },
                ),
            )
        } catch (e: HttpException) {
            val message = when (e.code()) {
                404 -> "No existe ese usuario."
                409 -> e.paragonErrorMessage() ?: "Esa persona no tiene ninguna cuenta vinculada."
                else -> "El servidor respondió con un error (${e.code()})."
            }
            CompareResult.Error(message)
        } catch (e: Exception) {
            CompareResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
