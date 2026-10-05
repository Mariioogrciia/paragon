package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class ParagonScorePlataformaDto(val platform: String, val puntos: Int, val trofeos: Int)
@Serializable
data class ParagonScoreDto(val total: Int, val porPlataforma: List<ParagonScorePlataformaDto>)

@Serializable
data class TrophyDnaEjeDto(val key: String, val label: String, val valor: Int, val trofeos: Int)
// `arquetipo` es null si todavía no hay ningún trofeo con género conocido — ver calcularTrophyDna en trophyDna.ts.
@Serializable
data class TrophyDnaDto(val ejes: List<TrophyDnaEjeDto>, val arquetipo: String?)

// Distinto de `arquetipo` (ese es de GÉNERO) — mide CÓMO se cazan trofeos,
// no a qué se juega. `null` con menos de 3 juegos con progreso real o si
// no encaja claramente en ninguna categoría — ver calcularEstiloDeCaza en
// trophyDna.ts.
@Serializable
data class EstiloDeCazaDto(val nombre: String, val descripcion: String)

@Serializable
data class RachasDto(val actual: Int, val mejor: Int, val diasActivos: Int)

@Serializable
data class MejorMesDto(val mes: String, val total: Int)
@Serializable
data class HistoricoDto(val conFecha: Int, val esteAnio: Int, val mejorMes: MejorMesDto?)

@Serializable
data class FinancieroDto(
    val totalGastado: Double,
    val totalHoras: Double,
    val costeHoraMedio: Double?,
    val juegosConDatos: Int,
)

// Negativo = más lento que la estimación de HowLongToBeat, positivo = más rápido.
@Serializable
data class EficienciaDto(val ritmoMedioPct: Int?, val juegosConDatos: Int)

@Serializable
data class BacklogDto(
    val juegosContados: Int,
    val horasHistoriaRestantes: Double,
    val horasPlatinoRestantes: Double,
)

@Serializable
data class PrimerTrofeoDto(
    val gameId: String,
    val tituloJuego: String,
    val nombre: String,
    val iconUrl: String?,
    val grade: String?,
    val fecha: String,
)
@Serializable
data class PrimerPlatinoDto(val gameId: String, val titulo: String, val iconUrl: String?, val fecha: String)
@Serializable
data class TrofeoMasRaroDto(val gameId: String, val tituloJuego: String, val nombre: String, val iconUrl: String?, val rarityPercent: Double, val fecha: String?)
@Serializable
data class PlatinoAnejoDto(val gameId: String, val titulo: String, val iconUrl: String?, val dias: Int, val desde: String, val hasta: String)
@Serializable
data class RachaMasLargaDto(val dias: Int, val desde: String, val hasta: String)
@Serializable
data class PlatinoNumeradoDto(val numero: Int, val gameId: String, val titulo: String, val iconUrl: String?, val fecha: String)

@Serializable
data class HitosDto(
    val primerTrofeo: PrimerTrofeoDto?,
    val primerPlatino: PrimerPlatinoDto?,
    val trofeoMasRaro: TrofeoMasRaroDto?,
    val platinoAnejo: PlatinoAnejoDto?,
    val rachaMasLarga: RachaMasLargaDto?,
    val platinosHitos: List<PlatinoNumeradoDto>,
)

@Serializable
data class StatsResponse(
    val paragonScore: ParagonScoreDto,
    val trophyDna: TrophyDnaDto,
    val estiloDeCaza: EstiloDeCazaDto? = null,
    val rachas: RachasDto,
    val historico: HistoricoDto,
    val financiero: FinancieroDto,
    val eficiencia: EficienciaDto,
    val backlog: BacklogDto,
    // Ya son horas, no minutos — ver la nota en route.ts. NO dividir entre 60 otra vez.
    val horasTotales: Int,
    val hitos: HitosDto,
)

/** Desglose de un mes — /api/mobile/stats/month, como /ritmo en la web. */
@Serializable
data class DiaMesDto(val dia: String, val total: Int)

@Serializable
data class JuegoMesDto(val gameId: String, val juego: String, val iconUrl: String? = null, val total: Int)

@Serializable
data class TrofeoMesDto(
    val gameId: String,
    val juego: String,
    val trophyId: String,
    val nombre: String,
    val detalle: String = "",
    val grade: String? = null,
    val iconUrl: String? = null,
    val earnedAt: String,
    val rarityPercent: Double? = null,
)

@Serializable
data class MesResponse(
    val mes: String,
    val total: Int = 0,
    val porDia: List<DiaMesDto> = emptyList(),
    val porJuego: List<JuegoMesDto> = emptyList(),
    val trofeos: List<TrofeoMesDto> = emptyList(),
)

class StatsApi internal constructor(private val c: ClienteParagon) {
    /** `mes`: "YYYY-MM"; null = el actual. */
    suspend fun getMes(mes: String?): MesResponse =
        c.http.get("api/mobile/stats/month") { if (mes != null) parameter("mes", mes) }.body()

    /** Versión curada para el móvil de /api/mobile/stats — ver route.ts y API-CONTRACT.md. */
    suspend fun getStats(): StatsResponse =
        c.http.get("api/mobile/stats").body()
}
