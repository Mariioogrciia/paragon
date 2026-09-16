package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class OauthAccountDto(
    val provider: String,
    val linked: Boolean,
    val configured: Boolean
)

data class PlatformAccountDto(
    val platform: String,
    val linked: Boolean,
    val username: String?,
    val level: Int?
)

data class LinkedAccountsResponse(
    val oauth: List<OauthAccountDto>,
    val platforms: List<PlatformAccountDto>
)

data class LinkPlatformRequest(val input: String)

data class LinkPlatformResponse(
    val username: String,
    val legible: Boolean,
    val juegos: Int
)

data class SuccessResponse(val ok: Boolean)

data class UpdateProfileRequest(
    val name: String,
    val image: String?
)

interface SettingsApi {
    @GET("api/mobile/accounts")
    suspend fun getLinkedAccounts(): LinkedAccountsResponse

    @POST("api/mobile/accounts/{platform}")
    suspend fun linkPlatform(
        @Path("platform") platform: String,
        @Body request: LinkPlatformRequest
    ): LinkPlatformResponse

    @DELETE("api/mobile/accounts/{platform}")
    suspend fun unlinkPlatform(@Path("platform") platform: String): SuccessResponse

    @POST("api/mobile/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): SuccessResponse
}
