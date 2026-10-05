package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.red.UserProfileDto
import com.paragon.shared.red.HttpException
import com.paragon.shared.i18n.Textos
import com.paragon.shared.i18n.T

sealed class UserProfileResult {
    data class Ok(val profile: UserProfileDto) : UserProfileResult()
    data class Error(val message: String) : UserProfileResult()
}

class UserProfileRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getProfile(handle: String): UserProfileResult {
        val store = tokenStore ?: return UserProfileResult.Error(Textos.t(T.error_sin_sesion))

        return try {
            val response = ApiClient.usersApi(store).getUserProfile(handle)
            UserProfileResult.Ok(response)
        } catch (e: HttpException) {
            if (e.code() == 404) {
                UserProfileResult.Error(Textos.t(T.perfil_err_no_encontrado))
            } else {
                UserProfileResult.Error(Textos.t(T.error_servidor_corto, e.code()))
            }
        } catch (e: Exception) {
            UserProfileResult.Error(Textos.t(T.error_conexion))
        }
    }
}
