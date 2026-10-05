package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.data.theme.ThemeSettings

/**
 * Apariencia compartida con la web (4 oct 2026): al abrir la app se trae la
 * de la cuenta (manda sobre el teléfono, como en la web al cargar cualquier
 * página) y cada cambio en Ajustes → Apariencia se guarda en la cuenta.
 * Sin red, el cambio se queda en el teléfono y se vuelve a mandar en el
 * siguiente cambio; nunca se bloquea la interfaz por esto.
 */
class AparienciaRepository(private val tokenStore: TokenStore, private val themeSettings: ThemeSettings) {

    suspend fun sincronizarDesdeCuenta() {
        if (tokenStore.token == null) return
        try {
            val dto = ApiClient.aparienciaApi(tokenStore).obtener()
            // Cuenta sin nada guardado todavía (nunca tocó la apariencia en la
            // web): se sube la del teléfono en vez de pisarla con la de serie.
            if (!dto.guardada) {
                guardar()
                return
            }
            themeSettings.aplicarDeCuenta(dto)
        } catch (e: Exception) {
            // Sin red: se queda la del teléfono.
        }
    }

    /** Manda la apariencia actual del teléfono a la cuenta y aplica lo que el servidor acepte (p. ej. quita un estilo sin nivel). */
    suspend fun guardar() {
        if (tokenStore.token == null) return
        try {
            val request = themeSettings.requestParaGuardar()
            val dto = ApiClient.aparienciaApi(tokenStore).guardar(request)
            themeSettings.aplicarDeCuenta(dto)
        } catch (e: Exception) {
            // Sin red: se reintenta con el siguiente cambio o al volver a abrir la app.
        }
    }
}
