package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class CollectionDto(
    val id: String,
    val name: String,
    val gameIds: List<String>,
)

@Serializable
data class CollectionsResponse(val collections: List<CollectionDto>)

@Serializable
data class CollectionNameRequest(val name: String)
@Serializable
data class CreateCollectionResponse(val id: String?, val error: String? = null)
@Serializable
data class OkResponseC(val ok: Boolean = false, val error: String? = null)
@Serializable
data class ToggleGameInCollectionResponse(val dentro: Boolean)

class CollectionsApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/collections/route.ts. */
    suspend fun getCollections(): CollectionsResponse =
        c.http.get("api/mobile/collections").body()

    /** Crea una carpeta — 400 con `{ "error": "..." }` si el nombre no vale. */
    suspend fun createCollection(body: CollectionNameRequest): CreateCollectionResponse =
        c.http.post("api/mobile/collections") { json(body) }.body()

    /** Renombra una carpeta — ver collections/[id]/route.ts. */
    suspend fun renameCollection(id: String, body: CollectionNameRequest): OkResponseC =
        c.http.patch("api/mobile/collections/${id.encodeURLPathPart()}") { json(body) }.body()

    /** Borra una carpeta (no borra los juegos, solo la carpeta). */
    suspend fun deleteCollection(id: String): OkResponseC =
        c.http.delete("api/mobile/collections/${id.encodeURLPathPart()}").body()

    /** Mete/saca un juego de la carpeta — ver collections/[id]/games/[gameId]/route.ts. Sin body. */
    suspend fun toggleGameInCollection(id: String, gameId: String): ToggleGameInCollectionResponse =
        c.http.post("api/mobile/collections/${id.encodeURLPathPart()}/games/${gameId.encodeURLPathPart()}").body()
}
