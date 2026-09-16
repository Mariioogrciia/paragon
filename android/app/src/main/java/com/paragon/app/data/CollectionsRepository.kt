package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.CollectionDto
import com.paragon.app.data.network.CollectionNameRequest
import com.paragon.app.data.network.paragonErrorMessage
import retrofit2.HttpException

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
        val store = tokenStore ?: return CollectionsResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.collectionsApi(store).getCollections()
            CollectionsResult.Ok(response.collections.map { it.toColeccion() })
        } catch (e: HttpException) {
            CollectionsResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            CollectionsResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** Máx. 40 caracteres (mismo límite que la web) — el servidor es quien valida de verdad. */
    suspend fun createCollection(name: String): MutationOutcome {
        val store = tokenStore ?: return MutationOutcome(false, "Sin sesión.")
        return try {
            ApiClient.collectionsApi(store).createCollection(CollectionNameRequest(name))
            MutationOutcome(true)
        } catch (e: HttpException) {
            MutationOutcome(false, e.paragonErrorMessage() ?: "No se pudo crear la carpeta.")
        } catch (e: Exception) {
            MutationOutcome(false, e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    suspend fun renameCollection(id: String, name: String): MutationOutcome {
        val store = tokenStore ?: return MutationOutcome(false, "Sin sesión.")
        return try {
            ApiClient.collectionsApi(store).renameCollection(id, CollectionNameRequest(name))
            MutationOutcome(true)
        } catch (e: HttpException) {
            MutationOutcome(false, e.paragonErrorMessage() ?: "No se pudo renombrar la carpeta.")
        } catch (e: Exception) {
            MutationOutcome(false, e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    suspend fun deleteCollection(id: String): MutationOutcome {
        val store = tokenStore ?: return MutationOutcome(false, "Sin sesión.")
        return try {
            ApiClient.collectionsApi(store).deleteCollection(id)
            MutationOutcome(true)
        } catch (e: Exception) {
            MutationOutcome(false, "No se pudo borrar la carpeta.")
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
