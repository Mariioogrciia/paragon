package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.LibraryGameDto
import retrofit2.HttpException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import androidx.glance.appwidget.updateAll

/** Biblioteca completa (LibraryScreen) — ver GET /api/mobile/library en API-CONTRACT.md. */
data class LibraryGame(
    val id: String,
    val title: String,
    val coverUrl: String,
    val progressPercent: Int,
    val definedTotal: Int,
    val earnedTotal: Int,
    // `false` en Steam/Xbox (sin desglose por metal, ver API-CONTRACT.md) —
    // ahí "completado al 100%" no es lo mismo que "platinado".
    val isPlatinado: Boolean,
    val lastPlayedAt: String?,
    val isPinned: Boolean = false,
    /** Total acumulado, no por sesión — mismo dato que `horasPorJuego` en la web. `null` si la plataforma no lo da. */
    val playtimeMinutes: Int? = null,
    // Solo relleno al venir de red (toLibraryGame) — "" al salir de la
    // caché local (LibraryGameEntity no lo guarda, ver data/local/). Basta
    // para el picker de reto de ligas (siempre pide la biblioteca por red),
    // no merece un bump de la base de Room por esto.
    val platform: String = "",
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
    data class Ok(val games: List<LibraryGame>, val fromCache: Boolean = false) : LibraryResult()
    data class Error(val message: String) : LibraryResult()
}

enum class LibraryFilter { TODOS, JUGANDO, PLATINADOS, COMPLETADOS, ABANDONADOS, BACKLOG }

private fun LibraryGameDto.toLibraryGame() = LibraryGame(
    id = id,
    title = title,
    coverUrl = iconUrl ?: "",
    progressPercent = progressPercent,
    definedTotal = definedTotal,
    earnedTotal = earnedTotal,
    isPlatinado = (earned?.platinum ?: 0) > 0,
    lastPlayedAt = lastPlayedAt,
    isPinned = isPinned ?: false,
    playtimeMinutes = playtimeMinutes,
    platform = platform,
)

private fun LibraryGame.toEntity() = com.paragon.app.data.local.LibraryGameEntity(
    id = id,
    title = title,
    coverUrl = coverUrl,
    progressPercent = progressPercent,
    definedTotal = definedTotal,
    earnedTotal = earnedTotal,
    isPlatinado = isPlatinado,
    lastPlayedAt = lastPlayedAt,
    isPinned = isPinned,
    playtimeMinutes = playtimeMinutes,
)

class LibraryRepository(
    private val tokenStore: TokenStore? = null,
    private val libraryDao: com.paragon.app.data.local.LibraryDao? = null,
    private val context: android.content.Context? = null
) {
    suspend fun getLibrary(): LibraryResult {
        val store = tokenStore ?: return LibraryResult.Error("Sin sesión.")

        // 1. Obtener de caché local rápido si existe (Offline mode / Instant load)
        val localGames = libraryDao?.getAllGames()?.map { it.toDomain() }
        
        return try {
            val response = ApiClient.libraryApi(store).getLibrary()
            val remoteGames = response.games.filterNot { it.isWishlist }.map { it.toLibraryGame() }
            
            // 2. Guardar en caché local
            libraryDao?.deleteAll()
            libraryDao?.insertAll(remoteGames.map { it.toEntity() })
            
            // 3. Actualizar Widget para que refleje los datos nuevos
            context?.let { ctx ->
                com.paragon.app.widget.PinnedGameWidget().updateAll(ctx)
            }
            
            LibraryResult.Ok(remoteGames)
        } catch (e: HttpException) {
            if (!localGames.isNullOrEmpty()) LibraryResult.Ok(localGames, fromCache = true)
            else LibraryResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            if (!localGames.isNullOrEmpty()) LibraryResult.Ok(localGames, fromCache = true)
            else LibraryResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /**
     * El juego anclado ahora mismo (Modo Enfoque) — nunca hay más de uno.
     * No hay un endpoint aparte para esto (ver API-CONTRACT.md), así que se
     * mira el campo `isPinned` de la Biblioteca completa. `null` si no hay
     * sesión, si la llamada falla, o si no hay nada anclado.
     */
    suspend fun findPinnedGameId(): String? {
        // Miramos primero la caché local (mucho más rápido y seguro offline)
        val localPinned = libraryDao?.getPinnedGame()?.id
        if (localPinned != null) return localPinned
        
        val store = tokenStore ?: return null
        return try {
            ApiClient.libraryApi(store).getLibrary().games.find { it.isPinned == true }?.id
        } catch (e: Exception) {
            null
        }
    }

    suspend fun findPinnedGame(): LibraryGame? {
        val localPinned = libraryDao?.getPinnedGame()?.toDomain()
        if (localPinned != null) return localPinned
        
        val store = tokenStore ?: return null
        return try {
            ApiClient.libraryApi(store).getLibrary().games.find { it.isPinned == true }?.toLibraryGame()
        } catch (e: Exception) {
            null
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
        LibraryFilter.PLATINADOS -> filter { it.isPlatinado }
        LibraryFilter.COMPLETADOS -> filter { it.progressPercent >= 100 }
        LibraryFilter.ABANDONADOS -> filter {
            it.progressPercent in 1..99 && (it.lastPlayedAt == null || it.lastPlayedAt < umbral)
        }
        LibraryFilter.BACKLOG -> filter { it.progressPercent in 1..15 }
    }
}
