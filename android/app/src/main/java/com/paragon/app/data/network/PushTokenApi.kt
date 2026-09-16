package com.paragon.app.data.network

import retrofit2.http.Body
import retrofit2.http.POST

data class PushTokenRequest(val token: String)

interface PushTokenApi {
    /** Ver src/app/api/mobile/push-token/route.ts — registra el token de FCM de este dispositivo. */
    @POST("api/mobile/push-token")
    suspend fun registerToken(@Body body: PushTokenRequest): OkResponse
}
