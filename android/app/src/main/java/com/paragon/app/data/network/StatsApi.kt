package com.paragon.app.data.network

import retrofit2.http.GET

data class ParagonScorePlataformaDto(val platform: String, val puntos: Int, val trofeos: Int)
data class ParagonScoreDto(val total: Int, val porPlataforma: List<ParagonScorePlataformaDto>)

data class TrophyDnaEjeDto(val key: String, val label: String, val valor: Int, val trofeos: Int)
// `arquetipo` es null si todavía no hay ningún trofeo con género conocido — ver calcularTrophyDna en trophyDna.ts.
data class TrophyDnaDto(val ejes: List<TrophyDnaEjeDto>, val arquetipo: String?)

data class RachasDto(val actual: Int, val mejor: Int, val diasActivos: Int)

data class MejorMesDto(val mes: String, val total: Int)
data class HistoricoDto(val conFecha: Int, val esteAnio: Int, val mejorMes: MejorMesDto?)

data class FinancieroDto(
    val totalGastado: Double,
    val totalHoras: Double,
    val costeHoraMedio: Double?,
    val juegosConDatos: Int,
)

// Negativo = más lento que la estimación de HowLongToBeat, positivo = más rápido.
data class EficienciaDto(val ritmoMedioPct: Int?, val juegosConDatos: Int)

data class BacklogDto(
    val juegosContados: Int,
    val horasHistoriaRestantes: Double,
    val horasPlatinoRestantes: Double,
)

data class StatsResponse(
    val paragonScore: ParagonScoreDto,
    val trophyDna: TrophyDnaDto,
    val rachas: RachasDto,
    val historico: HistoricoDto,
    val financiero: FinancieroDto,
    val eficiencia: EficienciaDto,
    val backlog: BacklogDto,
    // Ya son horas, no minutos — ver la nota en route.ts. NO dividir entre 60 otra vez.
    val horasTotales: Int,
)

interface StatsApi {
    /** Versión curada para el móvil de /api/mobile/stats — ver route.ts y API-CONTRACT.md. */
    @GET("api/mobile/stats")
    suspend fun getStats(): StatsResponse
}
