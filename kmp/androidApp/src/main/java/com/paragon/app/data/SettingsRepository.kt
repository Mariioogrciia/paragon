package com.paragon.app.data

import android.content.Context
import android.net.Uri
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.LinkedAccountsResponse
import com.paragon.shared.red.LinkPlatformRequest
import com.paragon.shared.red.UpdateProfileRequest
import com.paragon.shared.red.paragonErrorMessage
import com.paragon.shared.red.HttpException
import com.paragon.app.util.Textos
import com.paragon.app.R

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
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(R.string.ajustes_err_cuentas, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(R.string.error_red))
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
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(R.string.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(R.string.error_red))
        }
    }

    suspend fun unlinkPlatform(platform: String): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).unlinkPlatform(platform)
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(R.string.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(R.string.error_red))
        }
    }

    suspend fun updateProfile(name: String, image: String?): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).updateProfile(UpdateProfileRequest(name, image))
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(R.string.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(R.string.error_red))
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
                ?: return SettingsResult.Error(Textos.t(R.string.ajustes_err_leer_imagen))
            val mimeType = resolver.getType(uri) ?: "image/jpeg"
            val extension = when (mimeType) {
                "image/png" -> "png"
                "image/gif" -> "gif"
                "image/webp" -> "webp"
                else -> "jpg"
            }
            val response = ApiClient.cliente(tokenStore).subirAvatar(bytes, mimeType, extension)
            // Copia local: el DTO es de :shared y Kotlin no hace smart cast entre módulos.
            val url = response.url
            if (url != null) {
                SettingsResult.Ok(url)
            } else {
                SettingsResult.Error(response.error ?: Textos.t(R.string.ajustes_err_subir_imagen))
            }
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(R.string.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(R.string.error_red))
        }
    }
}
