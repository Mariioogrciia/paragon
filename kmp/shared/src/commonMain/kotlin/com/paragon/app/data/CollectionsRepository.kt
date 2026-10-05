package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.CollectionDto
import com.paragon.shared.red.CollectionNameRequest
import com.paragon.shared.red.paragonErrorMessage
import com.paragon.shared.red.HttpException
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

/** Carpetas de juegos (colecciones) — ver GET /api/mobile/collections en API-CONTRACT.md. */
data class Coleccion(val id: String, val name: String, val gameIds: List<String>)

sealed class CollectionsResult {
    data class Ok(val collections: List<Coleccion>) : CollectionsResult()
    data class Error(val message: String) : CollectionsResult()
}

/** Resultado de una operación de escritura (crear/renombrar/borrar) — `message` solo si falló. */
data class MutationOutcome(val ok: Boolean, val message: String? = null)

private fun CollectionDto.toColeccion() = Coleccion(id, name, gameIds)

class CollectionsRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getCollections(): CollectionsResult {
        val store = tokenStore ?: return CollectionsResult.Error(Textos.t(T.error_sin_sesion))

        return try {
            val response = ApiClient.collectionsApi(store).getCollections()
            CollectionsResult.Ok(response.collections.map { it.toColeccion() })
        } catch (e: HttpException) {
            CollectionsResult.Error(Textos.t(T.error_servidor, e.code()))
        } catch (e: Exception) {
            CollectionsResult.Error(Textos.t(T.error_conexion))
        }
    }

    /** Máx. 40 caracteres (mismo límite que la web) — el servidor es quien valida de verdad. */
    suspend fun createCollection(name: String): MutationOutcome {
        val store = tokenStore ?: return MutationOutcome(false, Textos.t(T.error_sin_sesion))
        return try {
            ApiClient.collectionsApi(store).createCollection(CollectionNameRequest(name))
            MutationOutcome(true)
        } catch (e: HttpException) {
            MutationOutcome(false, e.paragonErrorMessage() ?: Textos.t(T.carpeta_err_crear))
        } catch (e: Exception) {
            MutationOutcome(false, Textos.t(T.error_conexion))
        }
    }

    suspend fun renameCollection(id: String, name: String): MutationOutcome {
        val store = tokenStore ?: return MutationOutcome(false, Textos.t(T.error_sin_sesion))
        return try {
            ApiClient.collectionsApi(store).renameCollection(id, CollectionNameRequest(name))
            MutationOutcome(true)
        } catch (e: HttpException) {
            MutationOutcome(false, e.paragonErrorMessage() ?: Textos.t(T.carpeta_err_renombrar))
        } catch (e: Exception) {
            MutationOutcome(false, Textos.t(T.error_conexion))
        }
    }

    suspend fun deleteCollection(id: String): MutationOutcome {
        val store = tokenStore ?: return MutationOutcome(false, Textos.t(T.error_sin_sesion))
        return try {
            ApiClient.collectionsApi(store).deleteCollection(id)
            MutationOutcome(true)
        } catch (e: Exception) {
            MutationOutcome(false, Textos.t(T.carpeta_err_borrar))
        }
    }

    /** `dentro: false` también si la carpeta no es tuya o no existe — igual que el backend, sin 404 aparte. */
    suspend fun toggleGameInCollection(collectionId: String, gameId: String): Boolean {
        val store = tokenStore ?: return false
        return try {
            ApiClient.collectionsApi(store).toggleGameInCollection(collectionId, gameId).dentro
        } catch (e: Exception) {
            false
        }
    }
}
