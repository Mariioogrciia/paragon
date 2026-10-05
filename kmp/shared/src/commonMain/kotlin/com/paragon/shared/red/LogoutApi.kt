package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class LogoutRequest(val fcmToken: String?)

class LogoutApi internal constructor(private val c: ClienteParagon) {
    /** Ver src/app/api/mobile/logout/route.ts — borra SOLO la sesión de este móvil. */
    suspend fun logout(body: LogoutRequest) {
        c.http.post("api/mobile/logout") { json(body) }
    }
}
