package com.paragon.shared.red

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpResponseValidator
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.header
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Mismo dominio que la web. Cuando haya dominio propio, cambiarlo aquí (y en
 * `EnlaceSeguro`, que abre el login en el navegador).
 */
const val URL_BASE = "https://platinos-nine.vercel.app/"

/**
 * El JSON de la API móvil, con el mismo comportamiento que tenía Moshi:
 * campos desconocidos ignorados, un nullable que no llega vale null, y en los
 * envíos se omiten los null pero no los valores por defecto.
 */
val jsonParagon = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    coerceInputValues = true
    encodeDefaults = true
}

/**
 * Respuesta HTTP que no es 2xx. Misma forma que `retrofit2.HttpException`
 * (`code()`), para que los repositorios no cambien al dejar Retrofit.
 */
class HttpException(private val codigo: Int, val cuerpo: String?) : Exception("HTTP $codigo") {
    fun code(): Int = codigo
}

@Serializable
private data class CuerpoError(val error: String? = null)

/**
 * Lee el `{ "error": "..." }` que mandan los 400/404/409/422 de la API móvil
 * (ver API-CONTRACT.md): los mismos mensajes que la web, no un "HTTP 400".
 */
fun HttpException.paragonErrorMessage(): String? = try {
    cuerpo?.let { jsonParagon.decodeFromString(CuerpoError.serializer(), it).error }
} catch (e: Exception) {
    null
}

internal inline fun <reified T> HttpRequestBuilder.json(cuerpo: T) {
    contentType(ContentType.Application.Json)
    setBody(cuerpo)
}

/**
 * Cliente de `/api/mobile` para Android e iOS. Cada plataforma pone su motor
 * (OkHttp con caché HTTP en Android, Darwin en iOS), de dónde sale el token de
 * sesión y el idioma (los nombres de trofeos vienen en ese idioma si la
 * plataforma los tiene: ver idiomaDeCabecera en lib/idiomasTrofeo.ts).
 */
class ClienteParagon(
    motor: HttpClientEngine,
    private val token: () -> String?,
    private val idioma: () -> String,
) {
    val http: HttpClient = HttpClient(motor) {
        install(ContentNegotiation) { json(jsonParagon) }
        install(HttpTimeout) {
            connectTimeoutMillis = 15_000
            requestTimeoutMillis = 30_000
        }
        // Se evalúa en cada petición: el token y el idioma son siempre los de ese momento.
        defaultRequest {
            url(URL_BASE)
            header(HttpHeaders.AcceptLanguage, idioma())
            token()?.let { header(HttpHeaders.Authorization, "Bearer $it") }
        }
        HttpResponseValidator {
            validateResponse { respuesta ->
                if (!respuesta.status.isSuccess()) {
                    val cuerpo = try { respuesta.bodyAsText() } catch (e: Exception) { null }
                    throw HttpException(respuesta.status.value, cuerpo)
                }
            }
        }
    }

    val achievements by lazy { AchievementsApi(this) }
    val apariencia by lazy { AparienciaApi(this) }
    val clans by lazy { ClansApi(this) }
    val collections by lazy { CollectionsApi(this) }
    val compare by lazy { CompareApi(this) }
    val diet by lazy { DietApi(this) }
    val feed by lazy { FeedApi(this) }
    val games by lazy { GamesApi(this) }
    val highlights by lazy { HighlightsApi(this) }
    val leagues by lazy { LeaguesApi(this) }
    val library by lazy { LibraryApi(this) }
    val logout by lazy { LogoutApi(this) }
    val milestone by lazy { MilestoneApi(this) }
    val panel by lazy { PanelApi(this) }
    val pushToken by lazy { PushTokenApi(this) }
    val racha by lazy { RachaApi(this) }
    val settings by lazy { SettingsApi(this) }
    val social by lazy { SocialApi(this) }
    val stats by lazy { StatsApi(this) }
    val steam by lazy { SteamApi(this) }
    val trophyGuides by lazy { TrophyGuidesApi(this) }
    val users by lazy { UsersApi(this) }
    val wishlist by lazy { WishlistApi(this) }
    val wrap by lazy { WrapApi(this) }

    /**
     * Sube la foto de perfil. Ver src/app/api/mobile/profile/avatar/route.ts:
     * multipart con el campo `file`.
     */
    suspend fun subirAvatar(bytes: ByteArray, tipoMime: String, extension: String): AvatarUploadResponse =
        http.submitFormWithBinaryData(
            url = "api/mobile/profile/avatar",
            formData = formData {
                append(
                    "file",
                    bytes,
                    Headers.build {
                        append(HttpHeaders.ContentType, tipoMime)
                        append(HttpHeaders.ContentDisposition, "filename=\"avatar.$extension\"")
                    },
                )
            },
        ).body()
}
