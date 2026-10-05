package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.LinkedAccountsResponse
import com.paragon.shared.red.LinkPlatformRequest
import com.paragon.shared.red.UpdateProfileRequest
import com.paragon.shared.red.paragonErrorMessage
import com.paragon.shared.red.HttpException
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

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
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(T.ajustes_err_cuentas, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(T.error_red))
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
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(T.error_red))
        }
    }

    suspend fun unlinkPlatform(platform: String): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).unlinkPlatform(platform)
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(T.error_red))
        }
    }

    /** Sincroniza una plataforma; devuelve cuántos trofeos han entrado. */
    suspend fun syncPlatform(platform: String): SettingsResult<Int> {
        return try {
            SettingsResult.Ok(ApiClient.settingsApi(tokenStore).syncPlatform(platform).nuevos)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(T.error_red))
        }
    }

    suspend fun updateProfile(name: String, image: String?): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).updateProfile(UpdateProfileRequest(name, image))
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(T.error_red))
        }
    }

    /**
     * Sube una foto nueva desde el selector de imágenes del sistema — ver
     * POST /api/mobile/profile/avatar en API-CONTRACT.md. El servidor ya
     * guarda la URL en `users.image` él solo (mismo criterio que /ajustes en
     * la web), así que no hace falta un segundo `updateProfile` después:
     * queda vinculada con la web al momento.
     */
    suspend fun uploadAvatar(bytes: ByteArray, mimeType: String, extension: String): SettingsResult<String> {
        return try {
            val response = ApiClient.cliente(tokenStore).subirAvatar(bytes, mimeType, extension)
            // Copia local: el DTO es de :shared y Kotlin no hace smart cast entre módulos.
            val url = response.url
            if (url != null) {
                SettingsResult.Ok(url)
            } else {
                SettingsResult.Error(response.error ?: Textos.t(T.ajustes_err_subir_imagen))
            }
        } catch (e: HttpException) {
            SettingsResult.Error(e.paragonErrorMessage() ?: Textos.t(T.error_servidor_corto, e.code()))
        } catch (e: Exception) {
            SettingsResult.Error(Textos.t(T.error_red))
        }
    }
}
