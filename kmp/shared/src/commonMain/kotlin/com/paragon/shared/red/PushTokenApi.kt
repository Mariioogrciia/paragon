package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class PushTokenRequest(val token: String)

class PushTokenApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/push-token/route.ts — registra el token de FCM de este dispositivo. */
    suspend fun registerToken(body: PushTokenRequest): OkResponse =
        c.http.post("api/mobile/push-token") { json(body) }.body()
}
