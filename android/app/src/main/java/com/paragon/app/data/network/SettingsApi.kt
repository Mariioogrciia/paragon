package com.paragon.app.data.network

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
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

data class ChooseHandleRequest(val handle: String)

data class ChooseHandleResponse(val ok: Boolean, val handle: String?)

data class AvatarUploadResponse(val url: String?, val error: String? = null)

interface SettingsApi {
    /** Ver src/app/api/mobile/profile/avatar/route.ts — multipart, campo `file`. */
    @Multipart
    @POST("api/mobile/profile/avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): AvatarUploadResponse

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

    /** Paso 1 del alta nueva — ver src/app/api/mobile/profile/handle/route.ts. */
    @POST("api/mobile/profile/handle")
    suspend fun chooseHandle(@Body request: ChooseHandleRequest): ChooseHandleResponse
}
