package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.UserProfileDto
import retrofit2.HttpException

sealed class UserProfileResult {
    data class Ok(val profile: UserProfileDto) : UserProfileResult()
    data class Error(val message: String) : UserProfileResult()
}

class UserProfileRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getProfile(handle: String): UserProfileResult {
        val store = tokenStore ?: return UserProfileResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.usersApi(store).getUserProfile(handle)
            UserProfileResult.Ok(response)
        } catch (e: HttpException) {
            if (e.code() == 404) {
                UserProfileResult.Error("Usuario no encontrado.")
            } else {
                UserProfileResult.Error("Error del servidor (${e.code()}).")
            }
        } catch (e: Exception) {
            UserProfileResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
