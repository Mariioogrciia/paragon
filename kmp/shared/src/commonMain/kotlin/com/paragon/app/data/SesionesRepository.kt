package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.HttpException
import com.paragon.shared.red.NuevaSesionRequest
import com.paragon.shared.red.SesionDto
import com.paragon.shared.red.SesionesResponse
import com.paragon.shared.red.TrofeoPendienteDto
import com.paragon.shared.red.paragonErrorMessage

/** Ok o el motivo del fallo, ya traducido (el servidor manda sus errores en el idioma del teléfono). */
sealed class SesionResultado<out T> {
    data class Ok<T>(val valor: T) : SesionResultado<T>()
    data class Error(val mensaje: String) : SesionResultado<Nothing>()
}

/** Sesiones de trofeos online — ver SesionesApi y src/lib/sesiones.ts. */
class SesionesRepository(private val tokenStore: TokenStore? = null) {
    private suspend fun <T> pedir(bloque: suspend (TokenStore) -> T): SesionResultado<T> {
        val store = tokenStore ?: return SesionResultado.Error(Textos.t(T.error_sin_sesion))
        return try {
            SesionResultado.Ok(bloque(store))
        } catch (e: HttpException) {
            SesionResultado.Error(e.paragonErrorMessage() ?: Textos.t(T.error_conexion))
        } catch (e: Exception) {
            SesionResultado.Error(Textos.t(T.error_conexion))
        }
    }

    suspend fun listar(): SesionResultado<SesionesResponse> = pedir { ApiClient.sesionesApi(it).listar() }

    suspend fun ficha(id: String): SesionResultado<SesionDto> = pedir { ApiClient.sesionesApi(it).ficha(id) }

    suspend fun unirse(id: String): SesionResultado<SesionDto> = pedir { ApiClient.sesionesApi(it).accion(id, "unirse") }

    suspend fun salir(id: String): SesionResultado<SesionDto> = pedir { ApiClient.sesionesApi(it).accion(id, "salir") }

    suspend fun cancelar(id: String): SesionResultado<Unit> = pedir { ApiClient.sesionesApi(it).cancelar(id) }

    suspend fun crear(request: NuevaSesionRequest): SesionResultado<String> = pedir { ApiClient.sesionesApi(it).crear(request).id }

    /** Vacía si falla: entonces se escribe el trofeo a mano, que siempre funciona. */
    suspend fun trofeosPendientes(gameId: String): List<TrofeoPendienteDto> =
        (pedir { ApiClient.sesionesApi(it).trofeosPendientes(gameId).trofeos } as? SesionResultado.Ok)?.valor ?: emptyList()
}
