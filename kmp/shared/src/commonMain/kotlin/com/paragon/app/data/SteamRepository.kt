package com.paragon.app.data

import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient

/**
 * Logros de Steam que faltan tras vincular (5 oct 2026): al vincular solo se
 * traen los de los 40 juegos más recientes y el resto salía sin logros hasta
 * abrir cada ficha. El servidor los trae por lotes (`completarDetalleSteam`);
 * esto los pide hasta que no quede ninguno.
 */
class SteamRepository(private val tokenStore: TokenStore) {

    /**
     * Pide lotes hasta agotarlos o hasta que un lote no consiga ninguno.
     * `onProgreso(hechos, total)` se llama tras cada lote (para enseñar el avance).
     * Devuelve cuántos juegos se completaron en total.
     */
    suspend fun completarTodo(onProgreso: (hechos: Int, total: Int) -> Unit = { _, _ -> }): Int {
        if (tokenStore.token == null) return 0
        var hechosTotales = 0
        var total = -1
        try {
            while (true) {
                val lote = ApiClient.steamApi(tokenStore).completar()
                if (total < 0) total = lote.hechos + lote.restantes
                hechosTotales += lote.hechos
                if (total > 0) onProgreso(hechosTotales, total)
                // Sin nada pendiente, o un lote sin ningún juego (Steam no deja leerlos): no hay más que hacer.
                if (lote.restantes == 0 || lote.hechos == 0) break
            }
        } catch (e: Exception) {
            // Sin red o límite de uso: se reintenta en la siguiente sincronización.
        }
        return hechosTotales
    }
}
