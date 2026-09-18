package com.paragon.app.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkerParameters
import androidx.work.WorkManager
import androidx.work.Constraints
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.local.ParagonDatabase
import java.util.concurrent.TimeUnit

/**
 * Refresca las cachés offline (Panel + Biblioteca) en segundo plano, aunque
 * nadie tenga la app abierta — antes solo se refrescaban al entrar en cada
 * pantalla, así que la "última copia guardada" del aviso offline podía ser
 * de la última vez que se abrió la app, no de hace 15 minutos. Ambos
 * repositorios ya escriben en su caché Room como efecto secundario de un
 * `getPanel()`/`getLibrary()` con éxito (ver PanelRepository.kt/
 * LibraryRepository.kt) — este Worker no hace nada nuevo, solo dispara esas
 * mismas llamadas sin que haga falta abrir ninguna pantalla.
 *
 * Sin sesión (nadie ha iniciado sesión todavía, o cerró sesión), las dos
 * llamadas devuelven "sin sesión" al momento y no hacen nada — barato
 * reintentarlo cada 15 min sin más guarda.
 */
class PanelSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val tokenStore = TokenStore(applicationContext)
        if (tokenStore.token == null) return Result.success()

        val db = ParagonDatabase.getDatabase(applicationContext)
        // Los dos son "no lanzan nunca" (capturan su propio error y
        // devuelven un Result.Error con mensaje) — no hay nada que
        // reintentar aquí más allá de la próxima pasada periódica.
        PanelRepository(tokenStore, db.panelDao()).getPanel()
        LibraryRepository(tokenStore, db.libraryDao(), applicationContext).getLibrary()

        return Result.success()
    }

    companion object {
        private const val UNIQUE_NAME = "panel_sync"

        /**
         * 15 minutos es el intervalo mínimo real que deja Android para
         * trabajo periódico (`PeriodicWorkRequest`, documentado en la propia
         * API) — no hay forma de pedir algo más frecuente sin salirse de
         * WorkManager. `KEEP`: si ya hay uno programado (llamadas repetidas
         * en cada arranque de `ComposeMainActivity`), no lo duplica ni
         * reinicia su cuenta atrás.
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<PanelSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(UNIQUE_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}
