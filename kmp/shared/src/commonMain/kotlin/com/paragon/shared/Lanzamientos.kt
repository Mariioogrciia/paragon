package com.paragon.shared

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

const val BASE_URL = "https://platinos-nine.vercel.app"

/** Forma de `GET /api/games/upcoming` (pública, sin sesión). Solo lo que se pinta. */
@Serializable
data class Lanzamiento(
    val id: String,
    val title: String,
    val cover: String = "",
    val releaseLabel: String? = null,
    val platforms: List<String> = emptyList(),
)

/**
 * Sin motor explícito: Ktor coge el de la plataforma que esté en el classpath
 * (Darwin en iOS). Es lo mismo que hará la capa de red de verdad al dejar
 * Retrofit.
 */
private val cliente = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(HttpTimeout) { requestTimeoutMillis = 15_000 }
}

suspend fun proximosLanzamientos(): List<Lanzamiento> =
    cliente.get("$BASE_URL/api/games/upcoming").body()
