package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

data class CollectionDto(
    val id: String,
    val name: String,
    val gameIds: List<String>,
)

data class CollectionsResponse(val collections: List<CollectionDto>)

data class CollectionNameRequest(val name: String)
data class CreateCollectionResponse(val id: String?, val error: String? = null)
data class OkResponseC(val ok: Boolean = false, val error: String? = null)
data class ToggleGameInCollectionResponse(val dentro: Boolean)

interface CollectionsApi {
    /** Ver src/app/api/mobile/collections/route.ts. */
    @GET("api/mobile/collections")
    suspend fun getCollections(): CollectionsResponse

    /** Crea una carpeta — 400 con `{ "error": "..." }` si el nombre no vale. */
    @POST("api/mobile/collections")
    suspend fun createCollection(@Body body: CollectionNameRequest): CreateCollectionResponse

    /** Renombra una carpeta — ver collections/[id]/route.ts. */
    @PATCH("api/mobile/collections/{id}")
    suspend fun renameCollection(@Path("id") id: String, @Body body: CollectionNameRequest): OkResponseC

    /** Borra una carpeta (no borra los juegos, solo la carpeta). */
    @DELETE("api/mobile/collections/{id}")
    suspend fun deleteCollection(@Path("id") id: String): OkResponseC

    /** Mete/saca un juego de la carpeta — ver collections/[id]/games/[gameId]/route.ts. Sin body. */
    @POST("api/mobile/collections/{id}/games/{gameId}")
    suspend fun toggleGameInCollection(
        @Path("id") id: String,
        @Path("gameId") gameId: String,
    ): ToggleGameInCollectionResponse
}
