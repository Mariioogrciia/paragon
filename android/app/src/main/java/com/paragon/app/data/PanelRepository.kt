package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.PanelCacheEntity
import com.paragon.app.data.local.PanelDao
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.ChooseHandleRequest
import com.paragon.app.data.network.GameCardDto
import com.paragon.app.data.network.NextTrophyDto
import com.paragon.app.data.network.paragonErrorMessage
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
    val completionRate: Int,
    // Antes la app pintaba esto con PanelRepository.getMockTrophyCounts()
    // (datos de prueba fijos) — el backend ya calculaba el desglose real
    // en summarise() desde el principio, solo faltaba exponerlo en
    // GET /api/mobile/panel.
    val gold: Int = 0,
    val silver: Int = 0,
    val bronze: Int = 0,
)

/** Racha de días con al menos un trofeo — mismo cálculo que GET /api/mobile/stats (ver CONTRACT.md). */
data class RachaGlobal(
    val actual: Int,
    val mejor: Int,
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
    data class Ok(val profile: UserProfile, val stats: GlobalStats, val racha: RachaGlobal, val fromCache: Boolean = false) : PanelResult()
    /** Sin token guardado, o el servidor lo rechazó (401): hace falta pasar por /movil/enlazar (login web). */
    object NeedsLogin : PanelResult()
    /**
     * Login nuevo (Google/Discord) sin `handle` todavía — el 409 real de
     * /api/mobile/panel, no un error genérico. Sin este estado propio caía
     * en `Error` con un "Reintentar" que repite la misma petición para
     * siempre y nunca se arregla solo.
     */
    object NeedsOnboarding : PanelResult()
    data class Error(val message: String) : PanelResult()
}

/** Resultado de elegir el handle — ver POST /api/mobile/profile/handle. */
sealed class ChooseHandleResult {
    object Ok : ChooseHandleResult()
    data class Error(val message: String) : ChooseHandleResult()
}

/**
 * "Siguiente trofeo" — mismo recomendador que la portada web
 * (lib/recommendations.ts, TrophyRecommendations.tsx): prioriza juego base
 * sobre DLC, progreso alto y mayor probabilidad real de conseguirlo.
 */
data class NextTrophy(
    val gameId: String,
    val gameTitle: String,
    val trophyId: String,
    val trophyName: String,
    val detail: String,
    val rarityPercent: Double?,
    val gameProgress: Int,
    val iconUrl: String?,
    val grade: String?,
)

/** "A un paso del platino" + "Recientes" + "Siguiente trofeo" — ver /api/mobile/panel/highlights, mismo cálculo que la portada web. */
sealed class HighlightsResult {
    data class Ok(
        val nearPlatinum: List<GameProgress>,
        val recent: List<GameProgress>,
        val nextTrophies: List<NextTrophy> = emptyList(),
    ) : HighlightsResult()
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

private fun NextTrophyDto.toNextTrophy() = NextTrophy(
    gameId = gameId,
    gameTitle = gameTitle,
    trophyId = trophyId,
    trophyName = trophyName,
    detail = detail,
    rarityPercent = rarityPercent,
    gameProgress = gameProgress,
    iconUrl = iconUrl,
    grade = grade,
)

class PanelRepository(private val tokenStore: TokenStore? = null, private val panelDao: PanelDao? = null) {
    /**
     * Perfil + stats reales del usuario logueado. Requiere el TokenStore del
     * constructor.
     *
     * `AppRoot` usa este resultado para decidir si deja pasar a
     * `MainScreen` — sin caché aquí, cualquier corte de red al abrir la app
     * (aunque Biblioteca/Ficha de juego ya tuvieran la suya) dejaba a
     * cualquiera atascado en la pantalla de error sin poder ver nada en
     * absoluto. Mismo patrón "red primero, caché de respaldo" que
     * `LibraryRepository`/`GameDetailRepository`.
     */
    suspend fun getPanel(): PanelResult {
        val store = tokenStore ?: return PanelResult.NeedsLogin
        if (store.token == null) return PanelResult.NeedsLogin

        return try {
            val response = ApiClient.panelApi(store).getPanel()
            val profile = UserProfile(
                handle = response.profile.handle,
                name = response.profile.name,
                level = response.profile.level,
                psnId = response.profile.psnId ?: "",
                image = response.profile.image,
            )
            val stats = GlobalStats(
                platinums = response.stats.platinums,
                trophies = response.stats.trophies,
                games = response.stats.games,
                completionRate = response.stats.completionRate,
                gold = response.stats.gold,
                silver = response.stats.silver,
                bronze = response.stats.bronze,
            )
            val racha = RachaGlobal(actual = response.racha.actual, mejor = response.racha.mejor)

            panelDao?.upsert(
                PanelCacheEntity(
                    handle = profile.handle,
                    name = profile.name,
                    level = profile.level,
                    psnId = profile.psnId,
                    image = profile.image,
                    platinums = stats.platinums,
                    trophies = stats.trophies,
                    games = stats.games,
                    completionRate = stats.completionRate,
                    rachaActual = racha.actual,
                    rachaMejor = racha.mejor,
                    gold = stats.gold,
                    silver = stats.silver,
                    bronze = stats.bronze,
                )
            )

            PanelResult.Ok(profile, stats, racha)
        } catch (e: HttpException) {
            when (e.code()) {
                401 -> {
                    store.clear()
                    PanelResult.NeedsLogin
                }
                // Perfil sin handle todavía (alta nueva) — nunca se resuelve
                // solo reintentando, así que no se mira la caché: hace falta
                // la pantalla de onboarding.
                409 -> PanelResult.NeedsOnboarding
                else -> cachedPanel() ?: PanelResult.Error("El servidor respondió con un error (${e.code()}).")
            }
        } catch (e: Exception) {
            cachedPanel() ?: PanelResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    /** Paso 1 del alta — ver POST /api/mobile/profile/handle. */
    suspend fun chooseHandle(handle: String): ChooseHandleResult {
        val store = tokenStore ?: return ChooseHandleResult.Error("Sin sesión.")
        return try {
            ApiClient.settingsApi(store).chooseHandle(ChooseHandleRequest(handle))
            ChooseHandleResult.Ok
        } catch (e: HttpException) {
            ChooseHandleResult.Error(e.paragonErrorMessage() ?: "El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            ChooseHandleResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    private suspend fun cachedPanel(): PanelResult.Ok? {
        val cached = panelDao?.getCached() ?: return null
        return PanelResult.Ok(
            profile = UserProfile(cached.handle, cached.name, cached.level, cached.psnId, cached.image),
            stats = GlobalStats(cached.platinums, cached.trophies, cached.games, cached.completionRate, cached.gold, cached.silver, cached.bronze),
            racha = RachaGlobal(cached.rachaActual, cached.rachaMejor),
            fromCache = true,
        )
    }

    suspend fun getHighlights(): HighlightsResult {
        val store = tokenStore ?: return HighlightsResult.Error("Sin sesión.")

        return try {
            val response = ApiClient.highlightsApi(store).getHighlights()
            HighlightsResult.Ok(
                nearPlatinum = response.nearPlatinum.map { it.toGameProgress() },
                recent = response.recent.map { it.toGameProgress() },
                nextTrophies = response.nextTrophies.map { it.toNextTrophy() },
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

}
