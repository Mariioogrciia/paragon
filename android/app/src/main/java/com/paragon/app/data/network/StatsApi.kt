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

data class PrimerTrofeoDto(
    val gameId: String,
    val tituloJuego: String,
    val nombre: String,
    val iconUrl: String?,
    val grade: String?,
    val fecha: String,
)
data class PrimerPlatinoDto(val gameId: String, val titulo: String, val iconUrl: String?, val fecha: String)
data class TrofeoMasRaroDto(val gameId: String, val tituloJuego: String, val nombre: String, val iconUrl: String?, val rarityPercent: Double, val fecha: String?)
data class PlatinoAnejoDto(val gameId: String, val titulo: String, val iconUrl: String?, val dias: Int, val desde: String, val hasta: String)
data class RachaMasLargaDto(val dias: Int, val desde: String, val hasta: String)

data class HitosDto(
    val primerTrofeo: PrimerTrofeoDto?,
    val primerPlatino: PrimerPlatinoDto?,
    val trofeoMasRaro: TrofeoMasRaroDto?,
    val platinoAnejo: PlatinoAnejoDto?,
    val rachaMasLarga: RachaMasLargaDto?,
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
    val hitos: HitosDto,
)

interface StatsApi {
    /** Versión curada para el móvil de /api/mobile/stats — ver route.ts y API-CONTRACT.md. */
    @GET("api/mobile/stats")
    suspend fun getStats(): StatsResponse
}
