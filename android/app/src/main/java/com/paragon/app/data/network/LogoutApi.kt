package com.paragon.app.data.network

import retrofit2.http.POST

interface LogoutApi {
    /** Ver src/app/api/mobile/logout/route.ts — borra SOLO la sesión de este móvil. */
    @POST("api/mobile/logout")
    suspend fun logout()
}
