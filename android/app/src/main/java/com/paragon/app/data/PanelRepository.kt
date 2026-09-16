package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.GameCardDto
import retrofit2.HttpException

data class UserProfile(
    val handle: String,
    val name: String,
    val level: Int,
    val psnId: String,
    // Misma foto que en la web (`resolveAvatarUrl`) — `null` si no hay ninguna.
    val image: String? = null,
)

data class GlobalStats(
    val platinums: Int,
    val trophies: Int,
    val games: Int,
    val completionRate: Int
)

data class TrophyCounts(
    val platinum: Int,
    val gold: Int,
    val silver: Int,
    val bronze: Int
)

data class GameProgress(
    val id: String,
    val title: String,
    val coverUrl: String,
    val earnedTrophies: Int,
    val totalTrophies: Int,
    val percent: Int
)

/** Perfil + stats reales, o por qué no se pudieron traer — ver /api/mobile/panel en el proyecto Next.js. */
sealed class PanelResult {
    data class Ok(val profile: UserProfile, val stats: GlobalStats) : PanelResult()
    /** Sin token guardado, o el servidor lo rechazó (401): hace falta pasar por /movil/enlazar (login web). */
    object NeedsLogin : PanelResult()
    data class Error(val message: String) : PanelResult()
}

/** "A un paso del platino" + "Recientes" — ver /api/mobile/panel/highlights, mismo cálculo que la portada web. */
sealed class HighlightsResult {
    data class Ok(val nearPlatinum: List<GameProgress>, val recent: List<GameProgress>) : HighlightsResult()
    data class Error(val message: String) : HighlightsResult()
}

private fun GameCardDto.toGameProgress() = GameProgress(
    id = id,
    title = title,
    coverUrl = coverUrl,
    earnedTrophies = earnedTrophies,
    totalTrophies = totalTrophies,
    percent = percent,
)

class PanelRepository(private val tokenStore: TokenStore? = null) {
    /** Perfil + stats reales del usuario logueado. Requiere el TokenStore del constructor. */
    suspend fun getPanel(): PanelResult {
        val store = tokenStore ?: return PanelResult.NeedsLogin
        if (store.token == null) return PanelResult.NeedsLogin

        return try {
            val response = ApiClient.panelApi(store).getPanel()
            PanelResult.Ok(
                profile = UserProfile(
                    handle = response.profile.handle,
                    name = response.profile.name,
                    level = response.profile.level,
                    psnId = response.profile.psnId ?: "",
                    image = response.profile.image,
                ),
                stats = GlobalStats(
                    platinums = response.stats.platinums,
                    trophies = response.stats.trophies,
                    games = response.stats.games,
                    completionRate = response.stats.completionRate,
                ),
            )
        } catch (e: HttpException) {
            if (e.code() == 401) {
                store.clear()
                PanelResult.NeedsLogin
            } else {
                PanelResult.Error("El servidor respondió con un error (${e.code()}).")
            }
        } catch (e: Exception) {
            PanelResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    suspend fun getHighlights(): HighlightsResult {
        val store = tokenStore ?: return HighlightsResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.highlightsApi(store).getHighlights()
            HighlightsResult.Ok(
                nearPlatinum = response.nearPlatinum.map { it.toGameProgress() },
                recent = response.recent.map { it.toGameProgress() },
            )
        } catch (e: HttpException) {
            HighlightsResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            HighlightsResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /**
     * Cierra sesión SOLO en este móvil (ver /api/mobile/logout y
     * mintMobileSession en el proyecto Next.js) — no toca ninguna sesión
     * web ni la de otro dispositivo. Se traga cualquier fallo de red a
     * propósito: aunque el servidor no responda, borrar el token local
     * (que hace quien llama a esto después) ya deja al usuario deslogueado
     * en la app, que es lo único que puede prometer sin conexión.
     */
    suspend fun logout() {
        val store = tokenStore ?: return
        try {
            ApiClient.logoutApi(store).logout()
        } catch (e: Exception) {
            // Sin conexión o servidor caído: la sesión del móvil puede
            // quedar viva en el servidor hasta que caduque sola, pero
            // localmente ya se va a cerrar igual (ver TokenStore.clear()
            // en quien llama). No hay nada mejor que hacer aquí sin red.
        }
    }

    // Simulamos la obtención de datos desde Next.js
    fun getMockUserProfile(): UserProfile {
        return UserProfile(
            handle = "mario",
            name = "Mario",
            level = 14,
            psnId = "mario_psn"
        )
    }

    fun getMockGlobalStats(): GlobalStats {
        return GlobalStats(
            platinums = 87,
            trophies = 4312,
            games = 214,
            completionRate = 68
        )
    }

    fun getMockTrophyCounts(): TrophyCounts {
        return TrophyCounts(
            platinum = 87,
            gold = 214,
            silver = 890,
            bronze = 3121
        )
    }

    fun getMockNearPlatinum(): GameProgress {
        return GameProgress(
            id = "1",
            title = "Elden Ring",
            coverUrl = "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
            earnedTrophies = 32,
            totalTrophies = 42,
            percent = 74
        )
    }

    fun getMockRecentGames(): List<GameProgress> {
        return listOf(
            GameProgress(
                id = "2",
                title = "Bloodborne",
                coverUrl = "https://images.igdb.com/igdb/image/upload/t_cover_big/cob99l.jpg",
                earnedTrophies = 40,
                totalTrophies = 40,
                percent = 100
            ),
            GameProgress(
                id = "3",
                title = "God of War Ragnarök",
                coverUrl = "https://images.igdb.com/igdb/image/upload/t_cover_big/coba3d.jpg",
                earnedTrophies = 36,
                totalTrophies = 36,
                percent = 100
            ),
            GameProgress(
                id = "4",
                title = "Returnal",
                coverUrl = "https://images.igdb.com/igdb/image/upload/t_cover_big/co3wc1.jpg",
                earnedTrophies = 12,
                totalTrophies = 31,
                percent = 41
            )
        )
    }
}
