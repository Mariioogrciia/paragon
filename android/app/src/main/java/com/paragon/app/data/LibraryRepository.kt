package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.LibraryGameDto
import retrofit2.HttpException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Biblioteca completa (LibraryScreen) — ver GET /api/mobile/library en API-CONTRACT.md. */
data class LibraryGame(
    val id: String,
    val title: String,
    val coverUrl: String,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    val lastPlayedAt: String?,
) {
    /** Para reutilizar StandardGameCard/HeroGameCard (GameCards.kt) tal cual. */
    fun toGameProgress() = GameProgress(
        id = id,
        title = title,
        coverUrl = coverUrl,
        earnedTrophies = earnedTotal,
        totalTrophies = definedTotal,
        percent = progressPercent,
    )
}

sealed class LibraryResult {
    data class Ok(val games: List<LibraryGame>) : LibraryResult()
    data class Error(val message: String) : LibraryResult()
}

enum class LibraryFilter { TODOS, JUGANDO, COMPLETADOS, ABANDONADOS }

private fun LibraryGameDto.toLibraryGame() = LibraryGame(
    id = id,
    title = title,
    coverUrl = iconUrl ?: "",
    progressPercent = progressPercent,
    definedTotal = definedTotal,
    earnedTotal = earnedTotal,
    lastPlayedAt = lastPlayedAt,
)

class LibraryRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getLibrary(): LibraryResult {
        val store = tokenStore ?: return LibraryResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.libraryApi(store).getLibrary()
            // Deseados aparte (Wishlist): esta pantalla es "lo que tienes", no
            // "lo que quieres" — mismo criterio que summarise() en la web.
            LibraryResult.Ok(response.games.filterNot { it.isWishlist }.map { it.toLibraryGame() })
        } catch (e: HttpException) {
            LibraryResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            LibraryResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}

/**
 * Aproximación pragmática con los campos que ya trae /api/mobile/library —
 * NO el mismo cálculo que `GameStatus` en src/lib/stats.ts (la web mira más
 * señales por plataforma). "Abandonados" aquí: empezado, sin terminar, y sin
 * jugar en los últimos 180 días. minSdk 24 no tiene java.time sin desugaring,
 * de ahí comparar como texto ISO-8601 en vez de parsear con Instant.
 */
private const val DIAS_ABANDONO = 180L

private fun umbralAbandonoIso(): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    val millis = System.currentTimeMillis() - DIAS_ABANDONO * 24L * 60 * 60 * 1000
    return formatter.format(Date(millis))
}

fun List<LibraryGame>.filterByStatus(filter: LibraryFilter): List<LibraryGame> {
    val umbral by lazy { umbralAbandonoIso() }
    return when (filter) {
        LibraryFilter.TODOS -> this
        LibraryFilter.JUGANDO -> filter { it.progressPercent in 1..99 }
        LibraryFilter.COMPLETADOS -> filter { it.progressPercent >= 100 }
        LibraryFilter.ABANDONADOS -> filter {
            it.progressPercent in 1..99 && (it.lastPlayedAt == null || it.lastPlayedAt < umbral)
        }
    }
}
