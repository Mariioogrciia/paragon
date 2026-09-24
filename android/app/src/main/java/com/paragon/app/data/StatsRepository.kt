package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.SimpleCacheDao
import com.paragon.app.data.local.SimpleCacheEntity
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.StatsResponse
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import retrofit2.HttpException

/**
 * Estadísticas (StatsScreen) — versión curada para móvil de GET
 * /api/mobile/stats, ver API-CONTRACT.md. Se reexpone el DTO casi tal cual
 * (son ya números listos para pintar, sin lógica de negocio de por medio) en
 * vez de mapear campo a campo a un modelo aparte.
 */
data class ParagonScoreStats(val total: Int, val porPlataforma: List<ParagonScorePlataformaStats>)
data class ParagonScorePlataformaStats(val platform: String, val puntos: Int, val trofeos: Int)

data class TrophyDnaEje(val key: String, val label: String, val valor: Int, val trofeos: Int)
data class TrophyDnaStats(val ejes: List<TrophyDnaEje>, val arquetipo: String?)

/** Distinto de `arquetipo` (ese es de GÉNERO) — mide CÓMO se cazan trofeos. */
data class EstiloDeCazaStats(val nombre: String, val descripcion: String)

data class RachasStats(val actual: Int, val mejor: Int, val diasActivos: Int)

data class MejorMesStats(val mes: String, val total: Int)
data class HistoricoStats(val conFecha: Int, val esteAnio: Int, val mejorMes: MejorMesStats?)

data class FinancieroStats(val totalGastado: Double, val totalHoras: Double, val costeHoraMedio: Double?, val juegosConDatos: Int)

data class EficienciaStats(val ritmoMedioPct: Int?, val juegosConDatos: Int)

data class BacklogStats(val juegosContados: Int, val horasHistoriaRestantes: Double, val horasPlatinoRestantes: Double)

data class PrimerTrofeoStats(val gameId: String, val tituloJuego: String, val nombre: String, val iconUrl: String?, val grade: String?, val fecha: String)
data class PrimerPlatinoStats(val gameId: String, val titulo: String, val iconUrl: String?, val fecha: String)
data class TrofeoMasRaroStats(val gameId: String, val tituloJuego: String, val nombre: String, val iconUrl: String?, val rarityPercent: Double, val fecha: String?)
data class PlatinoAnejoStats(val gameId: String, val titulo: String, val iconUrl: String?, val dias: Int, val desde: String, val hasta: String)
data class RachaMasLargaStats(val dias: Int, val desde: String, val hasta: String)
data class PlatinoNumeradoStats(val numero: Int, val gameId: String, val titulo: String, val iconUrl: String?, val fecha: String)

data class HitosStats(
    val primerTrofeo: PrimerTrofeoStats?,
    val primerPlatino: PrimerPlatinoStats?,
    val trofeoMasRaro: TrofeoMasRaroStats?,
    val platinoAnejo: PlatinoAnejoStats?,
    val rachaMasLarga: RachaMasLargaStats?,
    val platinosHitos: List<PlatinoNumeradoStats>,
)

data class ParagonStats(
    val paragonScore: ParagonScoreStats,
    val trophyDna: TrophyDnaStats,
    val estiloDeCaza: EstiloDeCazaStats?,
    val rachas: RachasStats,
    val historico: HistoricoStats,
    val financiero: FinancieroStats,
    val eficiencia: EficienciaStats,
    val backlog: BacklogStats,
    val horasTotales: Int,
    val hitos: HitosStats,
)

sealed class StatsResult {
    data class Ok(val stats: ParagonStats, val fromCache: Boolean = false) : StatsResult()
    data class Error(val message: String) : StatsResult()
}

private fun StatsResponse.toParagonStats() = ParagonStats(
    paragonScore = ParagonScoreStats(
        total = paragonScore.total,
        porPlataforma = paragonScore.porPlataforma.map { ParagonScorePlataformaStats(it.platform, it.puntos, it.trofeos) },
    ),
    trophyDna = TrophyDnaStats(
        ejes = trophyDna.ejes.map { TrophyDnaEje(it.key, it.label, it.valor, it.trofeos) },
        arquetipo = trophyDna.arquetipo,
    ),
    estiloDeCaza = estiloDeCaza?.let { EstiloDeCazaStats(it.nombre, it.descripcion) },
    rachas = RachasStats(rachas.actual, rachas.mejor, rachas.diasActivos),
    historico = HistoricoStats(
        conFecha = historico.conFecha,
        esteAnio = historico.esteAnio,
        mejorMes = historico.mejorMes?.let { MejorMesStats(it.mes, it.total) },
    ),
    financiero = FinancieroStats(financiero.totalGastado, financiero.totalHoras, financiero.costeHoraMedio, financiero.juegosConDatos),
    eficiencia = EficienciaStats(eficiencia.ritmoMedioPct, eficiencia.juegosConDatos),
    backlog = BacklogStats(backlog.juegosContados, backlog.horasHistoriaRestantes, backlog.horasPlatinoRestantes),
    horasTotales = horasTotales,
    hitos = HitosStats(
        primerTrofeo = hitos.primerTrofeo?.let { PrimerTrofeoStats(it.gameId, it.tituloJuego, it.nombre, it.iconUrl, it.grade, it.fecha) },
        primerPlatino = hitos.primerPlatino?.let { PrimerPlatinoStats(it.gameId, it.titulo, it.iconUrl, it.fecha) },
        trofeoMasRaro = hitos.trofeoMasRaro?.let { TrofeoMasRaroStats(it.gameId, it.tituloJuego, it.nombre, it.iconUrl, it.rarityPercent, it.fecha) },
        platinoAnejo = hitos.platinoAnejo?.let { PlatinoAnejoStats(it.gameId, it.titulo, it.iconUrl, it.dias, it.desde, it.hasta) },
        rachaMasLarga = hitos.rachaMasLarga?.let { RachaMasLargaStats(it.dias, it.desde, it.hasta) },
        platinosHitos = hitos.platinosHitos.map { PlatinoNumeradoStats(it.numero, it.gameId, it.titulo, it.iconUrl, it.fecha) },
    ),
)

private const val CACHE_KEY = "stats_data"
private val statsMoshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
private val paragonStatsAdapter = statsMoshi.adapter(ParagonStats::class.java)

class StatsRepository(private val tokenStore: TokenStore? = null, private val cacheDao: SimpleCacheDao? = null) {
    /**
     * Red primero, caché de respaldo (mismo patrón que Library/Panel/
     * GameDetail/Feed/Social/Ligas) — encontrado en auditoría: Estadísticas
     * es una de las 5 pestañas principales pero se quedaba sin ningún
     * respaldo local, a diferencia de las demás.
     */
    suspend fun getStats(): StatsResult {
        val store = tokenStore ?: return StatsResult.Error("Sin sesión.")

        return try {
            val stats = ApiClient.statsApi(store).getStats().toParagonStats()
            cacheDao?.put(SimpleCacheEntity(CACHE_KEY, paragonStatsAdapter.toJson(stats)))
            StatsResult.Ok(stats)
        } catch (e: HttpException) {
            cachedStats() ?: StatsResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            cachedStats() ?: StatsResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }

    private suspend fun cachedStats(): StatsResult.Ok? {
        val json = cacheDao?.get(CACHE_KEY) ?: return null
        val stats = try { paragonStatsAdapter.fromJson(json) } catch (e: Exception) { null } ?: return null
        return StatsResult.Ok(stats, fromCache = true)
    }
}
