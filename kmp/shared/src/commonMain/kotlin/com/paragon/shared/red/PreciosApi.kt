package com.paragon.shared.red

import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.http.encodeURLPathPart
import kotlinx.serialization.Serializable

/** Precio de Steam España, en euros (el de las alertas). */
@Serializable
data class PrecioSteamDto(val final: Double, val inicial: Double, val descuento: Int)

/** Una tienda de CheapShark: tiendas de EE. UU., en dólares. */
@Serializable
data class OfertaTiendaDto(val tienda: String, val precio: Double, val precioOriginal: Double = 0.0, val ahorro: Int = 0, val url: String)

@Serializable
data class PreciosJuegoDto(
    val steamAppId: String,
    val precio: PrecioSteamDto? = null,
    val ofertas: List<OfertaTiendaDto> = emptyList(),
    val minimoHistoricoUsd: Double? = null,
    /** Precio objetivo de tu alerta, si tienes. */
    val alerta: Double? = null,
)

@Serializable
data class PreciosJuegoResponse(val precios: PreciosJuegoDto? = null)

@Serializable
data class AlertaPrecioDto(
    val steamAppId: String,
    val gameId: String,
    val titulo: String,
    val precioObjetivo: Double,
    val precio: PrecioSteamDto? = null,
    val avisadoAt: String? = null,
)

@Serializable
data class AlertasPrecioResponse(val alertas: List<AlertaPrecioDto> = emptyList())

@Serializable
data class NuevaAlertaPrecio(val steamAppId: String, val gameId: String, val titulo: String, val precioObjetivo: Double)

@Serializable
data class DificultadDto(val nivel: Int, val etiqueta: String, val color: String)

@Serializable
data class PlatinoOfertaDto(
    val steamAppId: String,
    val titulo: String,
    val caratula: String,
    val precio: PrecioSteamDto? = null,
    val precioUsd: Double,
    val ahorro: Int = 0,
    val logros: Int,
    val logroMasRaro: Double,
    val dificultad: DificultadDto,
    val horas: Double? = null,
    /** Ficha en Paragon si alguien ya lo tiene; si no, null (se abre Steam). */
    val gameId: String? = null,
    val url: String,
)

@Serializable
data class PlatinosOfertaResponse(val ofertas: List<PlatinoOfertaDto> = emptyList())

/**
 * Precios y "Platinos de oferta" (8 oct 2026). Ver
 * src/app/api/mobile/games/[gameId]/precios, price-alerts y platinos-oferta.
 */
class PreciosApi internal constructor(private val c: ClienteParagon) {
    /** null si el juego no tiene versión de PC. */
    suspend fun getPrecios(gameId: String): PreciosJuegoResponse =
        c.http.get("api/mobile/games/${gameId.encodeURLPathPart()}/precios").body()

    suspend fun getAlertas(): AlertasPrecioResponse =
        c.http.get("api/mobile/price-alerts").body()

    suspend fun guardarAlerta(alerta: NuevaAlertaPrecio) {
        c.http.post("api/mobile/price-alerts") { json(alerta) }
    }

    suspend fun borrarAlerta(steamAppId: String) {
        c.http.delete("api/mobile/price-alerts") { parameter("steamAppId", steamAppId) }
    }

    suspend fun getPlatinosOferta(): PlatinosOfertaResponse =
        c.http.get("api/mobile/platinos-oferta").body()
}
