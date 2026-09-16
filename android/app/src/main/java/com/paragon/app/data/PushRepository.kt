package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.PushTokenRequest

/** Registro del token de Firebase Cloud Messaging de este dispositivo — ver POST /api/mobile/push-token en API-CONTRACT.md. */
class PushRepository(private val tokenStore: TokenStore? = null) {
    suspend fun registerToken(token: String) {
        val store = tokenStore ?: return
        try {
            ApiClient.pushTokenApi(store).registerToken(PushTokenRequest(token))
        } catch (e: Exception) {
            // Sin conexión o servidor caído: Firebase reintenta darnos el
            // mismo token más adelante (onNewToken no vuelve a saltar solo),
            // así que no hay mucho más que hacer aquí que no reventar la app.
        }
    }
}
