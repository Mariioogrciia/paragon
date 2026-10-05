package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.UserProfileDto
import retrofit2.HttpException
import com.paragon.app.util.Textos
import com.paragon.app.R

sealed class UserProfileResult {
    data class Ok(val profile: UserProfileDto) : UserProfileResult()
    data class Error(val message: String) : UserProfileResult()
}

class UserProfileRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getProfile(handle: String): UserProfileResult {
        val store = tokenStore ?: return UserProfileResult.Error(Textos.t(R.string.error_sin_sesion))

        return try {
            val response = ApiClient.usersApi(store).getUserProfile(handle)
            UserProfileResult.Ok(response)
        } catch (e: HttpException) {
            if (e.code() == 404) {
                UserProfileResult.Error(Textos.t(R.string.perfil_err_no_encontrado))
            } else {
                UserProfileResult.Error(Textos.t(R.string.error_servidor_corto, e.code()))
            }
        } catch (e: Exception) {
            UserProfileResult.Error(Textos.t(R.string.error_conexion))
        }
    }
}
