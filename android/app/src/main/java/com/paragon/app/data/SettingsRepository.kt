package com.paragon.app.data

import android.content.Context
import android.net.Uri
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.LinkedAccountsResponse
import com.paragon.app.data.network.LinkPlatformRequest
import com.paragon.app.data.network.UpdateProfileRequest
import com.paragon.app.data.network.paragonErrorMessage
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException

sealed class SettingsResult<out T> {
    data class Ok<T>(val data: T) : SettingsResult<T>()
    data class Error(val message: String) : SettingsResult<Nothing>()
}

class SettingsRepository(private val tokenStore: TokenStore) {
    suspend fun getLinkedAccounts(): SettingsResult<LinkedAccountsResponse> {
        return try {
            val response = ApiClient.settingsApi(tokenStore).getLinkedAccounts()
            SettingsResult.Ok(response)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: "Error al cargar cuentas (${e.code()}).")
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }

    /**
     * El 422 de /api/mobile/accounts/{platform} viene con el motivo real
     * (NPSSO caducado, perfil no encontrado, perfil privado...) — antes se
     * descartaba sin más y se enseñaba siempre el mismo "Cuenta ya
     * vinculada a otro usuario o inválida", aunque el motivo real fuera
     * otro completamente distinto.
     */
    suspend fun linkPlatform(platform: String, username: String): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).linkPlatform(platform, LinkPlatformRequest(username))
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: "Error del servidor (${e.code()}).")
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }

    suspend fun unlinkPlatform(platform: String): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).unlinkPlatform(platform)
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: "Error del servidor (${e.code()}).")
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }

    suspend fun updateProfile(name: String, image: String?): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).updateProfile(UpdateProfileRequest(name, image))
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: "Error del servidor (${e.code()}).")
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }

    /**
     * Sube una foto nueva desde el selector de imágenes del sistema — ver
     * POST /api/mobile/profile/avatar en API-CONTRACT.md. El servidor ya
     * guarda la URL en `users.image` él solo (mismo criterio que /ajustes en
     * la web), así que no hace falta un segundo `updateProfile` después:
     * queda vinculada con la web al momento.
     */
    suspend fun uploadAvatar(context: Context, uri: Uri): SettingsResult<String> {
        return try {
            val resolver = context.contentResolver
            val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return SettingsResult.Error("No se pudo leer la imagen.")
            val mimeType = resolver.getType(uri) ?: "image/jpeg"
            val extension = when (mimeType) {
                "image/png" -> "png"
                "image/gif" -> "gif"
                "image/webp" -> "webp"
                else -> "jpg"
            }
            val body = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", "avatar.$extension", body)

            val response = ApiClient.settingsApi(tokenStore).uploadAvatar(part)
            if (response.url != null) {
                SettingsResult.Ok(response.url)
            } else {
                SettingsResult.Error(response.error ?: "No se pudo subir la imagen.")
            }
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: "Error del servidor (${e.code()}).")
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }
}
