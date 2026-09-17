package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.network.StatsResponse
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

data class HitosStats(
    val primerTrofeo: PrimerTrofeoStats?,
    val primerPlatino: PrimerPlatinoStats?,
    val trofeoMasRaro: TrofeoMasRaroStats?,
    val platinoAnejo: PlatinoAnejoStats?,
    val rachaMasLarga: RachaMasLargaStats?,
)

data class ParagonStats(
    val paragonScore: ParagonScoreStats,
    val trophyDna: TrophyDnaStats,
    val rachas: RachasStats,
    val historico: HistoricoStats,
    val financiero: FinancieroStats,
    val eficiencia: EficienciaStats,
    val backlog: BacklogStats,
    val horasTotales: Int,
    val hitos: HitosStats,
)

sealed class StatsResult {
    data class Ok(val stats: ParagonStats) : StatsResult()
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
    ),
)

class StatsRepository(private val tokenStore: TokenStore? = null) {
    suspend fun getStats(): StatsResult {
        val store = tokenStore ?: return StatsResult.Error("Sin sesión.")

        return try {
            StatsResult.Ok(ApiClient.statsApi(store).getStats().toParagonStats())
        } catch (e: HttpException) {
            StatsResult.Error("El servidor respondió con un error (${e.code()}).")
        } catch (e: Exception) {
            StatsResult.Error(e.message ?: "No se pudo conectar con Paragon.")
        }
    }
}
