package com.paragon.app.enfoque

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.paragon.app.ComposeMainActivity
import com.paragon.app.R
import com.paragon.app.util.Textos

/**
 * Notificación fija de la sesión de Modo Enfoque (NotificacionEnfoque.kt en
 * :shared): título del juego, trofeos, barra de progreso y cronómetro desde
 * que empezó la sesión. Canal propio de importancia baja (sin sonido ni
 * vibración: está para mirarla, no para avisar). Tocarla vuelve a Enfoque.
 */
object NotificacionEnfoqueAndroid {
    private const val CANAL = "paragon_enfoque"
    private const val ID = 4201

    fun instalar(context: Context) {
        val app = context.applicationContext
        com.paragon.app.data.NotificacionEnfoque.mostrar = { titulo, ganados, total, inicio -> mostrar(app, titulo, ganados, total, inicio) }
        com.paragon.app.data.NotificacionEnfoque.ocultar = { NotificationManagerCompat.from(app).cancel(ID) }
    }

    private fun mostrar(context: Context, titulo: String, ganados: Int, total: Int, inicioMillis: Long) {
        val gestor = NotificationManagerCompat.from(context)
        // Sin permiso de notificaciones (Android 13+) no se pinta nada, sin más.
        if (!gestor.areNotificationsEnabled()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val canal = NotificationChannel(CANAL, Textos.t(R.string.enfoque_canal), NotificationManager.IMPORTANCE_LOW)
            context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(canal)
        }
        val abrir = Intent(Intent.ACTION_VIEW, Uri.parse("paragon://open?path=/enfoque"), context, ComposeMainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pendiente = PendingIntent.getActivity(context, ID, abrir, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val porcentaje = if (total > 0) (ganados * 100 / total) else 0

        val notificacion = NotificationCompat.Builder(context, CANAL)
            .setSmallIcon(R.drawable.ic_stat_paragon)
            .setContentTitle(titulo)
            .setContentText(Textos.t(R.string.enfoque_notificacion, ganados, total, porcentaje))
            .setProgress(100, porcentaje, false)
            .setUsesChronometer(true)
            .setWhen(inicioMillis)
            .setShowWhen(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pendiente)
            .build()
        try {
            gestor.notify(ID, notificacion)
        } catch (e: SecurityException) {
            // Permiso retirado justo ahora: nada que hacer.
        }
    }
}
