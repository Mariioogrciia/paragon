package com.paragon.app.data.network

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import retrofit2.HttpException

private data class ErrorBodyDto(val error: String?)

private val errorMoshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
private val errorAdapter = errorMoshi.adapter(ErrorBodyDto::class.java)

/**
 * Lee el `{ "error": "..." }` que mandan los 400/404/409/422 de la API móvil
 * (ver API-CONTRACT.md) — mismos mensajes que la web, no un genérico de
 * Retrofit tipo "HTTP 400".
 */
fun HttpException.paragonErrorMessage(): String? = try {
    response()?.errorBody()?.string()?.let { errorAdapter.fromJson(it)?.error }
} catch (e: Exception) {
    null
}
