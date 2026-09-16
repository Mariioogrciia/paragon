package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.LinkedAccountsResponse
import com.paragon.app.data.network.LinkPlatformRequest
import com.paragon.app.data.network.UpdateProfileRequest
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
            SettingsResult.Error("Error al cargar cuentas (${e.code()}).")
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }

    suspend fun linkPlatform(platform: String, username: String): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).linkPlatform(platform, LinkPlatformRequest(username))
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            val message = if (e.code() == 422) "Cuenta ya vinculada a otro usuario o inválida." else "Error del servidor (${e.code()})"
            SettingsResult.Error(message)
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }

    suspend fun unlinkPlatform(platform: String): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).unlinkPlatform(platform)
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            SettingsResult.Error("Error del servidor (${e.code()})")
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }

    suspend fun updateProfile(name: String, image: String?): SettingsResult<Unit> {
        return try {
            ApiClient.settingsApi(tokenStore).updateProfile(UpdateProfileRequest(name, image))
            SettingsResult.Ok(Unit)
        } catch (e: HttpException) {
            val message = if (e.code() == 400) "Nombre inválido." else "Error del servidor (${e.code()})"
            SettingsResult.Error(message)
        } catch (e: Exception) {
            SettingsResult.Error(e.message ?: "Error de red.")
        }
    }
}
