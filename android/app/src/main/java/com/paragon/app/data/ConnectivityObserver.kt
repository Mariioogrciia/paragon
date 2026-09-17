package com.paragon.app.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged

/**
 * Sin equivalente en el resto de la app todavía — hasta ahora "sin
 * conexión" se detectaba a posteriori (capturando la excepción de
 * Retrofit), nunca de forma proactiva. Hace falta un observador real para
 * saber CUÁNDO ha vuelto la red y disparar `flushPendingNotes()`
 * (GameDetailRepository) sin que el usuario tenga que reabrir la pantalla.
 */
object ConnectivityObserver {
    fun observe(context: Context): Flow<Boolean> = callbackFlow {
        val connectivityManager = context.applicationContext
            .getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                trySend(true)
            }

            override fun onLost(network: Network) {
                trySend(isCurrentlyOnline(connectivityManager))
            }

            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                trySend(capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET))
            }
        }

        trySend(isCurrentlyOnline(connectivityManager))
        connectivityManager.registerNetworkCallback(NetworkRequest.Builder().build(), callback)
        awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
    }.distinctUntilChanged()

    private fun isCurrentlyOnline(connectivityManager: ConnectivityManager): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
