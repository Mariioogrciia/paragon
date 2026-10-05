package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class OauthAccountDto(
    val provider: String,
    val linked: Boolean,
    val configured: Boolean
)

@Serializable
data class PlatformAccountDto(
    val platform: String,
    val linked: Boolean,
    val username: String?,
    val level: Int?,
    /** Epic: progreso declarado, no puntúa (ver lib/declarado.ts en el servidor). */
    val declared: Boolean = false,
    /** Epic no se puede vincular desde el móvil, solo con la extensión del navegador. */
    val appLinkable: Boolean = true,
    val avatarUrl: String? = null,
    /** false = perfil privado en la plataforma (se ve vinculada, pero no se leen sus juegos). */
    val isPublic: Boolean = true,
    /** ISO 8601 o null: cuándo se sincronizó de verdad la última vez. */
    val syncedAt: String? = null,
)

@Serializable
data class LinkedAccountsResponse(
    val oauth: List<OauthAccountDto>,
    val platforms: List<PlatformAccountDto>
)

@Serializable
data class LinkPlatformRequest(val input: String)

@Serializable
data class LinkPlatformResponse(
    val username: String,
    val legible: Boolean,
    val juegos: Int
)

@Serializable
data class SuccessResponse(val ok: Boolean)

@Serializable
data class SyncPlatformResponse(val nuevos: Int = 0)

@Serializable
data class UpdateProfileRequest(
    val name: String,
    val image: String?
)

@Serializable
data class ChooseHandleRequest(val handle: String)

@Serializable
data class ChooseHandleResponse(val ok: Boolean, val handle: String?)

@Serializable
data class AvatarUploadResponse(val url: String?, val error: String? = null)

class SettingsApi internal constructor(private val c: ClienteParagon) {
    // La subida de la foto (multipart) es ClienteParagon.subirAvatar.

    suspend fun getLinkedAccounts(): LinkedAccountsResponse =
        c.http.get("api/mobile/accounts").body()

    suspend fun linkPlatform(platform: String, request: LinkPlatformRequest): LinkPlatformResponse =
        c.http.post("api/mobile/accounts/${platform.encodeURLPathPart()}") { json(request) }.body()

    suspend fun unlinkPlatform(platform: String): SuccessResponse =
        c.http.delete("api/mobile/accounts/${platform.encodeURLPathPart()}").body()

    /** El botón "Sincronizar" de cada plataforma — ver accounts/[platform]/sync/route.ts. */
    suspend fun syncPlatform(platform: String): SyncPlatformResponse =
        c.http.post("api/mobile/accounts/${platform.encodeURLPathPart()}/sync").body()

    suspend fun updateProfile(request: UpdateProfileRequest): SuccessResponse =
        c.http.post("api/mobile/profile") { json(request) }.body()

    /** Paso 1 del alta nueva — ver src/app/api/mobile/profile/handle/route.ts. */
    suspend fun chooseHandle(request: ChooseHandleRequest): ChooseHandleResponse =
        c.http.post("api/mobile/profile/handle") { json(request) }.body()
}
